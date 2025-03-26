import { Timestamp } from 'firebase/firestore';

interface Session {
  callId: string;
  transcript: string | null;
  transcript_object: Array<{
    role: string;
    content: string;
    words: Array<{
      word: string;
      start: number;
      end: number;
    }>;
    metadata?: {
      response_id: number;
    };
  }> | null;
  creationTime: Timestamp;
  recording_url: string | null;
  videoUrl: string | null;
  updated: boolean;
}

interface NextSchedule {
  dateTime: Timestamp;
  phoneNumber: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface Story {
  id: string;
  userId: string;
  categoryId: string;
  title: string | null;
  description: string | null;
  storyText: string | null;
  imageUrl?: string;
  creationTime: Timestamp;
  lastUpdationTime: Timestamp;
  initialQuestion: string;
  sessions: { [key: string]: Session };
  storySummary: string | null;
  nextSchedule?: NextSchedule;
}