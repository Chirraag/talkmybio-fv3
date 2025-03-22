import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Story } from '../types/story';
import { ArrowLeft, Share, Download, User, Bot, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

type Tab = 'story' | 'conversation' | 'media';

interface TranscriptMessage {
  role: string;
  content: string;
  words: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  metadata?: {
    response_id: number;
  };
}

export const StoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('story');
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    const fetchStory = async () => {
      if (!id) {
        toast.error('Story ID not found');
        navigate('/stories');
        return;
      }

      try {
        const storyDoc = await getDoc(doc(db, 'stories', id));
        if (!storyDoc.exists()) {
          toast.error('Story not found');
          navigate('/stories');
          return;
        }

        setStory({ id: storyDoc.id, ...storyDoc.data() } as Story);
      } catch (error) {
        console.error('Error fetching story:', error);
        toast.error('Failed to load story');
        navigate('/stories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStory();
  }, [id, navigate]);

  const formatDate = (timestamp: Timestamp) => {
    return format(timestamp.toDate(), 'MMMM d, yyyy');
  };

  const renderTranscriptObject = (messages: TranscriptMessage[]) => {
    return messages.map((message, index) => {
      const isAgent = message.role === 'agent';
      
      return (
        <div
          key={index}
          className={`p-4 rounded-lg mb-4 ${
            isAgent ? 'bg-orange-50' : 'bg-blue-50'
          }`}
        >
          <div className="flex items-center mb-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isAgent ? 'bg-orange-500' : 'bg-blue-500'
              } text-white`}
            >
              {isAgent ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <span className="ml-3 font-medium">
              {isAgent ? 'StoryMindAI' : 'You'}
            </span>
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
        </div>
      );
    });
  };

  const renderSessions = () => {
    if (!story?.sessions) return null;
    
    // Sort sessions by creation time
    const sortedSessions = Object.entries(story.sessions).sort((a, b) => {
      const timeA = (a[1].creationTime as Timestamp).toMillis();
      const timeB = (b[1].creationTime as Timestamp).toMillis();
      return timeA - timeB;
    });

    return sortedSessions.map(([sessionId, session]) => {
      if (!session.transcript_object?.length) return null;

      return (
        <div key={sessionId} className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Conversation {formatDate(session.creationTime as Timestamp)}
            </h3>
          </div>
          {renderTranscriptObject(session.transcript_object)}
        </div>
      );
    });
  };

  const renderAudioSessions = () => {
    if (!story?.sessions) return null;
    
    // Sort sessions by creation time
    const sortedSessions = Object.entries(story.sessions).sort((a, b) => {
      const timeA = (a[1].creationTime as Timestamp).toMillis();
      const timeB = (b[1].creationTime as Timestamp).toMillis();
      return timeA - timeB;
    });

    return sortedSessions.map(([sessionId, session]) => {
      if (!session.recording_url) return null;
      
      return (
        <div key={sessionId} className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recording {formatDate(session.creationTime as Timestamp)}
            </h3>
            <a 
              href={session.recording_url}
              download
              className="text-orange-600 hover:text-orange-700 flex items-center"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </a>
          </div>
          <audio controls className="w-full">
            <source src={session.recording_url} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        </div>
      );
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!story) {
    return null;
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Stories
          </button>
          <div className="flex space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Share className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Download className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="aspect-video bg-gray-100">
            {story.imageUrl ? (
              <img 
                src={story.imageUrl} 
                alt={story.title || 'Story cover'} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-gray-400">
                  <ImageIcon className="w-12 h-12" />
                </div>
              </div>
            )}
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {story.title || story.initialQuestion}
              </h1>
              <p className="text-gray-600 italic">
                {story.description || "A collection of cherished memories"}
              </p>
              <div className="mt-2 text-sm text-gray-500">
                Created on {formatDate(story.creationTime as Timestamp)}
              </div>
            </div>

            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                {(['story', 'conversation', 'media'] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </nav>
            </div>

            <div className="py-6">
              {activeTab === 'story' && (
                <div className="prose max-w-none">
                  {story.storyText ? (
                    <div dangerouslySetInnerHTML={{ __html: story.storyText }} />
                  ) : (
                    <p className="text-gray-600">
                      This story is still being written. Start a conversation to add content.
                    </p>
                  )}
                </div>
              )}

              {activeTab === 'conversation' && (
                <div className="space-y-6">
                  {renderSessions()}
                </div>
              )}

              {activeTab === 'media' && (
                <div className="space-y-6">
                  {renderAudioSessions()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};