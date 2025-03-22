import React, { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types/user';
import { 
  User as UserIcon,
  Bot, 
  BookOpen, 
  Bell, 
  Lock, 
  HardDrive, 
  CreditCard,
} from 'lucide-react';
import { AccountSettings } from './settings/AccountSettings';
import { AISettings } from './settings/AISettings';
import { StorySettings } from './settings/StorySettings';

type SettingsTab = 'account' | 'ai' | 'story' | 'notifications' | 'privacy' | 'media' | 'billing';

interface SettingsViewProps {
  onSettingsUpdate: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSettingsUpdate }) => {
  const [user] = useAuthState(auth);
  const [userData, setUserData] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserData = async () => {
    if (!user?.uid) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = {
          id: userDoc.id,
          ...userDoc.data()
        } as User;
        setUserData(data);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [user]);

  const handleSettingsUpdate = async () => {
    await fetchUserData();
    onSettingsUpdate();
  };

  if (isLoading || !userData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const tabs = [
    { id: 'account' as SettingsTab, label: 'Account', icon: UserIcon },
    { id: 'ai' as SettingsTab, label: 'AI Preferences', icon: Bot },
    { id: 'story' as SettingsTab, label: 'Story Preferences', icon: BookOpen },
    { id: 'notifications' as SettingsTab, label: 'Notifications', icon: Bell },
    { id: 'privacy' as SettingsTab, label: 'Privacy & Sharing', icon: Lock },
    { id: 'media' as SettingsTab, label: 'Media & Storage', icon: HardDrive },
    { id: 'billing' as SettingsTab, label: 'Subscription & Billing', icon: CreditCard },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'account':
        return <AccountSettings userData={userData} onSettingsUpdate={handleSettingsUpdate} />;
      case 'ai':
        return <AISettings userData={userData} onSettingsUpdate={handleSettingsUpdate} />;
      case 'story':
        return <StorySettings userData={userData} onSettingsUpdate={handleSettingsUpdate} />;
      default:
        return (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">{tabs.find(t => t.id === activeTab)?.label}</h2>
            <p className="text-gray-600">Coming soon!</p>
          </div>
        );
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">
            Manage your account and preferences
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-gray-200 p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-orange-50 text-orange-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};