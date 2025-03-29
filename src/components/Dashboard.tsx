import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { Category } from '../types/category';
import { User } from '../types/user';
import { Story } from '../types/story';
import { CategoryModal } from './CategoryModal';
import { CallModal } from './CallModal';
import { PlusCircle, Image as ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export const Dashboard: React.FC = () => {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<User | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;

      setIsLoading(true);
      try {
        // Fetch user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUserData(userData);
        }

        // Fetch categories
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Category));
        setCategories(categoriesData);

        // Fetch all stories for the user
        const storiesQuery = query(
          collection(db, 'stories'),
          where('userId', '==', user.uid),
          where('isOnboardingStory', 'in', [false, null])
        );

        const storiesSnapshot = await getDocs(storiesQuery);
        const storiesData = storiesSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Story))
          .filter(story => (story.title !== null && story.isOnboardingStory !== true));
        
        storiesData.sort((a, b) => {
          const timeA = (a.lastUpdationTime as Timestamp).toMillis();
          const timeB = (b.lastUpdationTime as Timestamp).toMillis();
          return timeB - timeA;
        });
        
        setStories(storiesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load stories');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleCategorySelect = (category: Category, question: string) => {
    setSelectedCategory(category);
    setSelectedQuestion(question);
    setIsCategoryModalOpen(false);
    setIsCallModalOpen(true);
  };

  const handleCallModalClose = async (isProcessingComplete?: boolean) => {
    setIsCallModalOpen(false);
    setSelectedCategory(null);
    setSelectedQuestion('');
    
    // Refresh stories
    if (user?.uid) {
      try {
        const storiesQuery = query(
          collection(db, 'stories'),
          where('userId', '==', user.uid),
          where('isOnboardingStory', 'in', [false, null])
        );

        const storiesSnapshot = await getDocs(storiesQuery);
        const storiesData = storiesSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Story))
          .filter(story => story.title !== null);
        
        storiesData.sort((a, b) => {
          const timeA = (a.lastUpdationTime as Timestamp).toMillis();
          const timeB = (b.lastUpdationTime as Timestamp).toMillis();
          return timeB - timeA;
        });
        
        setStories(storiesData);
      } catch (error) {
        console.error('Error refreshing stories:', error);
        toast.error('Failed to refresh stories');
      }
    }
  };

  const formatRelativeTime = (timestamp: Timestamp) => {
    return formatDistanceToNow(timestamp.toDate(), { addSuffix: true });
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Stories</h1>
            <p className="text-gray-600 mt-1">
              Preserve and share your precious memories
            </p>
          </div>
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Create New Story
          </button>
        </div>

        {stories.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No completed stories yet</h3>
            <p className="text-gray-600 mb-6">
              Start creating your first story by clicking the "Create New Story" button
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stories.map((story) => (
              <div 
                key={story.id} 
                className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/stories/${story.id}`)}
              >
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  {story.imageUrl ? (
                    <img 
                      src={story.imageUrl} 
                      alt={story.title} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-gray-400">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {story.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {story.description || 'Start your story by having a conversation'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {story.lastUpdationTime && formatRelativeTime(story.lastUpdationTime as Timestamp)}
                    </span>
                    <span className="text-orange-500 hover:text-orange-600 font-medium text-sm">
                      Read Story
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onSelectCategory={handleCategorySelect}
        showOnboarding={!userData?.isOnboarded}
      />

      {selectedCategory && (
        <CallModal
          isOpen={isCallModalOpen}
          onClose={handleCallModalClose}
          category={selectedCategory}
          question={selectedQuestion}
        />
      )}
    </div>
  );
};