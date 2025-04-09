import React, { useRef, useState } from 'react';
import { X, User, Bot, Download, Volume2, VolumeX } from 'lucide-react';

interface ConversationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transcript: Array<{
    content: string;
    role: string;
  }>;
  title: string;
  videoUrl?: string;
  audioUrl?: string;
}

export const ConversationDialog: React.FC<ConversationDialogProps> = ({
  isOpen,
  onClose,
  transcript,
  title,
  videoUrl,
  audioUrl,
}) => {
  const [audioMuted, setAudioMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!isOpen) return null;

  const handleVideoPlay = () => {
    if (audioRef.current && !audioMuted) {
      audioRef.current.currentTime = videoRef.current?.currentTime || 0;
      audioRef.current.play().catch(console.error);
    }
  };

  const handleVideoPause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const handleVideoTimeUpdate = () => {
    if (audioRef.current && !audioMuted && videoRef.current) {
      if (Math.abs(audioRef.current.currentTime - videoRef.current.currentTime) > 0.1) {
        audioRef.current.currentTime = videoRef.current.currentTime;
      }
    }
  };

  const handleVideoEnded = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const toggleAudio = () => {
    setAudioMuted(!audioMuted);
    if (audioRef.current && videoRef.current) {
      if (!audioMuted) {
        audioRef.current.pause();
      } else if (!videoRef.current.paused) {
        audioRef.current.currentTime = videoRef.current.currentTime;
        audioRef.current.play().catch(console.error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          <div className="flex items-center space-x-4">
            {audioUrl && (
              <a
                href={audioUrl}
                download="audio_recording.wav"
                className="text-orange-600 hover:text-orange-700 flex items-center"
              >
                <Download className="w-4 h-4 mr-1" />
                Download Audio
              </a>
            )}
            {videoUrl && (
              <a
                href={videoUrl}
                download="video_recording.webm"
                className="text-orange-600 hover:text-orange-700 flex items-center"
              >
                <Download className="w-4 h-4 mr-1" />
                Download Video
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Video */}
          {videoUrl && (
            <div className="relative aspect-video bg-black">
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
                controls
                playsInline
                muted
                preload="metadata"
              >
                <source src={videoUrl} type="video/webm" />
                Your browser does not support the video element.
              </video>

              {audioUrl && (
                <>
                  <audio ref={audioRef} src={audioUrl} preload="auto" />
                  <button
                    onClick={toggleAudio}
                    className="absolute bottom-4 right-4 p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                    title={audioMuted ? "Unmute audio" : "Mute audio"}
                  >
                    {audioMuted ? (
                      <VolumeX className="w-5 h-5 text-gray-700" />
                    ) : (
                      <Volume2 className="w-5 h-5 text-gray-700" />
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Audio Only (no video) */}
          {!videoUrl && audioUrl && (
            <div className="p-4 border-b border-gray-200">
              <div className="max-w-2xl mx-auto">
                <audio controls className="w-full" preload="metadata">
                  <source src={audioUrl} type="audio/wav" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            </div>
          )}

          {/* Transcript */}
          <div className="p-4 space-y-4 max-w-3xl mx-auto">
            {transcript.map((message, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  message.role === 'agent' ? 'bg-orange-50' : 'bg-blue-50'
                }`}
              >
                <div className="flex items-center mb-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'agent' ? 'bg-orange-500' : 'bg-blue-500'
                    } text-white`}
                  >
                    {message.role === 'agent' ? (
                      <Bot className="w-5 h-5" />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                  </div>
                  <span className="ml-3 font-medium">
                    {message.role === 'agent' ? 'StoryMindAI' : 'You'}
                  </span>
                </div>
                <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
