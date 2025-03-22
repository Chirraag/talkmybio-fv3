import { Timestamp } from 'firebase/firestore';

interface TranscriptMessage {
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
}

export interface StorySession {
  callId: string | null;
  transcript: string | null;
  transcript_object: TranscriptMessage[] | null;
  creationTime: Timestamp;
  recording_url: string | null;
  videoUrl: string | null;
  updated: boolean;
}

export interface Story {
  id: string;
  userId: string;
  categoryId: string;
  title: string | null;
  description: string | null;
  storyText: string | null;
  imageUrl: string | null;
  creationTime: Timestamp;
  lastUpdationTime: Timestamp;
  initialQuestion: string;
  sessions: Record<string, StorySession>;
  storySummary: string | null;
}