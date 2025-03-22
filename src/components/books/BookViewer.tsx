import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Book } from '../../types/book';
import { ArrowLeft, Share, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { ThreeDBookIcon } from './ThreeDBookIcon';
import { useSpring, animated } from '@react-spring/web';
import { getImageWithToken } from '../../lib/storage';

interface Page {
  type: 'cover' | 'toc' | 'chapter' | 'content';
  content: string;
  chapterIndex?: number;
  title?: string;
  imageUrl?: string;
}

export const BookViewer: React.FC = () => {
  const [book, setBook] = useState<Book | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isBookOpen, setIsBookOpen] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const containerRef = useRef<HTMLDivElement>(null);

  const [{ x }, api] = useSpring(() => ({
    x: 0,
    config: { mass: 1, tension: 280, friction: 60 }
  }));

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentPage < pages.length - 2) {
        nextPage();
      } else if (e.key === 'ArrowLeft' && currentPage > 0) {
        prevPage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, pages.length]);

  useEffect(() => {
    const fetchBook = async () => {
      if (!id) {
        toast.error('Book ID not found');
        navigate('/books');
        return;
      }
      try {
        const bookDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid, 'books', id));
        if (!bookDoc.exists()) {
          toast.error('Book not found');
          navigate('/books');
          return;
        }
        const bookData = { id: bookDoc.id, ...bookDoc.data() } as Book;
        setBook(bookData);
        generatePages(bookData);
      } catch (error) {
        console.error('Error fetching book:', error);
        toast.error('Failed to load book');
        navigate('/books');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBook();
  }, [id, navigate]);

  const generatePages = (book: Book) => {
    const allPages: Page[] = [];

    // Cover page
    allPages.push({
      type: 'cover',
      content: book.title,
      imageUrl: book.imageUrl
    });

    // Table of contents
    allPages.push({
      type: 'toc',
      content: 'Table of Contents'
    });

    // Chapters
    book.chapters.forEach((chapter, chapterIndex) => {
      // Chapter cover and content (as a spread - two pages)
      allPages.push({
        type: 'chapter',
        content: chapter.title,
        imageUrl: chapter.imageUrl,
        chapterIndex
      });
      
      // Chapter content on the right page
      allPages.push({
        type: 'content',
        content: chapter.story,
        chapterIndex,
        title: chapter.title
      });
    });

    setPages(allPages);
  };

  const navigateToChapter = (chapterIndex: number) => {
    const chapterPage = pages.findIndex(page => 
      page.type === 'chapter' && page.chapterIndex === chapterIndex
    );
    
    if (chapterPage >= 0) {
      setCurrentPage(chapterPage);
      api.start({ x: 0 });
    }
  };

  const generatePDF = async () => {
    if (!book) return;

    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      });

      pdf.setFont('serif');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);

      const loadImage = async (url: string): Promise<string> => {
        try {
          if (url.includes('firebasestorage.googleapis.com')) {
            const path = url.split('/o/')[1].split('?')[0];
            url = await getImageWithToken(decodeURIComponent(path));
          }
          const response = await fetch(url);
          if (!response.ok) throw new Error('Failed to fetch image');
          const blob = await response.blob();
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Error loading image:', error);
          throw error;
        }
      };

      // Cover page
      if (book.imageUrl) {
        const coverImage = await loadImage(book.imageUrl);
        pdf.addImage(coverImage, 'JPEG', 0, 0, pageWidth, pageHeight);
        
        // Add gradient overlay
        const steps = 20;
        for (let i = 0; i < steps; i++) {
          const y = pageHeight * (1 - (i / steps));
          const opacity = 0.8 - (i * 0.04);
          pdf.setFillColor(0, 0, 0);
          pdf.setGState(new pdf.GState({ opacity }));
          pdf.rect(0, y, pageWidth, pageHeight / steps, 'F');
        }

        // Add title and date
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(36);
        pdf.text(book.title, margin, pageHeight - 40);
        pdf.setFontSize(14);
        pdf.text(
          `Created on ${format(book.createdAt.toDate(), 'MMMM d, yyyy')}`,
          margin,
          pageHeight - 25
        );
      }

      // Table of Contents
      pdf.addPage();
      pdf.setFillColor(252, 249, 242);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setTextColor(51, 51, 51);
      pdf.setFontSize(30);
      pdf.text('Contents', margin, margin + 10);

      book.chapters.forEach((chapter, index) => {
        const y = margin + 40 + (index * 12);
        pdf.setFontSize(12);
        pdf.setTextColor(249, 115, 22);
        pdf.text(`${index + 1}`, margin, y);
        pdf.setTextColor(51, 51, 51);
        pdf.text(chapter.title, margin + 15, y);
      });

      // Chapters
      for (const chapter of book.chapters) {
        // Chapter cover
        pdf.addPage();
        if (chapter.imageUrl) {
          const chapterImage = await loadImage(chapter.imageUrl);
          pdf.addImage(chapterImage, 'JPEG', 0, 0, pageWidth, pageHeight);
          
          // Add gradient overlay
          const steps = 20;
          for (let i = 0; i < steps; i++) {
            const y = pageHeight * (1 - (i / steps));
            const opacity = 0.8 - (i * 0.04);
            pdf.setFillColor(0, 0, 0);
            pdf.setGState(new pdf.GState({ opacity }));
            pdf.rect(0, y, pageWidth, pageHeight / steps, 'F');
          }

          // Add chapter title
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(30);
          const titleY = pageHeight / 2;
          pdf.text(chapter.title, pageWidth / 2, titleY, { align: 'center' });
          
          // Decorative line
          pdf.setDrawColor(249, 115, 22);
          pdf.setLineWidth(1);
          const lineWidth = 40;
          pdf.line(
            (pageWidth - lineWidth) / 2,
            titleY + 10,
            (pageWidth + lineWidth) / 2,
            titleY + 10
          );
        }

        // Chapter content
        pdf.addPage();
        pdf.setFillColor(252, 249, 242);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');

        // Chapter title header
        pdf.setFontSize(14);
        pdf.setTextColor(128, 128, 128);
        pdf.text(chapter.title, margin, margin);

        // Chapter content with pagination
        pdf.setTextColor(51, 51, 51);
        pdf.setFontSize(12);
        const lines = pdf.splitTextToSize(chapter.story, contentWidth);
        let currentY = margin + 20;
        const lineHeight = 7;
        const maxY = pageHeight - margin;

        for (let i = 0; i < lines.length; i++) {
          if (currentY + lineHeight > maxY) {
            pdf.addPage();
            pdf.setFillColor(252, 249, 242);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');
            currentY = margin + 15;
          }
          pdf.text(lines[i], margin, currentY);
          currentY += lineHeight;
        }
      }

      pdf.save(`${book.title}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const nextPage = () => {
    if (currentPage < pages.length - 2) {
      api.start({ x: -100, immediate: true });
      api.start({ x: 0 });
      setCurrentPage(prev => prev + 2);
    }
  };

  const prevPage = () => {
    if (currentPage > 0) {
      api.start({ x: 100, immediate: true });
      api.start({ x: 0 });
      setCurrentPage(prev => prev - 2);
    }
  };

  const renderPage = (page: Page, isRightPage: boolean) => {
    switch (page.type) {
      case 'cover':
        return (
          <div className="book-page">
            <div
              className="w-full h-full bg-cover bg-center rounded-lg"
              style={{ backgroundImage: `url(${page.imageUrl})` }}
            >
              <div className="w-full h-full bg-gradient-to-t from-black via-black/50 to-transparent p-8 flex flex-col justify-end rounded-lg">
                <h1 className="text-4xl font-bold text-white mb-4 font-serif">
                  {page.content}
                </h1>
                {book && (
                  <p className="text-white/80">
                    Created on {format(book.createdAt.toDate(), 'MMMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 'toc':
        return (
          <div className="book-page bg-[#fcf9f2] rounded-lg p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 font-serif">Contents</h2>
            {book && (
              <div className="space-y-2">
                {book.chapters.map((chapter, index) => (
                  <button
                    key={chapter.id}
                    onClick={() => navigateToChapter(index)}
                    className="flex items-center group w-full text-left hover:bg-orange-50 p-2 rounded transition-colors"
                  >
                    <span className="text-orange-500 font-medium mr-4 font-serif">
                      {index + 1}
                    </span>
                    <span className="text-gray-900 group-hover:text-orange-500 transition-colors font-serif">
                      {chapter.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'chapter':
        return (
          <div className="book-page bg-[#fcf9f2] rounded-lg">
            <div
              className="w-full h-full bg-cover bg-center"
              style={{ backgroundImage: `url(${page.imageUrl})` }}
            >
              <div className="w-full h-full bg-black bg-opacity-40 p-12 flex flex-col justify-center items-center">
                <h2 className="text-3xl font-bold text-white mb-4 font-serif text-center">
                  {page.content}
                </h2>
                <div className="w-16 h-1 bg-orange-500 rounded-full" />
              </div>
            </div>
          </div>
        );

      case 'content':
        return (
          <div className="book-page bg-[#fcf9f2] rounded-lg p-8 flex flex-col h-full">
            <div className="text-sm font-medium text-gray-500 mb-4 font-serif">
              {page.title}
            </div>
            <div className="flex-1 overflow-y-auto pr-4 font-serif text-sm leading-[1.8] tracking-wide custom-scrollbar">
              {page.content}
            </div>
            <div className="text-sm text-gray-500 text-center mt-4 pt-2 border-t">
              {currentPage + (isRightPage ? 1 : 0) + 1}
            </div>
          </div>
        );
    }
  };

  if (isLoading || !book) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!isBookOpen) {
    return (
      <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center">
        <ThreeDBookIcon
          imageUrl={book.imageUrl}
          title={book.title}
          onOpen={() => setIsBookOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <button
            onClick={() => setIsBookOpen(false)}
            className="flex items-center text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Close Book
          </button>
          <button
            onClick={generatePDF}
            disabled={isGeneratingPDF}
            className="flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            <Download className="w-5 h-5 mr-2" />
            {isGeneratingPDF ? 'Generating PDF...' : 'Download PDF'}
          </button>
        </div>
        
        <div className="relative" ref={containerRef}>
          <animated.div
            style={{
              transform: x.to(x => `translateX(${x}%)`),
            }}
            className="bg-white rounded-lg shadow-2xl h-[80vh] overflow-hidden max-w-5xl mx-auto relative"
          >
            <div className="grid grid-cols-2 gap-0 h-full">
              {renderPage(pages[currentPage], false)}
              {pages[currentPage + 1] && renderPage(pages[currentPage + 1], true)}
            </div>

            <button
              onClick={prevPage}
              disabled={currentPage === 0}
              className="absolute left-0 top-0 bottom-0 w-24 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-start pl-4"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-8 h-8 text-gray-500" />
            </button>

            <button
              onClick={nextPage}
              disabled={currentPage >= pages.length - 2}
              className="absolute right-0 top-0 bottom-0 w-24 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-end pr-4"
              aria-label="Next page"
            >
              <ChevronRight className="w-8 h-8 text-gray-500" />
            </button>
          </animated.div>

          <div className="text-center mt-4 text-gray-400">
            Pages {currentPage + 1}-{Math.min(currentPage + 2, pages.length)} of {pages.length}
          </div>
        </div>
      </div>
    </div>
  );
};