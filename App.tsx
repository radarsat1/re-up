import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StudyPlan, Section, QuizSession, GradedAnswer, SessionRecord } from './types';
import { generateStudyPlan, generateQuestions, gradeAnswer } from './services/geminiService';
import { useLocalStorage } from './hooks/useLocalStorage';

import ApiKeySetupScreen from './components/ApiKeySetupScreen';
import SetupScreen from './components/SetupScreen';
import StudyPlanView from './components/StudyPlanView';
import QuizView from './components/QuizView';
import FeedbackView from './components/FeedbackView';
import LoadingSpinner from './components/icons/LoadingSpinner';

type AppState = 'setup' | 'study_plan' | 'quiz' | 'feedback' | 'loading_plan';

function App() {
  const [apiKey, setApiKey] = useLocalStorage<string | null>('gemini-api-key', null);
  const [appState, setAppState] = useState<AppState>('setup');
  const [loading, setLoading] = useState(false);
  
  const [studyPlans, setStudyPlans] = useLocalStorage<StudyPlan[]>('studyPlans', []);
  const [activePlanId, setActivePlanId] = useLocalStorage<string | null>('activePlanId', null);
  const activePlan = studyPlans.find(p => p.id === activePlanId) || null;
  
  const [sessionHistory, setSessionHistory] = useLocalStorage<SessionRecord[]>('sessionHistory', []);
  const [activeQuizSession, setActiveQuizSession] = useState<QuizSession | null>(null);
  const [activeSessionRecord, setActiveSessionRecord] = useState<SessionRecord | null>(null);

  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [selectedSectionForQuiz, setSelectedSectionForQuiz] = useState<Section | null>(null);
  const [gradingProgress, setGradingProgress] = useState<{current: number, total: number} | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey) {
      if (activePlan) {
        setAppState('study_plan');
      } else {
        setAppState('setup');
      }
    }
  }, [activePlanId, apiKey, activePlan]);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    setAppState('setup');
  };
  
  const handleResetApiKey = () => {
    if (window.confirm('Are you sure you want to change your API key?')) {
        setApiKey(null);
    }
  };

  const handleStart = async (topic: string, context: string) => {
    if (!apiKey) {
      setError("API Key is not set.");
      return;
    }
    setLoading(true);
    setAppState('loading_plan');
    setError(null);
    try {
      const newPlan = await generateStudyPlan(apiKey, topic, context);
      const planWithId = { ...newPlan, id: uuidv4() };
      setStudyPlans(prev => [...prev, planWithId]);
      setActivePlanId(planWithId.id);
      setAppState('study_plan');
    } catch (err) {
      console.error("Failed to generate study plan:", err);
      setError("Sorry, we couldn't create a study plan. Please check your API key and try again.");
      setAppState('setup');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = (planId: string) => {
    setActivePlanId(planId);
    setAppState('study_plan');
  };
  
  const handleDeletePlan = (planId: string) => {
    if(window.confirm('Are you sure you want to delete this study plan and all its history?')) {
      setStudyPlans(plans => plans.filter(p => p.id !== planId));
      setSessionHistory(history => history.filter(s => s.planId !== planId));
      if (activePlanId === planId) {
        setActivePlanId(null);
        setAppState('setup');
      }
    }
  };

  const handleBackToPlanList = () => {
    setActivePlanId(null);
    setAppState('setup');
  };

  const handleStartQuiz = async (section: Section) => {
    if (!activePlan || !apiKey) return;
    setLoadingQuiz(true);
    setSelectedSectionForQuiz(section);
    setError(null);
    try {
      const questions = await generateQuestions(apiKey, section.title, activePlan.topic);
      const newSession: QuizSession = {
        id: uuidv4(),
        section,
        questions,
      };
      setActiveQuizSession(newSession);
      setAppState('quiz');
    } catch (err) {
      console.error("Failed to generate questions:", err);
      setError(`Failed to start the quiz for "${section.title}". Please try again.`);
    } finally {
      setLoadingQuiz(false);
      setSelectedSectionForQuiz(null);
    }
  };
  
  const handleFinishQuiz = async (userAnswers: string[]) => {
    if (!activeQuizSession || !activePlan || !apiKey) return;
    setLoading(true);
    setGradingProgress({ current: 0, total: activeQuizSession.questions.length });
    setError(null);
    
    try {
      const gradedAnswers: GradedAnswer[] = [];
      for (let i = 0; i < activeQuizSession.questions.length; i++) {
        setGradingProgress({ current: i + 1, total: activeQuizSession.questions.length });
        const question = activeQuizSession.questions[i];
        const userAnswer = userAnswers[i];
        const gradeResult = await gradeAnswer(apiKey, question.question, userAnswer);
        gradedAnswers.push({
          question: question.question,
          userAnswer,
          ...gradeResult
        });
      }

      const newSessionRecord: SessionRecord = {
        id: activeQuizSession.id,
        planId: activePlan.id,
        topic: activePlan.topic,
        section: activeQuizSession.section,
        questions: activeQuizSession.questions,
        userAnswers,
        gradedAnswers,
        date: new Date().toISOString(),
      };
      
      setSessionHistory(prev => [newSessionRecord, ...prev]);
      setActiveSessionRecord(newSessionRecord);
      setAppState('feedback');

    } catch (err) {
      console.error("Failed to grade answers:", err);
      setError("An error occurred during grading. Please check your API key and try finishing the quiz again.");
    } finally {
      setLoading(false);
      setGradingProgress(null);
      setActiveQuizSession(null);
    }
  };
  
  const renderContent = () => {
    if (!apiKey) {
        return <ApiKeySetupScreen onSave={handleSaveApiKey} />;
    }

    if (error) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
          <div className="bg-red-900/50 border border-red-700 text-red-300 p-6 rounded-lg max-w-md text-center">
            <h2 className="text-xl font-bold mb-2">An Error Occurred</h2>
            <p>{error}</p>
            <button onClick={() => { setError(null); setAppState(activePlan ? 'study_plan' : 'setup'); }} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md">
              Dismiss
            </button>
          </div>
        </div>
      );
    }
    
    switch (appState) {
      case 'loading_plan':
        return <div className="min-h-screen bg-slate-900 flex flex-col gap-4 items-center justify-center text-white"><LoadingSpinner className="w-12 h-12" /><p className="text-xl">Building your study plan...</p></div>;
      
      case 'study_plan':
        if (!activePlan) return <SetupScreen studyPlans={studyPlans} onSelectPlan={handleSelectPlan} onDeletePlan={handleDeletePlan} onStart={handleStart} loading={loading} sessionHistory={sessionHistory} onResetApiKey={handleResetApiKey} />;
        return <StudyPlanView 
          plan={activePlan} 
          sessionHistory={sessionHistory.filter(s => s.planId === activePlanId)}
          onStartQuiz={handleStartQuiz} 
          onReviewSession={(sessionId) => {
            const record = sessionHistory.find(s => s.id === sessionId);
            if(record) {
              setActiveSessionRecord(record);
              setAppState('feedback');
            }
          }}
          onBackToPlanList={handleBackToPlanList}
          loadingQuiz={loadingQuiz}
          selectedSection={selectedSectionForQuiz}
        />;
        
      case 'quiz':
        if (!activeQuizSession) return <p>Error: Quiz session not found.</p>;
        return <QuizView 
          session={activeQuizSession} 
          onFinishQuiz={handleFinishQuiz}
          onBack={() => setAppState('study_plan')}
          loading={loading}
          gradingProgress={gradingProgress}
        />;
        
      case 'feedback':
        if (!activeSessionRecord) return <p>Error: Session record not found.</p>;
        return <FeedbackView 
          sessionRecord={activeSessionRecord} 
          onFinish={() => {
            setActiveSessionRecord(null);
            setAppState('study_plan');
          }}
          onTryAgain={(section) => {
            setActiveSessionRecord(null);
            handleStartQuiz(section);
          }}
        />;
        
      case 'setup':
      default:
        return <SetupScreen
          studyPlans={studyPlans} 
          onSelectPlan={handleSelectPlan}
          onDeletePlan={handleDeletePlan}
          onStart={handleStart} 
          loading={loading}
          sessionHistory={sessionHistory}
          onResetApiKey={handleResetApiKey}
        />;
    }
  };

  return (
    <div>
      {renderContent()}
    </div>
  );
}

export default App;
