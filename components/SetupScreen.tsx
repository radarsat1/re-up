
import React, { useState } from 'react';
import LoadingSpinner from './icons/LoadingSpinner';
import { StudyPlan, SessionRecord } from '../types';

interface SetupScreenProps {
  studyPlans: StudyPlan[];
  onSelectPlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
  onStart: (topic: string, context: string) => void;
  loading: boolean;
  sessionHistory: SessionRecord[];
}

const gradeValueMapping: { [key: string]: number } = {
  'A+': 4.3, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'D-': 0.7,
  'F': 0,
};

const getNumericGrade = (grade: string): number => {
  return gradeValueMapping[grade.toUpperCase()] ?? 0;
};

const getLetterGrade = (value: number | null): string => {
  if (value === null) return 'N/A';
  if (value >= 4.15) return 'A+';
  if (value >= 3.85) return 'A';
  if (value >= 3.5) return 'A-';
  if (value >= 3.15) return 'B+';
  if (value >= 2.85) return 'B';
  if (value >= 2.5) return 'B-';
  if (value >= 2.15) return 'C+';
  if (value >= 1.85) return 'C';
  if (value >= 1.5) return 'C-';
  if (value >= 1.15) return 'D+';
  if (value >= 0.85) return 'D';
  if (value >= 0.5) return 'D-';
  return 'F';
};

const getGradeColorClass = (grade: string) => {
  if (grade.startsWith('A')) return 'bg-green-500';
  if (grade.startsWith('B')) return 'bg-yellow-500';
  if (grade.startsWith('C')) return 'bg-orange-500';
  return 'bg-red-500';
}

const SetupScreen: React.FC<SetupScreenProps> = ({ studyPlans, onSelectPlan, onDeletePlan, onStart, loading, sessionHistory }) => {
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onStart(topic, context);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in relative">
      <div className="w-full max-w-4xl mx-auto space-y-12">
        {/* Existing Plans List */}
        <div className="animate-slide-in-up">
          <h2 className="text-2xl font-semibold text-slate-300 border-b border-slate-700 pb-2 mb-6">Your Study Plans</h2>
          {studyPlans.length > 0 ? (
            <div className="space-y-4">
              {studyPlans.map((plan) => {
                const planHistory = sessionHistory.filter(s => s.planId === plan.id);
                const attemptedSections = new Set(planHistory.map(s => s.section.title));
                const progress = plan.sections.length > 0 ? (attemptedSections.size / plan.sections.length) * 100 : 0;

                let overallGrade: string | null = null;
                if (planHistory.length > 0) {
                    const sectionScores = plan.sections
                        .map(section => {
                            const sectionHistory = planHistory.filter(s => s.section.title === section.title);
                            if (sectionHistory.length === 0) return null;
                            const sessionAvgScores = sectionHistory.map(s => {
                                const total = s.gradedAnswers.reduce((acc, curr) => acc + getNumericGrade(curr.grade), 0);
                                return s.gradedAnswers.length > 0 ? total / s.gradedAnswers.length : 0;
                            });
                            return sessionAvgScores.reduce((acc, curr) => acc + curr, 0) / sessionAvgScores.length;
                        })
                        .filter(score => score !== null) as number[];
                    
                    if(sectionScores.length > 0) {
                        const avgPlanScore = sectionScores.reduce((acc, curr) => acc + curr, 0) / sectionScores.length;
                        overallGrade = getLetterGrade(avgPlanScore);
                    }
                }

                return (
                <div key={plan.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700 animate-slide-in-up space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-lg text-white">{plan.topic}</h3>
                      <p className="text-sm text-slate-400 line-clamp-1">{plan.summary}</p>
                    </div>
                    {overallGrade && (
                        <div className={`text-sm font-bold text-white px-3 py-1 rounded-full ${getGradeColorClass(overallGrade)}`}>
                            {overallGrade}
                        </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onSelectPlan(plan.id)}
                      className="px-4 py-2 text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-indigo-700 transition-colors"
                    >
                      View Plan
                    </button>
                    <button
                      onClick={() => onDeletePlan(plan.id)}
                      className="px-3 py-2 text-sm rounded-md hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Delete plan"
                    >
                      &#x1F5D1;
                    </button>
                  </div>

                  <div>
                    <div className="w-full bg-slate-700 rounded-full h-2.5">
                      <div className="bg-brand-secondary h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 text-right">{attemptedSections.size} of {plan.sections.length} topics started</p>
                  </div>
                </div>
                )})}
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-slate-800/50 rounded-lg border border-dashed border-slate-700">
              <p className="text-slate-400">No study plans yet. Create one below to get started!</p>
            </div>
          )}
        </div>

        {/* Create New Plan Form */}
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
            <h2 className="text-2xl font-semibold text-center text-slate-300 mb-6">Create a New Plan</h2>
            <form onSubmit={handleStart} className="space-y-6">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-slate-400">
                  Main Topic
                </label>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                  placeholder="e.g., Quantum Computing, React.js Hooks, Culinary Arts"
                  required
                />
              </div>
              <div>
                <label htmlFor="context" className="block text-sm font-medium text-slate-400">
                  Context (Optional)
                </label>
                <textarea
                  id="context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={4}
                  className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                  placeholder="Paste a job description or provide specific areas you want to focus on..."
                />
              </div>
              <button
                type="submit"
                disabled={!topic.trim() || loading}
                className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-primary disabled:bg-slate-600 disabled:cursor-not-allowed"
              >
                {loading ? <LoadingSpinner /> : 'Generate Study Plan'}
              </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
