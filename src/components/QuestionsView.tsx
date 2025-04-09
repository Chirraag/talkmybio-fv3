import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UpcomingQuestion } from '../types/question';
import { Category } from '../types/category';
import { User } from '../types/user';
import { CallModal } from './CallModal';
import { ConversationTypeModal } from './scheduling/ConversationTypeModal';
import { SchedulingModal } from './scheduling/SchedulingModal';
import { HelpCircle, Play } from 'lucide-react';
import toast from 'react-hot-toast';

export const QuestionsView: React.FC = () => {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<User | null>(null);
  const [upcomingQuestions, setUpcomingQuestions] = useState<UpcomingQuestion[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
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

        // Fetch upcoming questions
        const questionsQuery = query(
          collection(db, 'upcoming_questions'),
          where('userId', '==', user.uid)
        );
        const questionsSnapshot = await getDocs(questionsQuery);
        const questionsData = questionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as UpcomingQuestion));
        
        setUpcomingQuestions(questionsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load questions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleStartQuestion = (question: UpcomingQuestion) => {
    const category = categories.find(c => c.id === question.categoryId);
    if (category) {
      setSelectedCategory(category);
      setSelectedQuestion(question.question);
      setShowConversationTypeModal(true);
    }
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
    // Refresh questions
    const fetchQuestions = async () => {
      if (!user?.uid) return;
      try {
        const questionsQuery = query(
          collection(db, 'upcoming_questions'),
          where('userId', '==', user.uid)
        );
        const questionsSnapshot = await getDocs(questionsQuery);
        const questionsData = questionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as UpcomingQuestion));
        setUpcomingQuestions(questionsData);
      } catch (error) {
        console.error('Error refreshing questions:', error);
      }
    };
    fetchQuestions();
  };

  const handleCallModalClose = () => {
    setIsCallModalOpen(false);
    setSelectedCategory(null);
    setSelectedQuestion('');
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
          <h1 className="text-3xl font-bold text-gray-900">AI Picks</h1>
          <p className="text-gray-600 mt-1">
            Questions we've prepared to help you share your stories
          </p>
        </div>

        {upcomingQuestions.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No AI picks</h3>
            <p className="text-gray-600">
              We'll add more questions based on your conversations and interests
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingQuestions.map((question) => (
              <div
                key={question.id}
                className="bg-white rounded-lg shadow-sm p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-sm font-medium text-gray-700">
                      {question.categoryTitle}
                    </span>
                  </div>
                  <button
                    onClick={() => handleStartQuestion(question)}
                    className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-medium"
                  >
                    <Play className="w-4 h-4" />
                    <span>Start</span>
                  </button>
                </div>

                <h3 className="text-xl font-semibold text-gray-900">
                  {question.question}
                </h3>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCategory && (
        <>
          <ConversationTypeModal
            isOpen={showConversationTypeModal}
            onClose={() => setShowConversationTypeModal(false)}
            category={selectedCategory}
            question={selectedQuestion}
            onStartNow={handleStartNow}
            onSchedule={handleSchedule}
            onBack={() => setShowConversationTypeModal(false)}
          />

          <CallModal
            isOpen={isCallModalOpen}
            onClose={handleCallModalClose}
            category={selectedCategory}
            question={selectedQuestion}
          />

          <SchedulingModal
            isOpen={showSchedulingModal}
            onClose={handleSchedulingComplete}
            category={selectedCategory}
            question={selectedQuestion}
            onBack={() => {
              setShowSchedulingModal(false);
              setShowConversationTypeModal(true);
            }}
          />
        </>
      )}
    </div>
  );
};