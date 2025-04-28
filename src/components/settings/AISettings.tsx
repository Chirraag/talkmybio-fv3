import React, { useState, useEffect, useRef } from 'react';
import { User } from '../../types/user';
import { Play, Loader2, Check } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { auth } from '../../lib/firebase';
import Retell from 'retell-sdk';
import toast from 'react-hot-toast';

interface Voice {
  voice_id: string;
  voice_name: string;
  provider: string;
  accent: string;
  gender: string;
  age: string;
  preview_audio_url: string;
}

interface AISettingsProps {
  userData: User;
  onSettingsUpdate: () => void;
}

const DEFAULT_VOICE = {
  voice_id: "play-Cimo",
  voice_type: "standard",
  standard_voice_type: "retell",
  voice_name: "Cimo",
  provider: "play",
  accent: "American",
  gender: "female",
  age: "Middle Aged",
  avatar_url: "https://retell-utils-public.s3.us-west-2.amazonaws.com/cimo.png",
  preview_audio_url: "https://retell-utils-public.s3.us-west-2.amazonaws.com/play-Cimo.mp3"
};

export const AISettings: React.FC<AISettingsProps> = ({ userData, onSettingsUpdate }) => {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState(userData.aiPreferences?.voice || DEFAULT_VOICE);
  const [conversationStyle, setConversationStyle] = useState(userData.aiPreferences?.conversationStyle || 'balanced');
  const [followUpIntensity, setFollowUpIntensity] = useState(userData.aiPreferences?.followUpIntensity || 'balanced');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchVoices = async () => {
      setIsLoading(true);
      try {
        const client = new Retell({
          apiKey: import.meta.env.VITE_RETELL_API_KEY,
        });

        const voiceResponses = await client.voice.list();
        setVoices(voiceResponses);
      } catch (error) {
        console.error('Error fetching voices:', error);
        toast.error('Failed to load voice options');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVoices();
  }, []);

  useEffect(() => {
    if (userData.aiPreferences) {
      setSelectedVoice(userData.aiPreferences.voice);
      setConversationStyle(userData.aiPreferences.conversationStyle);
      setFollowUpIntensity(userData.aiPreferences.followUpIntensity);
    }
  }, [userData]);

  // Stop current audio when voice changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [selectedVoice]);

  const handlePlaySample = () => {
    // Create new audio instance with current voice's preview URL
    audioRef.current = new Audio(selectedVoice.preview_audio_url);
    audioRef.current.onended = () => setIsPlaying(false);

    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(error => {
        console.error('Error playing audio:', error);
        toast.error('Failed to play audio sample');
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  const updateRetellAgents = async () => {
    const client = new Retell({
      apiKey: import.meta.env.VITE_RETELL_API_KEY,
    });

    const updatePromises = userData.agentIds.map(async (agentId) => {
      try {
        await client.agent.update(agentId, {
          voice_id: selectedVoice.voice_id,
        });
      } catch (error) {
        console.error(`Error updating agent ${agentId}:`, error);
        throw error;
      }
    });

    await Promise.all(updatePromises);
  };

  const handleSaveChanges = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      toast.error('You must be logged in to save changes');
      return;
    }

    setIsSaving(true);
    try {
      // Update user preferences in Firestore
      await updateDoc(doc(db, 'users', userId), {
        aiPreferences: {
          voice: selectedVoice,
          followUpIntensity,
          conversationStyle
        },
        updatedAt: new Date()
      });

      // Update Retell agents with new voice
      await updateRetellAgents();
      
      toast.success('AI preferences updated successfully');
      onSettingsUpdate();
    } catch (error) {
      console.error('Error updating AI preferences:', error);
      toast.error('Failed to update AI preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className='w-full'>
        <h2 className="text-xl text-center md:text-left font-semibold text-gray-900 mb-4">AI Conversation Preferences</h2>
        <p className="text-gray-600 text-center md:text-left text-wrap mb-6">
          Customize how StoryMindAI interacts with you during conversations
        </p>

        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Conversation Style</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  type="radio"
                  name="conversationStyle"
                  value="casual"
                  checked={conversationStyle === 'casual'}
                  onChange={(e) => setConversationStyle(e.target.value)}
                  className="sr-only"
                />
                <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                  conversationStyle === 'casual' ? 'border-orange-500' : 'border-transparent'
                }`} />
                <div className="font-medium mb-1">Casual</div>
                <div className="text-sm text-gray-600">
                  Friendly, conversational tone with simple language
                </div>
              </label>

              <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  type="radio"
                  name="conversationStyle"
                  value="balanced"
                  checked={conversationStyle === 'balanced'}
                  onChange={(e) => setConversationStyle(e.target.value)}
                  className="sr-only"
                />
                <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                  conversationStyle === 'balanced' ? 'border-orange-500' : 'border-transparent'
                }`} />
                <div className="font-medium mb-1">Balanced</div>
                <div className="text-sm text-gray-600">
                  Natural mix of conversational and thoughtful questions
                </div>
              </label>

              <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  type="radio"
                  name="conversationStyle"
                  value="reflective"
                  checked={conversationStyle === 'reflective'}
                  onChange={(e) => setConversationStyle(e.target.value)}
                  className="sr-only"
                />
                <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                  conversationStyle === 'reflective' ? 'border-orange-500' : 'border-transparent'
                }`} />
                <div className="font-medium mb-1">Reflective</div>
                <div className="text-sm text-gray-600">
                  Deeper, more philosophical approach to conversations
                </div>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">AI Voice</h3>
            <div className="flex items-center space-x-4">
              <div className="relative w-64" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  disabled={isLoading}
                >
                  {selectedVoice.voice_name} ({selectedVoice.gender})
                </button>
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                    {voices.map((voice) => (
                      <button
                        key={voice.voice_id}
                        onClick={() => {
                          setSelectedVoice(voice);
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-100 ${
                          selectedVoice.voice_id === voice.voice_id ? 'bg-orange-50 text-orange-600' : ''
                        }`}
                      >
                        {voice.voice_name} ({voice.gender})
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handlePlaySample}
                className="flex items-center px-4 py-2 text-orange-600 hover:text-orange-700 transition-colors"
                disabled={isLoading}
              >
                <Play className="w-4 h-4 mr-2" />
                <p className='hidden md:block'>{isPlaying ? 'Stop Sample' : 'Play Sample'}</p>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Follow-up Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  type="radio"
                  name="followUpIntensity"
                  value="fewer"
                  checked={followUpIntensity === 'fewer'}
                  onChange={(e) => setFollowUpIntensity(e.target.value)}
                  className="sr-only"
                />
                <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                  followUpIntensity === 'fewer' ? 'border-orange-500' : 'border-transparent'
                }`} />
                <div className="font-medium mb-1">Fewer Questions</div>
                <div className="text-sm text-gray-600">
                  Minimal follow-up questions for a concise conversation
                </div>
              </label>

              <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  type="radio"
                  name="followUpIntensity"
                  value="balanced"
                  checked={followUpIntensity === 'balanced'}
                  onChange={(e) => setFollowUpIntensity(e.target.value)}
                  className="sr-only"
                />
                <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                  followUpIntensity === 'balanced' ? 'border-orange-500' : 'border-transparent'
                }`} />
                <div className="font-medium mb-1">Balanced</div>
                <div className="text-sm text-gray-600">
                  Natural flow of follow-up questions
                </div>
              </label>

              <label className="relative flex flex-col bg-white p-4 border rounded-lg cursor-pointer hover:border-orange-500 transition-colors">
                <input
                  type="radio"
                  name="followUpIntensity"
                  value="more"
                  checked={followUpIntensity === 'more'}
                  onChange={(e) => setFollowUpIntensity(e.target.value)}
                  className="sr-only"
                />
                <div className={`absolute inset-0 rounded-lg border-2 pointer-events-none transition-colors ${
                  followUpIntensity === 'more' ? 'border-orange-500' : 'border-transparent'
                }`} />
                <div className="font-medium mb-1">More Questions</div>
                <div className="text-sm text-gray-600">
                  Detailed exploration with more follow-up questions
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveChanges}
            disabled={isSaving || isLoading}
            className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};