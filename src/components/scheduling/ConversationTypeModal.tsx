import React from 'react';
import { Clock, Calendar, Video } from 'lucide-react';
import { Category } from '../../types/category';

interface ConversationTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category;
  question: string;
  onStartNow: () => void;
  onSchedule: () => void;
  onBack: () => void;
}

export const ConversationTypeModal: React.FC<ConversationTypeModalProps> = ({
  isOpen,
  onClose,
  category,
  question,
  onStartNow,
  onSchedule,
  onBack,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">
            When would you like to have this conversation?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button
              onClick={onStartNow}
              className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:border-orange-500 transition-colors group"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600">
                Start Now
              </h3>
              <p className="text-gray-600 mb-4">
                Begin your conversation immediately
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <Video className="w-4 h-4 mr-2" />
                Have a face-to-face conversation with your AI interviewer
              </div>
            </button>

            <button
              onClick={onSchedule}
              className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:border-orange-500 transition-colors group"
            >
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-orange-600">
                Schedule for Later
              </h3>
              <p className="text-gray-600 mb-4">
                Choose a convenient time for a phone call
              </p>
              <p className="text-sm text-gray-500">
                You'll receive a call from our AI interviewer at your scheduled time
              </p>
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Starting Question:</h4>
            <p className="text-gray-600">{question}</p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onBack}
              className="px-4 py-2 text-gray-700 hover:text-gray-900"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};