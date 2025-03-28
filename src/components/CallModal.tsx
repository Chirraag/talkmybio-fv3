import React, { useEffect, useState, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Category } from "../types/category";
import { Phone, X, Mic, MicOff, Video, VideoOff, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { RetellWebClient } from "retell-client-js-sdk";
import { VideoRecorder } from "../lib/recording";

interface CallModalProps {
  isOpen: boolean;
  onClose: (isProcessingComplete?: boolean) => void;
  category: Category;
  question: string;
  existingStoryId?: string;
}

export const CallModal: React.FC<CallModalProps> = ({
  isOpen,
  onClose,
  category,
  question,
  existingStoryId,
}) => {
  const [user] = useAuthState(auth);
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

  const retellWebClientRef = useRef<RetellWebClient | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);
  const processingIntervalRef = useRef<NodeJS.Timeout>();
  const videoRecorderRef = useRef<VideoRecorder | null>(null);

  // Handle tab/window close
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isCallActive && retellWebClientRef.current) {
        // End the call
        try {
          retellWebClientRef.current.stopCall();
          if (videoRecorderRef.current) {
            videoRecorderRef.current.stop();
          }
        } catch (error) {
          console.error("Error ending call on page unload:", error);
        }

        // Show confirmation dialog
        event.preventDefault();
        event.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isCallActive]);

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setIsCallActive(false);
      setIsMicPermissionGranted(false);
      setCameraPermissionGranted(false);
      setIsLoading(false);
      setIsAgentTalking(false);
      setCurrentStoryId(existingStoryId || null);
      setCurrentSessionId(null);
      setIsProcessing(false);
      setProcessingProgress(0);

      if (retellWebClientRef.current) {
        try {
          retellWebClientRef.current.stopCall();
        } catch (error) {
          console.error("Error stopping previous call:", error);
        }
        retellWebClientRef.current = null;
      }

      requestPermissions();
    }
  }, [isOpen, existingStoryId]);

  const checkProcessingStatus = async () => {
    if (!currentStoryId || !currentSessionId) return;

    try {
      const storyDoc = await getDoc(doc(db, "stories", currentStoryId));
      if (!storyDoc.exists()) return;

      const story = storyDoc.data();
      const session = story.sessions?.[currentSessionId];

      if (session?.updated) {
        clearInterval(processingIntervalRef.current);
        setIsProcessing(false);
        setProcessingProgress(100);
        onClose(true);
      } else {
        setProcessingProgress((prev) => Math.min(prev + 5, 90));
      }
    } catch (error) {
      console.error("Error checking processing status:", error);
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

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (error: any) {
      console.error("Error getting permissions:", error);
      if (error.name === "NotAllowedError") {
        toast.error(
          "Please grant camera and microphone permissions to continue",
        );
      } else {
        toast.error("Error accessing camera or microphone");
      }
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
      console.log("Call started");
      clearTimeout(timeoutRef.current);
      setIsCallActive(true);
      setIsLoading(false);
      toast.success("Call started successfully");

      // Start video recording
      if (streamRef.current && currentStoryId && currentSessionId) {
        try {
          videoRecorderRef.current = new VideoRecorder(
            currentStoryId,
            currentSessionId,
            async (url, isFinal) => {
              // Update the session with video URL
              const storyRef = doc(db, "stories", currentStoryId);
              if (isFinal) {
                await updateDoc(storyRef, {
                  [`sessions.${currentSessionId}.videoUrl`]: url,
                  [`sessions.${currentSessionId}.videoComplete`]: true,
                  [`sessions.${currentSessionId}.lastUpdated`]:
                    serverTimestamp(),
                });
              } else {
                await updateDoc(storyRef, {
                  [`sessions.${currentSessionId}.videoChunkUrl`]: url,
                  [`sessions.${currentSessionId}.lastUpdated`]:
                    serverTimestamp(),
                });
              }
            },
          );
          await videoRecorderRef.current.start(streamRef.current);
        } catch (error) {
          console.error("Error starting video recording:", error);
          toast.error("Failed to start video recording");
        }
      }
    };

    const handleCallEnded = async () => {
      console.log("[Call End] Triggered call end sequence");
      setIsCallActive(false);
      setIsProcessing(true);
      setProcessingProgress(0);
      setIsAgentTalking(false);

      try {
        // Check for valid story/session IDs
        if (!currentStoryId || !currentSessionId) {
          console.warn("Missing story or session ID – cannot finalize video.");
          return;
        }

        // Stop video recording
        if (videoRecorderRef.current) {
          console.log("[Recorder] Stopping video recording...");
          await videoRecorderRef.current.stop();
          console.log("[Recorder] Video recording stopped and uploaded.");
        } else {
          console.warn("No videoRecorderRef found when call ended.");
        }

        // Wait briefly before checking processing
        await new Promise((res) => setTimeout(res, 1000));

        // Start polling Firestore for updated session
        processingIntervalRef.current = setInterval(
          checkProcessingStatus,
          2000,
        );
      } catch (error) {
        console.error("[Error] During call end or video finalization:", error);
        toast.error("Error finalizing video recording.");
      } finally {
        // Always stop camera stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };

    const handleAgentStartTalking = () => {
      setIsAgentTalking(true);
    };

    const handleAgentStopTalking = () => {
      setIsAgentTalking(false);
    };

    const handleError = (error: Error) => {
      console.error("Call error:", error);
      clearTimeout(timeoutRef.current);
      toast.error(`Call error: ${error.message}`);
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

  const handleTimeout = () => {
    const elapsedTime = Date.now() - (startTimeRef.current || 0);
    console.log(`Call setup timed out after ${elapsedTime}ms`);
    setIsLoading(false);
    toast.error("Call setup timed out. Please try again.");
    if (retellWebClientRef.current) {
      try {
        retellWebClientRef.current.stopCall();
      } catch (error) {
        console.error("Error stopping call after timeout:", error);
      }
    }
  };

  const startCall = async () => {
    if (!user || !retellWebClientRef.current) {
      toast.error("Cannot start call at this time");
      return;
    }

    setIsLoading(true);
    startTimeRef.current = Date.now();
    timeoutRef.current = setTimeout(handleTimeout, 30000);

    try {
      const backendUrl =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";
      const response = await fetch(`${backendUrl}/create-web-call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
          categoryId: category.id,
          question,
          existingStoryId: currentStoryId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create web call");
      }

      const data = await response.json();

      setCurrentStoryId(data.storyId);
      setCurrentSessionId(data.sessionId);

      await retellWebClientRef.current.startCall({
        accessToken: data.accessToken,
      });
    } catch (error: any) {
      console.error("Error starting call:", error);
      clearTimeout(timeoutRef.current);
      setIsLoading(false);
      toast.error(error.message || "Failed to start call");
    }
  };

  const endCall = () => {
    if (retellWebClientRef.current) {
      try {
        retellWebClientRef.current.stopCall();
      } catch (error) {
        console.error("Error ending call:", error);
        toast.error("Failed to end call");
      }
    }
  };

  const handleClose = () => {
    if (isCallActive) {
      const confirmEnd = window.confirm(
        "Are you sure you want to end the call?",
      );
      if (confirmEnd && retellWebClientRef.current) {
        retellWebClientRef.current.stopCall();
      }
    } else if (!isProcessing) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      onClose(false);
    }
  };

  if (!isOpen) return null;

  if (isProcessing) {
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
              <Sparkles className="w-8 h-8 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Processing Your Story
            </h3>
            <p className="text-gray-600">
              Our AI is analyzing your conversation and crafting a beautiful
              narrative. This may take a moment...
            </p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${processingProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500">
            Please don't close this window
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full h-[80vh] max-w-6xl flex overflow-hidden">
        {/* Main content area with video */}
        <div className="flex-1 bg-gray-900 relative">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-4">
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white flex items-center space-x-2">
              {isMicPermissionGranted ? (
                <Mic className="w-5 h-5 text-green-400" />
              ) : (
                <MicOff className="w-5 h-5 text-red-400" />
              )}
              {isCameraPermissionGranted ? (
                <Video className="w-5 h-5 text-green-400" />
              ) : (
                <VideoOff className="w-5 h-5 text-red-400" />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 border-l border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {isCallActive ? "Ongoing Call" : "Start Call"}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                disabled={isLoading}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-1">
                  {category.title}
                </p>
                <p>{question}</p>
              </div>

              {isCallActive ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="animate-pulse text-orange-500">
                      {isAgentTalking ? "Agent is speaking..." : "Listening..."}
                    </div>
                  </div>

                  <button
                    onClick={endCall}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Phone className="w-5 h-5" />
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
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Phone className="w-5 h-5" />
                  <span>{isLoading ? "Initializing..." : "Start Call"}</span>
                </button>
              )}

              {(!isMicPermissionGranted || !isCameraPermissionGranted) && (
                <p className="text-sm text-red-500 text-center">
                  Please grant camera and microphone permissions to start the
                  call
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
