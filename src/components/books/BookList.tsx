import React, { useState, useEffect } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../lib/firebase';
import { Book } from '../../types/book';
import { PlusCircle, Download, Clock, Sparkles, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const CREATION_MESSAGES = [
  "Gathering your life stories...",
  "Weaving memories together...",
  "Crafting your narrative...",
  "Adding finishing touches...",
  "Bringing your story to life..."
];

export const BookList: React.FC = () => {
  const [user] = useAuthState(auth);
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [creationMessage, setCreationMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBooks = async () => {
      if (!user?.uid) return;

      setIsLoading(true);
      try {
        const booksRef = collection(db, 'users', user.uid, 'books');
        const booksSnapshot = await getDocs(booksRef);
        
        const booksData = booksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Book));

        booksData.sort((a, b) => {
          const timeA = (a.createdAt as Timestamp).toMillis();
          const timeB = (b.createdAt as Timestamp).toMillis();
          return timeB - timeA;
        });

        setBooks(booksData);
      } catch (error) {
        console.error('Error fetching books:', error);
        toast.error('Failed to load books');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBooks();
  }, [user]);

  useEffect(() => {
    if (isCreating) {
      let messageIndex = 0;
      const interval = setInterval(() => {
        setCreationMessage(CREATION_MESSAGES[messageIndex]);
        messageIndex = (messageIndex + 1) % CREATION_MESSAGES.length;
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isCreating]);

  const handleCreateBook = async () => {
    if (!user?.uid) return;
    
    setIsCreating(true);
    try {
      const response = await fetch(`https://talkmybio-backend.replit.app/create-book?user_id=${user.uid}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        // Refresh the books list
        const booksRef = collection(db, 'users', user.uid, 'books');
        const booksSnapshot = await getDocs(booksRef);
        const booksData = booksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Book));
        setBooks(booksData);
        
        toast.success('Book created successfully!');
      } else {
        throw new Error('Failed to create book');
      }
    } catch (error) {
      console.error('Error creating book:', error);
      toast.error('Failed to create book');
    } finally {
      setIsCreating(false);
    }
  };

  const hasInProgressBook = books.some(book => book.status === 'in-progress');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0">
                <div className="w-full h-full animate-spin rounded-full border-4 border-orange-200 border-t-orange-500"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-orange-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Creating Your Book</h2>
            <p className="text-gray-600 animate-pulse">{creationMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Your Books</h1>
            <p className="text-gray-600 mt-1">
              Create and manage your collection of stories
            </p>
          </div>
          <button
            onClick={handleCreateBook}
            disabled={hasInProgressBook}
            className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Create New Book
          </button>
        </div>

        {hasInProgressBook ? (
          <div className="mb-12">
            <div className="bg-orange-50 rounded-xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <Clock className="w-full h-full text-orange-500 animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Book in Progress</h2>
              <p className="text-gray-600 mb-4">
                Please wait while we complete generating your current book
              </p>
            </div>
          </div>
        ) : null}

        {books.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No books yet</h3>
            <p className="text-gray-600 mb-6">
              Start creating your first book by clicking the "Create New Book" button
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {books.map((book) => (
              <div
                key={book.id}
                className={`group relative cursor-pointer ${book.status === 'in-progress' ? 'pointer-events-none' : ''}`}
                onClick={() => book.status !== 'in-progress' && navigate(`/books/${book.id}`)}
              >
                {/* Book Container */}
                <div className="relative w-full aspect-[3/4] bg-white rounded-lg shadow-md transform transition-transform group-hover:-translate-y-2">
                  {/* Book Cover */}
                  <div className="absolute inset-0 rounded-lg overflow-hidden">
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${book.imageUrl})` }}
                    >
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent">
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <h3 className="text-2xl font-bold text-white mb-2 font-serif">
                            {book.title}
                          </h3>
                          <div className="flex items-center justify-between">
                            <div className="text-white/80 text-sm">
                              {format(book.createdAt.toDate(), 'MMM d, yyyy')}
                            </div>
                            {book.status === 'in-progress' && (
                              <span className="px-2 py-1 bg-orange-500/20 backdrop-blur-sm text-white rounded-full text-sm flex items-center">
                                <Clock className="w-4 h-4 mr-1 animate-spin" />
                                In Progress
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Book Spine Effect */}
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-black/30 to-transparent rounded-l-lg"></div>

                  {/* Book Pages Effect */}
                  <div className="absolute right-0 top-2 bottom-2 w-2 bg-gray-100 rounded-r transform translate-x-[1px]">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute inset-0 bg-gray-100 rounded-r"
                        style={{
                          transform: `translateX(${i * 0.5}px)`,
                          boxShadow: 'inset -1px 0 rgba(0,0,0,0.05)'
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};