import React, { useState } from 'react';
import { User } from '../../types/user';
import { Camera, Loader2, Check, UserIcon } from 'lucide-react';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface AccountSettingsProps {
  userData: User;
  onSettingsUpdate: () => void;
}

export const AccountSettings: React.FC<AccountSettingsProps> = ({ userData, onSettingsUpdate }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(userData.profileImageUrl || null);
  const [isSaving, setIsSaving] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Image size must be less than 2MB');
        return;
      }
      setProfileImage(file);
      setProfileImageUrl(URL.createObjectURL(file));
    }
  };

  const uploadProfileImage = async (): Promise<string | null> => {
    if (!profileImage || !auth.currentUser) return null;

    const storageRef = ref(storage, `profile-images/${auth.currentUser.uid}`);
    await uploadBytes(storageRef, profileImage);
    return getDownloadURL(storageRef);
  };

  const verifyCurrentPassword = async (): Promise<boolean> => {
    if (!auth.currentUser?.email || !currentPassword) return false;
    
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      return true;
    } catch (error: any) {
      console.error('Password verification error:', error);
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Current password is incorrect');
      } else {
        toast.error('Failed to verify password. Please try again.');
      }
      return false;
    }
  };

  const handleSaveChanges = async () => {
    if (!auth.currentUser) return;

    setIsSaving(true);
    try {
      // Handle password change if attempted
      if (newPassword || confirmPassword || currentPassword) {
        // First check if current password is provided
        if (!currentPassword) {
          toast.error('Current password is required');
          setIsSaving(false);
          return;
        }

        // Verify current password before proceeding
        const isCurrentPasswordValid = await verifyCurrentPassword();
        if (!isCurrentPasswordValid) {
          setIsSaving(false);
          return;
        }

        // Only proceed with new password validation if current password is correct
        if (newPassword !== confirmPassword) {
          toast.error('New passwords do not match');
          setIsSaving(false);
          return;
        }

        if (newPassword.length < 6) {
          toast.error('New password must be at least 6 characters');
          setIsSaving(false);
          return;
        }

        // Update password
        try {
          await updatePassword(auth.currentUser, newPassword);
          toast.success('Password updated successfully');
          
          // Clear password fields after successful update
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } catch (error) {
          console.error('Password update error:', error);
          toast.error('Failed to update password. Please try again.');
          setIsSaving(false);
          return;
        }
      }

      // Handle profile image update
      if (profileImage) {
        const newImageUrl = await uploadProfileImage();
        
        // Update Firebase Auth profile
        await updateProfile(auth.currentUser, {
          photoURL: newImageUrl
        });
        
        // Update Firestore user document
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          profileImageUrl: newImageUrl,
          updatedAt: new Date()
        });
        
        // Trigger sidebar refresh
        onSettingsUpdate();
        
        toast.success('Profile image updated successfully');
      }

    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Settings</h2>
        <p className="text-gray-600 mb-6">
          Manage your personal information and account security
        </p>

        <div className="mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={userData.name}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="profile-image"
              />
              <label
                htmlFor="profile-image"
                className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-50"
              >
                <Camera className="w-4 h-4 text-gray-600" />
              </label>
            </div>
            <div>
              <p className="text-sm text-gray-500">
                JPG, GIF or PNG. Max size 2MB.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              value={userData.name}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-orange-500 focus:ring-orange-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={userData.email}
              disabled
              className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-orange-500 focus:ring-orange-500 cursor-not-allowed"
            />
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Change Password
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};