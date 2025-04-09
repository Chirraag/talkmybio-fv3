import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { StoryView } from './components/StoryView';
import { PromptsView } from './components/PromptsView';
import { QuestionsView } from './components/QuestionsView';
import { SettingsView } from './components/SettingsView';
import { BookList } from './components/books/BookList';
import { BookViewer } from './components/books/BookViewer';
import { OnboardingModal } from './components/OnboardingModal';
import { ScheduledView } from './components/ScheduledView';
import { CallHistoryView } from './components/CallHistoryView';
import { Toaster } from 'react-hot-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { Sidebar } from './components/Sidebar';
import { User } from './types/user';

function App() {
  const [user, loading] = useAuthState(auth);
  const [userData, setUserData] = useState<User | null>(null);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);

  React.useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setIsCheckingOnboarding(false);
        return;
      }

      setIsCheckingOnboarding(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as User;
          setUserData(data);
          setShowOnboarding(!data.isOnboarded);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const handleSettingsUpdate = () => {
    setSidebarRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster position="top-right" />
        <Router>
          <Routes>
            <Route path="/signin" element={<AuthForm />} />
            <Route path="/signup" element={<AuthForm isSignUp />} />
            <Route path="*" element={<Navigate to="/signin" />} />
          </Routes>
        </Router>
      </>
    );
  }

  if (isCheckingOnboarding) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar 
            userName={userData?.name || user.email?.split('@')[0] || 'User'} 
            collectionName="Family Collection"
            profileImageUrl={userData?.profileImageUrl || user.photoURL}
            refreshTrigger={sidebarRefreshTrigger}
          />
          <main className="flex-1 ml-64">
            <Routes>
              <Route path="/stories" element={<Dashboard />} />
              <Route path="/stories/:id" element={<StoryView />} />
              <Route path="/prompts" element={<PromptsView />} />
              <Route path="/scheduled" element={<ScheduledView />} />
              <Route path="/questions" element={<QuestionsView />} />
              <Route path="/settings" element={<SettingsView onSettingsUpdate={handleSettingsUpdate} />} />
              <Route path="/books" element={<BookList />} />
              <Route path="/books/:id" element={<BookViewer />} />
              <Route path="/call-history" element={<CallHistoryView />} />
              <Route path="/" element={<Navigate to="/stories" />} />
            </Routes>
          </main>
        </div>
      </Router>

      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
    </>
  );
}

export default App;