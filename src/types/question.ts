export interface UpcomingQuestion {
  id: string;
  userId: string;
  categoryId: string;
  categoryTitle: string;
  question: string;
  createdAt: Date;
}