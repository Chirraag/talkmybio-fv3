export interface AIPreferences {
  voice: {
    voice_id: string;
    voice_type: string;
    standard_voice_type: string;
    voice_name: string;
    provider: string;
    accent: string;
    gender: string;
    age: string;
    avatar_url: string;
    preview_audio_url: string;
  };
  followUpIntensity: 'fewer' | 'balanced' | 'more';
}

export interface StoryPreferences {
  narrativeStyle: 'first-person' | 'third-person';
  lengthPreference: 'shorter' | 'balanced' | 'longer';
  detailRichness: 'fewer' | 'balanced' | 'more';
}

export interface User {
  id: string;
  name: string;
  email: string;
  profileImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  llmIds: string[];
  agentIds: string[];
  lastLoginAt?: Date;
  isOnboarded: boolean;
  onboardingStoryId?: string;
  aiPreferences?: AIPreferences;
  storyPreferences?: StoryPreferences;
}

export type CreateUserData = Omit<User, 'id' | 'updatedAt' | 'lastLoginAt'>;