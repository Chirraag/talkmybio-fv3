import { Timestamp } from 'firebase/firestore';

export interface StorySession {
  callId: string;
  creationTime: Timestamp;
  transcript?: string;
  transcript_object?: Array<{
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
  }>;
  recording_url?: string;
  videoUrl?: string;
  videoChunkUrl?: string;
  videoComplete?: boolean;
  updated?: boolean;
}

export interface Story {
  id: string;
  userId: string;
  categoryId: string;
  title: string | null;
  description: string | null;
  storyText: string | null;
  creationTime: Timestamp;
  lastUpdationTime: Timestamp;
  initialQuestion: string;
  sessions: { [key: string]: StorySession };
  storySummary: string | null;
  imageUrl?: string;
  isOnboardingStory?: boolean;
}