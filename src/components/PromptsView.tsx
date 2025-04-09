import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { Story } from '../types/story';
import { Category } from '../types/category';
import { User } from '../types/user';
import { CallModal } from './CallModal';
import { ConversationTypeModal } from './scheduling/ConversationTypeModal';
import { SchedulingModal } from './scheduling/SchedulingModal';
import { OnboardingModal } from './OnboardingModal';
import { MessageSquare, Clock, Plus, ArrowLeft, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

export const PromptsView: React.FC = () => {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<User | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isCustomQuestion, setIsCustomQuestion] = useState(false);
  const [showConversationTypeModal, setShowConversationTypeModal] = useState(false);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;

      try {
        setIsLoading(true);

        // Fetch user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setUserData(userData);
          setShowOnboarding(!userData.isOnboarded);
        }

        // Fetch stories
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
          .filter(story => !story.nextSchedule?.status);

        // Sort by last update
        storiesData.sort((a, b) => {
          const timeA = (a.lastUpdationTime as Timestamp).toMillis();
          const timeB = (b.lastUpdationTime as Timestamp).toMillis();
          return timeB - timeA;
        });
        
        setStories(storiesData);

        // Fetch categories
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Category));

        setCategories(categoriesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load prompts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleContinueStory = (story: Story) => {
    setSelectedStory(story);
    setSelectedCategory(categories.find(c => c.id === story.categoryId) || null);
    setSelectedQuestion(story.initialQuestion);
    setShowConversationTypeModal(true);
  };

  const handleCallModalClose = (isProcessingComplete?: boolean) => {
    setIsCallModalOpen(false);
    setSelectedStory(null);
    setSelectedCategory(null);
    setSelectedQuestion('');
    
    // If processing is complete, navigate to stories tab
    if (isProcessingComplete) {
      navigate('/stories');
    }
  };

  const handleStartNewConversation = () => {
    if (!userData?.isOnboarded) {
      setShowOnboarding(true);
      return;
    }
    
    setIsCreatingNew(true);
    setSelectedCategory(null);
    setSelectedQuestion('');
    setCustomQuestion('');
    setIsCustomQuestion(false);
  };

  const handleBackToList = () => {
    setIsCreatingNew(false);
    setSelectedCategory(null);
    setSelectedQuestion('');
    setCustomQuestion('');
    setIsCustomQuestion(false);
  };

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setSelectedQuestion('');
    setCustomQuestion('');
    setIsCustomQuestion(false);
  };

  const handleQuestionSelect = () => {
    const finalQuestion = isCustomQuestion ? customQuestion : selectedQuestion;
    if (!finalQuestion || !selectedCategory) return;
    
    setShowConversationTypeModal(true);
  };

  const handleStartNow = () => {
    setShowConversationTypeModal(false);
    setIsCallModalOpen(true);
  };

  const handleSchedule = () => {
    setShowConversationTypeModal(false);
    setShowSchedulingModal(true);
  };

  const handleSchedulingComplete = () => {
    setShowSchedulingModal(false);
    setIsCreatingNew(false);
    setSelectedCategory(null);
    setSelectedQuestion('');
    navigate('/scheduled');
  };

  const decodeEmoji = (unicode: string) => {
    try {
      const codePoints = unicode
        .replace(/\\u/g, '')
        .split(/[\s,{}]+/)
        .filter(Boolean)
        .map(code => parseInt(code, 16));
      return String.fromCodePoint(...codePoints);
    } catch (error) {
      console.error('Error decoding emoji:', error);
      return '📝';
    }
  };

  const formatLastConversation = (story: Story) => {
    if (!story.sessions) return 'New conversation started';
    
    const sessions = Object.values(story.sessions);
    if (sessions.length === 0) return 'New conversation started';
    
    const lastSession = sessions[sessions.length - 1];
    return `Last conversation ${formatDistanceToNow(lastSession.creationTime.toDate(), { addSuffix: true })}`;
  };

  if (isLoading || !userData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        {!isCreatingNew ? (
          <>
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Memory Prompts</h1>
                <p className="text-gray-600 mt-1">
                  Start meaningful conversations about your life stories
                </p>
              </div>
              <button
                onClick={handleStartNewConversation}
                className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Start New Conversation
              </button>
            </div>

            {stories.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No in-progress conversations
                </h3>
                <p className="text-gray-600 mb-6">
                  Start your first conversation by clicking the "Start New Conversation" button
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {stories.map((story) => (
                  <div
                    key={story.id}
                    className="bg-white rounded-lg shadow-sm p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                          {categories.find(c => c.id === story.categoryId)?.title}
                        </span>
                        <span className="text-gray-500">Active Conversation</span>
                      </div>
                      <button
                        onClick={() => handleContinueStory(story)}
                        className="text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Continue
                      </button>
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 mb-4">
                      {story.initialQuestion}
                    </h3>

                    <div className="flex items-center space-x-6 text-sm text-gray-500">
                      <div className="flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {formatLastConversation(story)}
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        AI Context: {story.storySummary || 'Initial conversation'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="flex items-center space-x-4 mb-8">
              <button
                onClick={handleBackToList}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-500" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Start New Conversation</h1>
                <p className="text-gray-600 mt-1">
                  Choose a category and question to begin
                </p>
              </div>
            </div>

            {!selectedCategory ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategorySelect(category)}
                    className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:border-orange-500 transition-colors group"
                  >
                    <div className="text-4xl mb-4">{decodeEmoji(category.emoji_unicode)}</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600">
                      {category.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{category.description}</p>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Example:</span> {category.example}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="text-3xl">{decodeEmoji(selectedCategory.emoji_unicode)}</div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{selectedCategory.title}</h3>
                      <p className="text-gray-600">{selectedCategory.description}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedCategory.questions.map((question, index) => (
                      <label
                        key={index}
                        className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-orange-50"
                        style={{
                          borderColor: selectedQuestion === question ? '#f97316' : '#e5e7eb',
                          backgroundColor: selectedQuestion === question ? '#fff7ed' : 'white',
                        }}
                      >
                        <input
                          type="radio"
                          name="question"
                          checked={selectedQuestion === question}
                          onChange={() => {
                            setSelectedQuestion(question);
                            setIsCustomQuestion(false);
                          }}
                          className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-gray-900">{question}</span>
                      </label>
                    ))}

                    <label
                      className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-orange-50"
                      style={{
                        borderColor: isCustomQuestion ? '#f97316' : '#e5e7eb',
                        backgroundColor: isCustomQuestion ? '#fff7ed' : 'white',
                      }}
                    >
                      <input
                        type="radio"
                        name="question"
                        checked={isCustomQuestion}
                        onChange={() => {
                          setIsCustomQuestion(true);
                          setSelectedQuestion('');
                        }}
                        className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-gray-900">Ask your own question</span>
                    </label>

                    {isCustomQuestion && (
                      <div className="ml-7">
                        <textarea
                          value={customQuestion}
                          onChange={(e) => setCustomQuestion(e.target.value)}
                          placeholder="Type your question here..."
                          className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex justify-end">
                    <button
                      onClick={handleQuestionSelect}
                      disabled={!selectedQuestion && !customQuestion}
                      className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {(selectedStory || (selectedCategory && (selectedQuestion || customQuestion))) && (
        <>
          <CallModal
            isOpen={isCallModalOpen}
            onClose={handleCallModalClose}
            category={selectedStory ? categories.find(c => c.id === selectedStory.categoryId)! : selectedCategory!}
            question={selectedStory ? selectedStory.initialQuestion : (isCustomQuestion ? customQuestion : selectedQuestion)}
            existingStoryId={selectedStory?.id}
          />

          <ConversationTypeModal
            isOpen={showConversationTypeModal}
            onClose={() => setShowConversationTypeModal(false)}
            category={selectedStory ? categories.find(c => c.id === selectedStory.categoryId)! : selectedCategory!}
            question={selectedStory ? selectedStory.initialQuestion : (isCustomQuestion ? customQuestion : selectedQuestion)}
            onStartNow={handleStartNow}
            onSchedule={handleSchedule}
            onBack={() => setShowConversationTypeModal(false)}
          />

          <SchedulingModal
            isOpen={showSchedulingModal}
            onClose={handleSchedulingComplete}
            category={selectedStory ? categories.find(c => c.id === selectedStory.categoryId)! : selectedCategory!}
            question={selectedStory ? selectedStory.initialQuestion : (isCustomQuestion ? customQuestion : selectedQuestion)}
            existingStoryId={selectedStory?.id}
            onBack={() => {
              setShowSchedulingModal(false);
              setShowConversationTypeModal(true);
            }}
          />
        </>
      )}

      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
    </div>
  );
};