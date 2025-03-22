import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Category } from '../types/category';

interface QuestionModalProps {
  category: Category;
  onBack: () => void;
  onClose: () => void;
  onSelectQuestion: (question: string) => void;
}

export const QuestionModal: React.FC<QuestionModalProps> = ({
  category,
  onBack,
  onClose,
  onSelectQuestion,
}) => {
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  const handleContinue = () => {
    const finalQuestion = isCustom ? customQuestion : selectedQuestion;
    if (finalQuestion) {
      onSelectQuestion(finalQuestion);
    }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-500" />
            </button>
            <h2 className="text-2xl font-semibold text-gray-900">
              Questions about {category.title}
            </h2>
          </div>

          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="text-3xl">{decodeEmoji(category.emoji_unicode)}</div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{category.title}</h3>
                <p className="text-gray-600">{category.description}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {category.questions.map((question, index) => (
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
                    setIsCustom(false);
                  }}
                  className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-gray-900">{question}</span>
              </label>
            ))}

            <label
              className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-orange-50"
              style={{
                borderColor: isCustom ? '#f97316' : '#e5e7eb',
                backgroundColor: isCustom ? '#fff7ed' : 'white',
              }}
            >
              <input
                type="radio"
                name="question"
                checked={isCustom}
                onChange={() => {
                  setIsCustom(true);
                  setSelectedQuestion('');
                }}
                className="w-4 h-4 text-orange-500 focus:ring-orange-500"
              />
              <span className="text-gray-900">Ask your own question</span>
            </label>

            {isCustom && (
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
              onClick={handleContinue}
              disabled={!selectedQuestion && !customQuestion}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};