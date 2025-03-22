import { Timestamp } from 'firebase/firestore';

export interface Chapter {
  id: string;
  title: string;
  imageUrl: string;
  story: string;
  createdAt: Timestamp;
}

export interface Book {
  id: string;
  title: string;
  imageUrl: string;
  status: 'in_progress' | 'completed';
  createdAt: Timestamp;
  chapters: Chapter[];
}