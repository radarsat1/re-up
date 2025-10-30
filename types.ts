export interface Section {
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface StudyPlan {
  id: string; // Add unique ID for the plan
  topic: string;
  summary: string;
  sections: Section[];
}

export interface Question {
  question: string;
  topic: string;
}

export interface GradedAnswer {
  question: string;
  userAnswer: string;
  grade: string;
  summary: string;
  keyConceptsMissed: string[];
  suggestedResearchLinks: string[];
}

export interface SessionRecord {
  id: string;
  planId: string; // Link session to a specific study plan
  topic: string;
  section: Section;
  questions: Question[];
  userAnswers: string[];
  gradedAnswers: GradedAnswer[];
  date: string;
  status: 'in-progress' | 'completed';
}
