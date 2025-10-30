
import React, { useEffect } from 'react';
import { SessionRecord, Section } from '../types';

interface FeedbackViewProps {
  sessionRecord: SessionRecord;
  onFinish: () => void;
  onTryAgain: (section: Section) => void;
}

const getGradeColor = (grade: string) => {
  if (grade.startsWith('A')) return 'text-green-400 border-green-400';
  if (grade.startsWith('B')) return 'text-yellow-400 border-yellow-400';
  if (grade.startsWith('C')) return 'text-orange-400 border-orange-400';
  return 'text-red-400 border-red-400';
};

const FeedbackView: React.FC<FeedbackViewProps> = ({ sessionRecord, onFinish, onTryAgain }) => {
  useEffect(() => {
    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise();
    }
  }, [sessionRecord]);
  
  const gradedAnswers = sessionRecord.gradedAnswers;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white">Quiz Feedback</h1>
          <p className="mt-2 text-slate-400">Here's how you did on "{sessionRecord.section.title}". Review the feedback to improve.</p>
        </header>

        <main className="space-y-6">
          {gradedAnswers.map((answer, index) => (
            <div key={index} className="bg-slate-800 p-6 rounded-lg border border-slate-700 animate-slide-in-up" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-slate-300 flex-1 pr-4">{answer.question}</h2>
                <div className={`text-2xl font-bold p-2 border-2 rounded-lg ${getGradeColor(answer.grade)}`}>
                  {answer.grade}
                </div>
              </div>

              <div className="mb-4 p-4 bg-slate-900/50 rounded-md">
                <p className="text-slate-400 italic">Your answer: "{answer.userAnswer}"</p>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-brand-secondary mb-1">Summary</h3>
                  <p className="text-slate-300">{answer.summary}</p>
                </div>
                {answer.keyConceptsMissed && answer.keyConceptsMissed.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-orange-400 mb-1">Key Concepts to Review</h3>
                    <ul className="list-disc list-inside text-slate-300 space-y-1">
                      {answer.keyConceptsMissed.map((concept, i) => <li key={i}>{concept}</li>)}
                    </ul>
                  </div>
                )}
                {answer.suggestedResearchLinks && answer.suggestedResearchLinks.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-blue-400 mb-1">Suggested Reading</h3>
                    <ul className="space-y-1">
                      {answer.suggestedResearchLinks.map((link, i) => (
                        <li key={i}>
                          <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{link}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </main>

        <footer className="mt-12 flex flex-col sm:flex-row justify-center items-center gap-4">
          <button
            onClick={onFinish}
            className="w-full sm:w-auto px-8 py-3 border border-slate-600 text-base font-medium rounded-md shadow-sm text-white bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-brand-primary"
          >
            Back to Study Plan
          </button>
          <button
            onClick={() => onTryAgain(sessionRecord.section)}
            className="w-full sm:w-auto px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-brand-primary"
          >
            Try Again
          </button>
        </footer>
      </div>
    </div>
  );
};

export default FeedbackView;
