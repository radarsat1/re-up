
import { GoogleGenAI, Type } from "@google/genai";
import { StudyPlan, Question, GradedAnswer } from './types';

const studyPlanSchema = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: 'The main topic of the study plan.' },
    summary: { type: Type.STRING, description: 'A brief, one-paragraph summary of the study plan.' },
    sections: {
      type: Type.ARRAY,
      description: 'An array of study sections, ordered logically.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'The title of this section.' },
          description: { type: Type.STRING, description: 'A short description of what this section covers.' },
          difficulty: { type: Type.STRING, description: 'Difficulty level: Beginner, Intermediate, or Advanced.' },
        },
        required: ['title', 'description', 'difficulty'],
      },
    },
  },
  required: ['topic', 'summary', 'sections'],
};

const questionsSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING, description: 'The interview question text.' },
      topic: { type: Type.STRING, description: 'The specific topic this question covers.' },
    },
    required: ['question', 'topic'],
  },
};

const gradingSchema = {
  type: Type.OBJECT,
  properties: {
    grade: { type: Type.STRING, description: "A grade for the user's answer (e.g., A+, B, C-)." },
    summary: { type: Type.STRING, description: "A concise summary of the feedback, highlighting strengths and weaknesses." },
    keyConceptsMissed: {
      type: Type.ARRAY,
      description: "A list of key concepts the user failed to mention or got wrong.",
      items: { type: Type.STRING },
    },
    suggestedResearchLinks: {
      type: Type.ARRAY,
      description: "A list of web URLs for further reading on the missed concepts.",
      items: { type: Type.STRING },
    },
  },
  required: ['grade', 'summary', 'keyConceptsMissed', 'suggestedResearchLinks'],
};


export const generateStudyPlan = async (topic: string, context?: string): Promise<StudyPlan> => {
  // FIX: Per coding guidelines, initialize with process.env.API_KEY and remove apiKey parameter.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const prompt = `Create a detailed study plan for the topic: "${topic}". The plan should be structured for interview preparation. ${context ? `Base it on the following context/job description: ${context}` : ''} The plan must have at least 3 sections and no more than 7.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: studyPlanSchema,
      temperature: 0.5,
    },
  });

  const parsedResponse = JSON.parse(response.text);
  return parsedResponse as StudyPlan;
};

export const generateQuestions = async (sectionTitle: string, topic: string): Promise<Question[]> => {
  // FIX: Per coding guidelines, initialize with process.env.API_KEY and remove apiKey parameter.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const prompt = `Generate 5 intermediate-level interview questions about "${sectionTitle}" within the broader topic of "${topic}". The questions should require detailed, conceptual answers, not just simple definitions. Where appropriate, for scientific or mathematical topics, use LaTeX notation for formulas (e.g., \\( E = mc^2 \\)).`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: questionsSchema,
      temperature: 0.8,
    },
  });

  const parsedResponse = JSON.parse(response.text);
  return parsedResponse as Question[];
};

export const gradeAnswer = async (question: string, userAnswer: string): Promise<Omit<GradedAnswer, 'question' | 'userAnswer'>> => {
  // FIX: Per coding guidelines, initialize with process.env.API_KEY and remove apiKey parameter.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  const prompt = `As a senior interviewer, evaluate the following answer to an interview question.
  Question: "${question}"
  User's Answer: "${userAnswer}"
  Provide a grade, a constructive summary, identify key concepts the user missed, and suggest relevant research links. Be critical but fair.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: gradingSchema,
      temperature: 0.3,
    },
  });

  const parsedResponse = JSON.parse(response.text);
  return parsedResponse as Omit<GradedAnswer, 'question' | 'userAnswer'>;
};
