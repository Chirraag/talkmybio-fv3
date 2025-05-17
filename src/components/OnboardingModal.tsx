import React, { useEffect, useState, useRef } from "react";
import { doc, updateDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { RetellWebClient } from "retell-client-js-sdk";
import {
  Video,
  MessageSquare,
  X,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import { VideoRecorder } from "../lib/recording";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROCESSING_MESSAGES = [
  "Analyzing your conversation...",
  "Generating your first story...",
  "Preparing your profile...",
  "Almost there...",
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [showCallModal, setShowCallModal] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMicPermissionGranted, setIsMicPermissionGranted] = useState(false);
  const [isCameraPermissionGranted, setCameraPermissionGranted] =
    useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAgentTalking, setIsAgentTalking] = useState(false);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState(
    PROCESSING_MESSAGES[0],
  );

  const retellWebClientRef = useRef<RetellWebClient | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);
  const processingIntervalRef = useRef<NodeJS.Timeout>();
  const videoRecorderRef = useRef<VideoRecorder | null>(null);

  useEffect(() => {
    if (showCallModal) requestPermissions();
  }, [showCallModal]);

  useEffect(() => {
    if (isProcessing) {
      let idx = 0;
      const interval = setInterval(() => {
        setProcessingMessage(PROCESSING_MESSAGES[idx]);
        idx = (idx + 1) % PROCESSING_MESSAGES.length;
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isProcessing]);

  const checkProcessingStatus = async () => {
    if (!currentStoryId || !currentSessionId) return;
    try {
      const storySnap = await getDoc(doc(db, "stories", currentStoryId));
      if (!storySnap.exists()) return;
      const story = storySnap.data();
      const session = story.sessions?.[currentSessionId];

      if (session?.updated) {
        clearInterval(processingIntervalRef.current);
        setIsProcessing(false);
        setProcessingProgress(100);

        if (auth.currentUser) {
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            isOnboarded: true,
            onboardingStoryId: currentStoryId,
            updatedAt: serverTimestamp(),
          });
        }
        onClose();
      } else setProcessingProgress((p) => Math.min(p + 5, 90));
    } catch (err) {
      console.error("Error checking processing status:", err);
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setIsMicPermissionGranted(true);
      setCameraPermissionGranted(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
      streamRef.current = stream;
    } catch (err: any) {
      console.error("Error getting permissions:", err);
      toast.error(
        err.name === "NotAllowedError"
          ? "Please grant camera and microphone permissions to continue"
          : "Error accessing camera or microphone",
      );
      setIsMicPermissionGranted(false);
      setCameraPermissionGranted(false);
    }
  };

  useEffect(() => {
    if (!retellWebClientRef.current) {
      retellWebClientRef.current = new RetellWebClient({
        debug: true,
        audioDeviceConfig: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    }
    const client = retellWebClientRef.current;

    const handleCallStarted = async () => {
      clearTimeout(timeoutRef.current);
      setIsCallActive(true);
      setIsLoading(false);
      toast.success("Call started successfully");

      if (streamRef.current && currentStoryId && currentSessionId) {
        try {
          videoRecorderRef.current = new VideoRecorder(
            currentStoryId,
            currentSessionId,
            async (url, isFinal) => {
              const storyRef = doc(db, "stories", currentStoryId);
              await updateDoc(storyRef, {
                [`sessions.${currentSessionId}.${
                  isFinal ? "videoUrl" : "videoChunkUrl"
                }`]: url,
                [`sessions.${currentSessionId}.${
                  isFinal ? "videoComplete" : "lastUpdated"
                }`]: isFinal ? true : serverTimestamp(),
              });
            },
          );
          await videoRecorderRef.current.start(streamRef.current);
        } catch (err) {
          console.error("Error starting video recording:", err);
          toast.error("Failed to start video recording");
        }
      }
    };

    const handleCallEnded = async () => {
      setIsCallActive(false);
      setIsAgentTalking(false);
      setIsProcessing(true);
      setProcessingProgress(0);

      try {
        if (videoRecorderRef.current) await videoRecorderRef.current.stop();
        processingIntervalRef.current = setInterval(checkProcessingStatus, 2000);
      } catch (err) {
        console.error("Error finalizing call:", err);
        toast.error("Error processing call recording");
      } finally {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    };

    const handleAgentStartTalking = () => setIsAgentTalking(true);
    const handleAgentStopTalking = () => setIsAgentTalking(false);
    const handleError = (err: Error) => {
      console.error("Call error:", err);
      toast.error(`Call error: ${err.message}`);
      clearTimeout(timeoutRef.current);
      setIsLoading(false);
      setIsCallActive(false);
    };

    client.on("call_started", handleCallStarted);
    client.on("call_ended", handleCallEnded);
    client.on("agent_start_talking", handleAgentStartTalking);
    client.on("agent_stop_talking", handleAgentStopTalking);
    client.on("error", handleError);

    return () => {
      client.off("call_started", handleCallStarted);
      client.off("call_ended", handleCallEnded);
      client.off("agent_start_talking", handleAgentStartTalking);
      client.off("agent_stop_talking", handleAgentStopTalking);
      client.off("error", handleError);
      clearInterval(processingIntervalRef.current);
    };
  }, [onClose, currentStoryId, currentSessionId]);

  const startCall = async () => {
    if (!auth.currentUser || !retellWebClientRef.current) {
      toast.error("Cannot start call at this time");
      return;
    }

    setIsLoading(true);
    startTimeRef.current = Date.now();
    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      toast.error("Call setup timed out. Please try again.");
    }, 30000);

    try {
      const backendUrl =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
      const res = await fetch(`${backendUrl}/create-web-call`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          agentId: "agent_672107b610df5ac720e395b13b",
          isOnboarding: true,
        }),
      });

      if (!res.ok) throw new Error("Failed to create web call");
      const data = await res.json();

      setCurrentStoryId(data.storyId);
      setCurrentSessionId(data.sessionId);

      await retellWebClientRef.current.startCall({
        accessToken: data.accessToken,
      });
    } catch (err: any) {
      console.error("Error starting call:", err);
      clearTimeout(timeoutRef.current);
      setIsLoading(false);
      toast.error(err.message || "Failed to start call");
    }
  };

  /* ------------------ UI ------------------ */
  if (!isOpen) return null;

  if (isProcessing)
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 rounded-full border-4 border-orange-200"></div>
              <div
                className="absolute inset-0 rounded-full border-4 border-orange-500 animate-spin"
                style={{
                  clipPath: `polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${processingProgress}% 0%)`,
                }}
              ></div>
              <Sparkles className="w-8 h-8 text-orange-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Processing Your Story
            </h3>
            <p className="text-gray-600 animate-pulse">{processingMessage}</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500">Please don't close this window</p>
        </div>
      </div>
    );

  if (!showCallModal)
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-lg w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Welcome to StoryMind
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <p className="text-gray-600 mb-6">
            Let's start with a quick conversation to help us understand you
            better.
          </p>

          <ul className="space-y-3 mb-8">
            <li className="flex items-center text-gray-600">
              <span className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                <MessageSquare className="w-4 h-4 text-orange-600" />
              </span>
              Interactive conversation with AI
            </li>
            <li className="flex items-center text-gray-600">
              <span className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                <Video className="w-4 h-4 text-orange-600" />
              </span>
              Video and audio recording
            </li>
          </ul>

          <button
            onClick={() => setShowCallModal(true)}
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
          >
            <Video className="w-5 h-5" />
            <span>Start Onboarding</span>
          </button>
        </div>
      </div>
    );

  /* ------------------ CALL UI (responsive) ------------------ */
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2">
      <div className="bg-white rounded-xl w-full h-[80vh] max-w-6xl flex flex-col md:flex-row overflow-hidden">
        {/* Video section */}
        <div className="flex w-full h-[40dvh] md:h-full bg-gray-900 relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-4">
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full flex items-center space-x-4 text-white">
              {isMicPermissionGranted ? (
                <Mic className="w-5 h-5 text-green-400" />
              ) : (
                <MicOff className="w-5 h-5 text-red-400" />
              )}
              {isCameraPermissionGranted ? (
                <Camera className="w-5 h-5 text-green-400" />
              ) : (
                <CameraOff className="w-5 h-5 text-red-400" />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 md:border-l border-gray-200 flex flex-col">
          <div className="p-6 flex-1">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {isCallActive ? "Ongoing Call" : "Start Call"}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isLoading}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {isCallActive ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-orange-500 animate-pulse">
                    {isAgentTalking ? "Agent is speaking..." : "Listening..."}
                  </p>
                </div>

                <button
                  onClick={() => retellWebClientRef.current?.stopCall()}
                  className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                >
                  <Video className="w-5 h-5" />
                  <span>End Call</span>
                </button>
              </div>
            ) : (
              <button
                onClick={startCall}
                disabled={
                  !isMicPermissionGranted ||
                  !isCameraPermissionGranted ||
                  isLoading
                }
                className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <Video className="w-5 h-5" />
                <span>{isLoading ? "Connecting..." : "Start Call"}</span>
              </button>
            )}

            {(!isMicPermissionGranted || !isCameraPermissionGranted) && (
              <p className="text-sm text-red-500 mt-4 text-center">
                Please grant camera and microphone permissions to continue
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
