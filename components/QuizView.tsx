
import React, { useState, useEffect } from 'react';
import { QuizSession } from '../types';
import LoadingSpinner from './icons/LoadingSpinner';

interface QuizViewProps {
  session: QuizSession;
  onFinishQuiz: (answers: string[]) => void;
  onBack: () => void;
  loading: boolean;
  gradingProgress: { current: number; total: number } | null;
}

const QuizView: React.FC<QuizViewProps> = ({ session, onFinishQuiz, onBack, loading, gradingProgress }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>(new Array(session.questions.length).fill(''));
  const [currentAnswer, setCurrentAnswer] = useState('');

  const currentQuestion = session.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === session.questions.length - 1;

  useEffect(() => {
    setCurrentAnswer(answers[currentQuestionIndex]);
    if ((window as any).MathJax) {
      (window as any).MathJax.typesetPromise();
    }
  }, [currentQuestionIndex, answers, currentQuestion]);

  const handleNext = () => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = currentAnswer;
    setAnswers(newAnswers);

    if (isLastQuestion) {
      onFinishQuiz(newAnswers);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const progressPercentage = ((currentQuestionIndex + 1) / session.questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-3xl">
        <button onClick={onBack} className="mb-4 text-sm text-brand-primary hover:underline" disabled={loading}>
          &larr; Back to Study Plan
        </button>
        <div className="bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
          <header className="mb-6">
            <div className="flex justify-between items-center mb-2 text-slate-400">
              <p className="font-semibold">{session.section.title}</p>
              <p>Question {currentQuestionIndex + 1} of {session.questions.length}</p>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
              <div
                className="bg-brand-secondary h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </header>

          <main>
            <h2 className="text-2xl font-bold text-white mb-6 animate-slide-in-up" style={{ minHeight: '8rem' }}>{currentQuestion.question}</h2>
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              rows={10}
              className="w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm p-4 text-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
              placeholder="Your answer..."
              disabled={loading}
            />
          </main>
          
          <footer className="mt-8 text-right">
            <button
              onClick={handleNext}
              disabled={!currentAnswer.trim() || loading}
              className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-primary disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner className="w-6 h-6" />
                  {gradingProgress && <span>Grading {gradingProgress.current}/{gradingProgress.total}...</span>}
                </div>
              ) : isLastQuestion ? (
                'Finish & Grade'
              ) : (
                'Next Question'
              )}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default QuizView;
