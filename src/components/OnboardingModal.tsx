import React, { useState, useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { RetellWebClient } from 'retell-client-js-sdk';
import { Video, MessageSquare, X, Mic, MicOff, Camera, CameraOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [showCallModal, setShowCallModal] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMicPermissionGranted, setIsMicPermissionGranted] = useState(false);
  const [isCameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAgentTalking, setIsAgentTalking] = useState(false);
  const [currentStoryId, setCurrentStoryId] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const retellWebClientRef = useRef<RetellWebClient | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (showCallModal) {
      requestPermissions();
    }
  }, [showCallModal]);

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true,
        video: true
      });
      
      setIsMicPermissionGranted(true);
      setCameraPermissionGranted(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      streamRef.current = stream;
    } catch (error: any) {
      console.error('Error getting permissions:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Please grant camera and microphone permissions to continue');
      } else {
        toast.error('Error accessing camera or microphone');
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

    const handleCallStarted = () => {
      console.log("Call started");
      clearTimeout(timeoutRef.current);
      setIsCallActive(true);
      setIsLoading(false);
      toast.success('Call started successfully');
    };

    const handleCallEnded = async () => {
      console.log("Call ended");
      setIsCallActive(false);
      setIsAgentTalking(false);
      setIsProcessing(true);

      try {
        if (auth.currentUser && currentStoryId) {
          // Update user document
          await updateDoc(doc(db, 'users', auth.currentUser.uid), {
            isOnboarded: true,
            onboardingStoryId: currentStoryId,
            updatedAt: serverTimestamp()
          });
          
          onClose();
        }
      } catch (error) {
        console.error('Error updating onboarding status:', error);
        toast.error('Failed to complete onboarding');
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
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
    };
  }, [onClose, currentStoryId]);

  const startCall = async () => {
    if (!auth.currentUser || !retellWebClientRef.current) {
      toast.error('Cannot start call at this time');
      return;
    }

    setIsLoading(true);
    startTimeRef.current = Date.now();
    timeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      toast.error('Call setup timed out. Please try again.');
    }, 30000);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
      const response = await fetch(`${backendUrl}/create-web-call`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: auth.currentUser.uid,
          agentId: 'agent_672107b610df5ac720e395b13b',
          isOnboarding: true
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create web call');
      }

      const data = await response.json();
      
      setCurrentStoryId(data.storyId);
      setCurrentSessionId(data.sessionId);

      await retellWebClientRef.current.startCall({
        accessToken: data.accessToken,
      });

    } catch (error: any) {
      console.error('Error starting call:', error);
      clearTimeout(timeoutRef.current);
      setIsLoading(false);
      toast.error(error.message || 'Failed to start call');
    }
  };

  if (!isOpen) return null;

  if (!showCallModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-lg w-full">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Welcome to StoryMind</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <div className="space-y-6">
            <p className="text-gray-600">
              Let's start with a quick conversation to help us understand you better.
            </p>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">What to expect:</h3>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-600">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                    <MessageSquare className="w-4 h-4 text-orange-600" />
                  </div>
                  Interactive conversation with AI
                </li>
                <li className="flex items-center text-gray-600">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                    <Video className="w-4 h-4 text-orange-600" />
                  </div>
                  Video and audio recording
                </li>
              </ul>
            </div>

            <button
              onClick={() => setShowCallModal(true)}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center space-x-2"
            >
              <Video className="w-5 h-5" />
              <span>Start Onboarding</span>
            </button>
          </div>
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
            <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full text-white flex items-center space-x-4">
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
        <div className="w-80 border-l border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {isCallActive ? 'Ongoing Call' : 'Start Call'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {isCallActive ? (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <MessageSquare className="w-5 h-5 text-gray-600" />
                      <h4 className="font-medium text-gray-900">Conversation in Progress</h4>
                    </div>
                    <p className="text-gray-600 text-sm">
                      Feel free to ask questions and share your thoughts naturally.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      if (retellWebClientRef.current) {
                        retellWebClientRef.current.stopCall();
                      }
                    }}
                    className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Video className="w-5 h-5" />
                    <span>End Call</span>
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={startCall}
                    disabled={!isMicPermissionGranted || !isCameraPermissionGranted || isLoading}
                    className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <Video className="w-5 h-5" />
                    <span>{isLoading ? 'Connecting...' : 'Start Call'}</span>
                  </button>

                  {(!isMicPermissionGranted || !isCameraPermissionGranted) && (
                    <div className="bg-red-50 rounded-lg p-4">
                      <p className="text-sm text-red-600">
                        Please grant camera and microphone permissions to continue
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};