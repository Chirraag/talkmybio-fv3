import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, Phone } from 'lucide-react';
import {
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  addDoc,
  collection,
} from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Category } from '../../types/category';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface SchedulingModalProps {
  isOpen: boolean;
  category: Category;
  question: string;
  onBack: () => void;
  onClose: () => void;
  existingStoryId?: string;
}

export const SchedulingModal: React.FC<SchedulingModalProps> = ({
  isOpen,
  category,
  question,
  onBack,
  onClose,
  existingStoryId,
}) => {
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadExistingSchedule = async () => {
      if (!existingStoryId) return;

      try {
        const storyDoc = await doc(db, 'stories', existingStoryId);
        const storySnapshot = await getDoc(storyDoc);

        if (storySnapshot.exists()) {
          const storyData = storySnapshot.data();
          if (storyData.nextSchedule) {
            const scheduledDate = storyData.nextSchedule.dateTime.toDate();
            setDate(format(scheduledDate, 'yyyy-MM-dd'));
            setTime(format(scheduledDate, 'HH:mm'));
            setPhoneNumber(storyData.nextSchedule.phoneNumber);
          }
        }
      } catch (error) {
        console.error('Error loading existing schedule:', error);
        toast.error('Failed to load existing schedule');
      }
    };

    if (isOpen) {
      loadExistingSchedule();
    }
  }, [isOpen, existingStoryId]);

  if (!isOpen) return null;

  const handleSchedule = async () => {
    if (!auth.currentUser) {
      toast.error('You must be logged in to schedule a conversation');
      return;
    }

    if (!date || !time) {
      toast.error('Please select both date and time');
      return;
    }

    if (!phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }

    const scheduledDateTime = new Date(`${date}T${time}`);
    if (scheduledDateTime < new Date()) {
      toast.error('Please select a future date and time');
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingStoryId) {
        // Update existing story
        await updateDoc(doc(db, 'stories', existingStoryId), {
          nextSchedule: {
            dateTime: scheduledDateTime,
            phoneNumber,
            status: 'scheduled',
          },
          lastUpdationTime: serverTimestamp(),
        });
        toast.success('Schedule updated successfully!');
      } else {
        // Create new story
        await addDoc(collection(db, 'stories'), {
          userId: auth.currentUser.uid,
          categoryId: category.id,
          title: null,
          description: null,
          storyText: null,
          creationTime: serverTimestamp(),
          lastUpdationTime: serverTimestamp(),
          initialQuestion: question,
          isOnboardingStory: false,
          sessions: {},
          storySummary: null,
          nextSchedule: {
            dateTime: scheduledDateTime,
            phoneNumber,
            status: 'scheduled',
          },
        });
        toast.success('Conversation scheduled successfully!');
      }
      onClose();
    } catch (error) {
      console.error('Error scheduling conversation:', error);
      toast.error('Failed to schedule conversation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-8">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-500" />
            </button>
            <h2 className="text-2xl font-semibold text-gray-900">
              {existingStoryId ? 'Edit Schedule' : 'Schedule Phone Call'}
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline-block mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1 (555) 555-5555"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
              />
              <p className="mt-2 text-sm text-gray-500">
                You'll receive a call from our AI interviewer at your scheduled
                time
              </p>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Choose Date & Time
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline-block mr-2" />
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline-block mr-2" />
                    Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
                  />
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <h4 className="font-medium text-orange-800 mb-2">
                Starting Question
              </h4>
              <p className="text-orange-700">{question}</p>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                onClick={onBack}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Back
              </button>
              <button
                onClick={handleSchedule}
                disabled={isSubmitting}
                className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-lg font-medium"
              >
                {isSubmitting
                  ? 'Saving...'
                  : existingStoryId
                  ? 'Update Schedule'
                  : 'Confirm Schedule'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
