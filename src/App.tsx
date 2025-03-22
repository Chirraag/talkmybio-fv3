import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthForm } from './components/AuthForm';
import { Dashboard } from './components/Dashboard';
import { StoryView } from './components/StoryView';
import { PromptsView } from './components/PromptsView';
import { SettingsView } from './components/SettingsView';
import { BookList } from './components/books/BookList';
import { BookViewer } from './components/books/BookViewer';
import { Toaster } from 'react-hot-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './lib/firebase';
import { Sidebar } from './components/Sidebar';

function App() {
  const [user, loading] = useAuthState(auth);
  const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);

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

  return (
    <>
      <Toaster position="top-right" />
      <Router>
        <div className="flex min-h-screen bg-gray-50">
          <Sidebar 
            userName={user.displayName || user.email?.split('@')[0] || 'User'} 
            collectionName="Family Collection"
            profileImageUrl={user.photoURL}
            refreshTrigger={sidebarRefreshTrigger}
          />
          <main className="flex-1 ml-64">
            <Routes>
              <Route path="/stories" element={<Dashboard />} />
              <Route path="/stories/:id" element={<StoryView />} />
              <Route path="/prompts" element={<PromptsView />} />
              <Route path="/settings" element={<SettingsView onSettingsUpdate={handleSettingsUpdate} />} />
              <Route path="/books" element={<BookList />} />
              <Route path="/books/:id" element={<BookViewer />} />
              <Route path="/" element={<Navigate to="/stories" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </>
  );
}

export default App;