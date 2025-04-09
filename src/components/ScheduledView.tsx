import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Story } from '../types/story';
import { Category } from '../types/category';
import { User } from '../types/user';
import { CallModal } from './CallModal';
import { ConversationTypeModal } from './scheduling/ConversationTypeModal';
import { SchedulingModal } from './scheduling/SchedulingModal';
import { CountdownTimer } from './CountdownTimer';
import { Calendar, Edit2, Trash2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export const ScheduledView: React.FC = () => {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<User | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showConversationTypeModal, setShowConversationTypeModal] = useState(false);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;

      try {
        setIsLoading(true);

        // Fetch user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as User);
        }

        // Fetch categories
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Category));
        setCategories(categoriesData);

        // Fetch scheduled stories
        const storiesQuery = query(
          collection(db, 'stories'),
          where('userId', '==', user.uid),
          where('nextSchedule.status', '==', 'scheduled')
        );
        const storiesSnapshot = await getDocs(storiesQuery);
        const storiesData = storiesSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Story))
          .filter(story => !story.isOnboardingStory);

        // Sort by scheduled date
        storiesData.sort((a, b) => {
          const dateA = a.nextSchedule?.dateTime.toDate() || new Date();
          const dateB = b.nextSchedule?.dateTime.toDate() || new Date();
          return dateA.getTime() - dateB.getTime();
        });
        
        setStories(storiesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load scheduled conversations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleEditSchedule = (story: Story) => {
    const category = categories.find(c => c.id === story.categoryId);
    if (category) {
      setSelectedStory(story);
      setSelectedCategory(category);
      setShowSchedulingModal(true);
    }
  };

  const handleDeleteSchedule = async (story: Story) => {
    try {
      await updateDoc(doc(db, 'stories', story.id), {
        nextSchedule: null,
        lastUpdationTime: serverTimestamp()
      });
      
      setStories(prevStories => prevStories.filter(s => s.id !== story.id));
      toast.success('Schedule deleted successfully');
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast.error('Failed to delete schedule');
    }
  };

  const handleSchedulingComplete = () => {
    setShowSchedulingModal(false);
    setSelectedStory(null);
    setSelectedCategory(null);
    
    // Refresh the stories list
    const fetchStories = async () => {
      if (!user?.uid) return;
      try {
        const storiesQuery = query(
          collection(db, 'stories'),
          where('userId', '==', user.uid),
          where('nextSchedule.status', '==', 'scheduled')
        );
        const storiesSnapshot = await getDocs(storiesQuery);
        const storiesData = storiesSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Story))
          .filter(story => !story.isOnboardingStory);

        storiesData.sort((a, b) => {
          const dateA = a.nextSchedule?.dateTime.toDate() || new Date();
          const dateB = b.nextSchedule?.dateTime.toDate() || new Date();
          return dateA.getTime() - dateB.getTime();
        });
        
        setStories(storiesData);
      } catch (error) {
        console.error('Error refreshing stories:', error);
      }
    };
    fetchStories();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Scheduled Conversations</h1>
          <p className="text-gray-600 mt-1">
            Manage your upcoming scheduled conversations
          </p>
        </div>

        {stories.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scheduled conversations</h3>
            <p className="text-gray-600">
              Schedule a conversation from the Prompts section to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stories.map((story, index) => (
              <div
                key={story.id}
                className={`bg-white rounded-lg shadow-sm p-6 ${index === 0 ? 'ring-2 ring-orange-500' : ''}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                      {categories.find(c => c.id === story.categoryId)?.title}
                    </span>
                    <span className="text-gray-500">
                      {index === 0 ? 'Upcoming Conversation' : 'Scheduled Conversation'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditSchedule(story)}
                      className="p-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded-full transition-colors"
                      title="Edit Schedule"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteSchedule(story)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {story.initialQuestion}
                </h3>

                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {index === 0 ? (
                      <CountdownTimer targetDate={story.nextSchedule?.dateTime.toDate() || new Date()} />
                    ) : (
                      `Scheduled for ${formatDistanceToNow(story.nextSchedule?.dateTime.toDate() || new Date(), { addSuffix: true })}`
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCategory && selectedStory && (
        <SchedulingModal
          isOpen={showSchedulingModal}
          onClose={handleSchedulingComplete}
          category={selectedCategory}
          question={selectedStory.initialQuestion}
          existingStoryId={selectedStory.id}
          onBack={() => {
            setShowSchedulingModal(false);
            setSelectedStory(null);
            setSelectedCategory(null);
          }}
        />
      )}
    </div>
  );
};