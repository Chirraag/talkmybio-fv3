import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Book, Settings, Package, HelpCircle, LogOut, Calendar, History } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, storage } from '../lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

interface SidebarProps {
  userName: string;
  collectionName: string;
  profileImageUrl?: string;
  refreshTrigger?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  userName, 
  collectionName, 
  profileImageUrl,
  refreshTrigger = 0
}) => {
  const navigate = useNavigate();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadProfileImage = async () => {
      if (!profileImageUrl) {
        console.log('No profile image URL provided');
        return;
      }

      try {
        console.log('Attempting to load profile image:', profileImageUrl);
        
        setImageError(false);

        if (profileImageUrl.startsWith('http')) {
          console.log('Using direct URL:', profileImageUrl);
          setImageUrl(profileImageUrl);
          return;
        }

        console.log('Getting download URL for storage path:', profileImageUrl);
        const storageRef = ref(storage, `profile-images/${profileImageUrl}`);
        const url = await getDownloadURL(storageRef);
        console.log('Successfully got download URL:', url);
        setImageUrl(url);
      } catch (error) {
        console.error('Error loading profile image:', error);
        setImageError(true);
        setImageUrl(null);
      }
    };

    loadProfileImage();
  }, [profileImageUrl, refreshTrigger]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="w-64 bg-white h-screen fixed left-0 top-0 border-r border-gray-200">
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-6">
          {!imageError && imageUrl ? (
            <img
              src={imageUrl}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                console.error('Image failed to load:', e);
                setImageError(true);
                setImageUrl(null);
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white font-semibold">{userName[0]?.toUpperCase() || '?'}</span>
            </div>
          )}
          <div>
            <h2 className="font-semibold text-gray-900">{userName}'s Stories</h2>
            <p className="text-sm text-gray-500">{collectionName}</p>
          </div>
        </div>

        <nav className="space-y-1">
          <NavLink
            to="/stories"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Book className="w-5 h-5" />
            <span>Stories</span>
          </NavLink>

          <NavLink
            to="/questions"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <HelpCircle className="w-5 h-5" />
            <span>Questions</span>
          </NavLink>

          <NavLink
            to="/scheduled"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Calendar className="w-5 h-5" />
            <span>Scheduled</span>
          </NavLink>

          <NavLink
            to="/call-history"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <History className="w-5 h-5" />
            <span>Call History</span>
          </NavLink>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </NavLink>

          <NavLink
            to="/books"
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`
            }
          >
            <Package className="w-5 h-5" />
            <span>Books</span>
          </NavLink>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-3 py-2 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};