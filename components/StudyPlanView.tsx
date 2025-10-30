
import React from 'react';
import { StudyPlan, Section, SessionRecord } from '../types';
import LoadingSpinner from './icons/LoadingSpinner';

interface StudyPlanViewProps {
  plan: StudyPlan;
  sessionHistory: SessionRecord[];
  onStartQuiz: (section: Section) => void;
  onReviewSession: (sessionId: string) => void;
  onBackToPlanList: () => void;
  loadingQuiz: boolean;
  selectedSection: Section | null;
}

const getDifficultyClass = (difficulty: 'Beginner' | 'Intermediate' | 'Advanced') => {
  switch (difficulty) {
    case 'Beginner':
      return 'bg-green-500/30 text-green-300';
    case 'Intermediate':
      return 'bg-yellow-500/30 text-yellow-300';
    case 'Advanced':
      return 'bg-red-500/30 text-red-300';
  }
};

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

const getAvgGrade = (gradedAnswers: SessionRecord['gradedAnswers']) => {
    if (!gradedAnswers || gradedAnswers.length === 0) return 'N/A';
    const gradeValues: { [key: string]: number } = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };
    const total = gradedAnswers.reduce((acc, curr) => {
        const gradeLetter = curr.grade.replace(/[+-]/, '');
        return acc + (gradeValues[gradeLetter] || 0);
    }, 0);
    const avg = total / gradedAnswers.length;
    if (avg >= 3.5) return 'A';
    if (avg >= 2.5) return 'B';
    if (avg >= 1.5) return 'C';
    if (avg >= 0.5) return 'D';
    return 'F';
}

const StudyPlanView: React.FC<StudyPlanViewProps> = ({ plan, sessionHistory, onStartQuiz, onReviewSession, onBackToPlanList, loadingQuiz, selectedSection }) => {
  const attemptedSections = new Set(sessionHistory.map(s => s.section.title));
  const progressPercent = plan.sections.length > 0 ? (attemptedSections.size / plan.sections.length) * 100 : 0;

  const sectionScores = plan.sections
    .map(section => {
      const sectionHistory = sessionHistory.filter(s => s.section.title === section.title);
      if (sectionHistory.length === 0) return null;
      
      const latestSession = sectionHistory[0]; // Assumes sorted by date descending
      if (!latestSession || latestSession.gradedAnswers.length === 0) return null;

      const total = latestSession.gradedAnswers.reduce((acc, curr) => acc + getNumericGrade(curr.grade), 0);
      return total / latestSession.gradedAnswers.length;
    })
    .filter(score => score !== null) as number[];

  let overallPlanGrade = 'N/A';
  if (sectionScores.length > 0) {
    const avgPlanScore = sectionScores.reduce((acc, curr) => acc + curr, 0) / sectionScores.length;
    overallPlanGrade = getLetterGrade(avgPlanScore);
  }
  
  const getGradeColorClass = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-green-500/30 text-green-300';
    if (grade.startsWith('B')) return 'bg-yellow-500/30 text-yellow-300';
    return 'bg-red-500/30 text-red-300';
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white animate-fade-in p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <button onClick={onBackToPlanList} className="text-sm text-brand-primary hover:underline mb-4">&larr; Back to All Plans</button>
          <h1 className="text-4xl font-bold text-white">{plan.topic}</h1>
          <p className="text-slate-400">{plan.summary}</p>
        </header>

        <div className="mb-8 p-6 bg-slate-800 rounded-xl border border-slate-700 animate-slide-in-up">
          <h2 className="text-xl font-bold text-white mb-4">Plan Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-slate-400">Completion</label>
              <div className="w-full bg-slate-700 rounded-full h-4 mt-1">
                <div className="bg-brand-secondary h-4 rounded-full" style={{ width: `${progressPercent}%` }}></div>
              </div>
              <p className="text-xs text-slate-500 mt-1 text-right">{attemptedSections.size} of {plan.sections.length} topics started</p>
            </div>
            <div className="text-center">
                <label className="text-sm font-medium text-slate-400">Overall Grade</label>
                <p className={`text-4xl font-bold mt-1 ${getGradeColorClass(overallPlanGrade).split(' ')[1]}`}>{overallPlanGrade}</p>
            </div>
          </div>
        </div>

        <main className="space-y-6">
          <h2 className="text-2xl font-semibold text-slate-300 border-b border-slate-700 pb-2">Your Learning Path</h2>
          {plan.sections.map((section, index) => {
            const sectionHistory = sessionHistory
              .filter(s => s.section.title === section.title)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            let overallSectionGrade: string | null = null;
            if (sectionHistory.length > 0) {
              const sessionAvgScores = sectionHistory.map(s => {
                  const total = s.gradedAnswers.reduce((acc, curr) => acc + getNumericGrade(curr.grade), 0);
                  return s.gradedAnswers.length > 0 ? total / s.gradedAnswers.length : 0;
              });
              const avgSectionScore = sessionAvgScores.reduce((acc, curr) => acc + curr, 0) / sessionAvgScores.length;
              overallSectionGrade = getLetterGrade(avgSectionScore);
            }

            return (
              <div key={index} className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-lg transition-all animate-slide-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center flex-wrap gap-x-3 gap-y-2 mb-2">
                       <h3 className="text-xl font-bold text-white">{section.title}</h3>
                       <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getDifficultyClass(section.difficulty)}`}>
                         {section.difficulty}
                       </span>
                    </div>
                    <p className="text-slate-400">{section.description}</p>
                  </div>
                  {overallSectionGrade && (
                     <div className="flex-shrink-0 text-center">
                        <p className="text-xs text-slate-400">Overall Grade</p><p className="font-bold text-lg">{overallSectionGrade}</p>
                     </div>
                  )}
                  <button
                    onClick={() => onStartQuiz(section)}
                    disabled={loadingQuiz}
                    className="w-full sm:w-auto flex-shrink-0 inline-flex items-center justify-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-primary disabled:bg-slate-600 disabled:cursor-not-allowed"
                  >
                    {loadingQuiz && selectedSection?.title === section.title ? <LoadingSpinner className="w-5 h-5" /> : 'Start Quiz'}
                  </button>
                </div>
                {sectionHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Quiz History</h4>
                    <ul className="space-y-2">
                      {sectionHistory.map((session, s_idx) => (
                        <li key={session.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-md">
                          <div className="flex-grow">
                             <p className="font-medium text-slate-300">Attempt #{sectionHistory.length - s_idx} - {new Date(session.date).toLocaleDateString()}</p>
                             <p className="text-sm text-slate-500">Avg. Grade: {getAvgGrade(session.gradedAnswers)}</p>
                           </div>
                          <button onClick={() => onReviewSession(session.id)} className="text-sm text-brand-primary hover:underline">Review</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </main>
      </div>
    </div>
  );
};

export default StudyPlanView;
