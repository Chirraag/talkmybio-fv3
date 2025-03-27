import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Category } from '../types/category';
import { QuestionModal } from './QuestionModal';
import { ConversationTypeModal } from './scheduling/ConversationTypeModal';
import { SchedulingModal } from './scheduling/SchedulingModal';
import { OnboardingModal } from './OnboardingModal';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSelectCategory: (category: Category, question: string) => void;
  showOnboarding: boolean;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSelectCategory,
  showOnboarding
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [showConversationTypeModal, setShowConversationTypeModal] = useState(false);
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);

  if (!isOpen) return null;

  if (showOnboarding) {
    return (
      <OnboardingModal 
        isOpen={true} 
        onClose={onClose}
      />
    );
  }

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

  const handleQuestionSelect = (question: string) => {
    setSelectedQuestion(question);
    setShowConversationTypeModal(true);
  };

  const handleStartNow = () => {
    if (selectedCategory && selectedQuestion) {
      onSelectCategory(selectedCategory, selectedQuestion);
    }
    setShowConversationTypeModal(false);
  };

  const handleSchedule = () => {
    setShowConversationTypeModal(false);
    setShowSchedulingModal(true);
  };

  const handleSchedulingComplete = () => {
    setShowSchedulingModal(false);
    onClose();
  };

  if (showConversationTypeModal && selectedCategory) {
    return (
      <ConversationTypeModal
        isOpen={showConversationTypeModal}
        onClose={() => setShowConversationTypeModal(false)}
        category={selectedCategory}
        question={selectedQuestion}
        onStartNow={handleStartNow}
        onSchedule={handleSchedule}
        onBack={() => {
          setShowConversationTypeModal(false);
          setSelectedQuestion('');
        }}
      />
    );
  }

  if (showSchedulingModal && selectedCategory) {
    return (
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
    );
  }

  if (selectedCategory) {
    return (
      <QuestionModal
        category={selectedCategory}
        onBack={() => setSelectedCategory(null)}
        onClose={onClose}
        onSelectQuestion={handleQuestionSelect}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-900">Choose a Category</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category)}
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
      </div>
    </div>
  );
};