import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, orderBy, limit, getDocs, startAfter, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { format } from 'date-fns';
import { ChevronRight, Search, Loader2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { ConversationDialog } from './ConversationDialog';

interface CallEntry {
  id: string;
  callId: string;
  category: string;
  creationTime: Date;
  initialQuestion: string;
  lastUpdated: Date;
  recording_url: string;
  sessionId: string;
  storyId: string;
  summary: string;
  title: string;
  transcript: string;
  transcript_object: Array<{
    content: string;
    role: string;
    metadata?: {
      response_id: number;
    };
    words: Array<{
      word: string;
      start: number;
      end: number;
    }>;
  }>;
  updated: boolean;
  videoComplete: boolean;
  videoUrl: string;
}

const CALLS_PER_PAGE = 10;

export const CallHistoryView: React.FC = () => {
  const [user] = useAuthState(auth);
  const [calls, setCalls] = useState<CallEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallEntry | null>(null);
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const navigate = useNavigate();

  const fetchCalls = async (isInitial = true) => {
    if (!user?.uid) return;

    try {
      if (isInitial) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      let callQuery = query(
        collection(db, 'users', user.uid, 'call_history'),
        orderBy('lastUpdated', 'desc'),
        limit(CALLS_PER_PAGE)
      );

      if (!isInitial && lastVisible) {
        callQuery = query(
          collection(db, 'users', user.uid, 'call_history'),
          orderBy('lastUpdated', 'desc'),
          startAfter(lastVisible),
          limit(CALLS_PER_PAGE)
        );
      }

      const snapshot = await getDocs(callQuery);
      const callsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        creationTime: doc.data().creationTime.toDate(),
        lastUpdated: doc.data().lastUpdated.toDate()
      } as CallEntry));

      if (isInitial) {
        setCalls(callsData);
      } else {
        setCalls(prev => [...prev, ...callsData]);
      }

      setLastVisible(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === CALLS_PER_PAGE);
    } catch (error) {
      console.error('Error fetching calls:', error);
      toast.error('Failed to load call history');
    } finally {
      if (isInitial) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [user]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchCalls(false);
    }
  };

  const handleViewConversation = (call: CallEntry) => {
    setSelectedCall(call);
    setIsConversationOpen(true);
  };

  const filteredCalls = calls.filter(call => {
    const matchesSearch = searchQuery.toLowerCase().split(' ').every(term =>
      call.title.toLowerCase().includes(term)
    );
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Call History</h1>
            <p className="text-gray-600 mt-1">
              View and manage your AI conversation history
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {/* Call List */}
            <div className="divide-y divide-gray-200">
              {filteredCalls.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No calls found matching your criteria</p>
                </div>
              ) : (
                filteredCalls.map(call => (
                  <div key={call.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {call.title}
                          </h3>
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                            {call.category}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-3">{call.initialQuestion}</p>
                        <p className="text-sm text-gray-500 mb-2">{call.summary}</p>
                        
                        <div className="text-sm text-gray-500">
                          {format(call.creationTime, 'PPpp')}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <button
                          onClick={() => handleViewConversation(call)}
                          className="flex items-center px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          View Conversation
                        </button>
                        <button
                          onClick={() => navigate(`/stories/${call.storyId}`)}
                          className="flex items-center px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                          View Story
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="p-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center mx-auto"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCall && (
        <ConversationDialog
          isOpen={isConversationOpen}
          onClose={() => {
            setIsConversationOpen(false);
            setSelectedCall(null);
          }}
          transcript={selectedCall.transcript_object}
          title={selectedCall.title}
          videoUrl={selectedCall.videoUrl}
          audioUrl={selectedCall.recording_url}
        />
      )}
    </>
  );
};