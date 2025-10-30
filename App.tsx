import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { StudyPlan, Section, GradedAnswer, SessionRecord, Question } from './types';
import { generateStudyPlan, generateQuestions, gradeAnswer } from './services/geminiService';
import { useLocalStorage } from './hooks/useLocalStorage';
import { exportDataToFile, readDataFromFile, ExportData } from './services/dataService';

import SetupScreen from './components/SetupScreen';
import StudyPlanView from './components/StudyPlanView';
import QuizView from './components/QuizView';
import FeedbackView from './components/FeedbackView';
import LoadingSpinner from './components/icons/LoadingSpinner';
import ApiKeySetupScreen from './components/ApiKeySetupScreen';

type AppState = 'setup' | 'study_plan' | 'quiz' | 'feedback' | 'loading_plan';

function App() {
  const [apiKey, setApiKey] = useLocalStorage<string | null>('geminiApiKey', null);
  const [appState, setAppState] = useState<AppState>('setup');
  const [loading, setLoading] = useState(false);
  
  const [studyPlans, setStudyPlans] = useLocalStorage<StudyPlan[]>('studyPlans', []);
  const [activePlanId, setActivePlanId] = useLocalStorage<string | null>('activePlanId', null);
  const [sessionHistory, setSessionHistory] = useLocalStorage<SessionRecord[]>('sessionHistory', []);
  const [activeSessionRecordId, setActiveSessionRecordId] = useLocalStorage<string | null>('activeSessionRecordId', null);
  
  const activePlan = studyPlans.find(p => p.id === activePlanId) || null;
  const activeSessionRecord = sessionHistory.find(s => s.id === activeSessionRecordId) || null;

  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [selectedSectionForQuiz, setSelectedSectionForQuiz] = useState<Section | null>(null);
  const [gradingProgress, setGradingProgress] = useState<{current: number, total: number} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (apiKey) {
      // Priority 1: An active quiz/feedback session from a page refresh
      if (activeSessionRecordId) {
        const session = sessionHistory.find(s => s.id === activeSessionRecordId);
        if (session) {
          // Ensure its parent plan is the active one
          if (activePlanId !== session.planId) {
            setActivePlanId(session.planId);
          }
          setAppState(session.status === 'in-progress' ? 'quiz' : 'feedback');
          return; // Exit early to prevent other logic from overriding
        } else {
          // Dangling session ID, clear it and proceed
          setActiveSessionRecordId(null);
        }
      }
      
      // Priority 2: An active study plan
      if (activePlanId) {
        setAppState('study_plan');
      } else {
      // Default: Setup screen
        setAppState('setup');
      }
    }
  }, [apiKey, activePlanId, activeSessionRecordId, sessionHistory, setActivePlanId, setActiveSessionRecordId]);
  
  const handleStart = async (topic: string, context: string) => {
    if (!apiKey) return;
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
      setError("Sorry, we couldn't create a study plan. This could be due to an invalid API key or a network issue. Please check your key and try again.");
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
      const sessionIdsToDelete = sessionHistory.filter(s => s.planId === planId).map(s => s.id);
      if (activeSessionRecordId && sessionIdsToDelete.includes(activeSessionRecordId)) {
        setActiveSessionRecordId(null);
      }
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
    setActiveSessionRecordId(null);
    setAppState('setup');
  };

  const handleStartQuiz = async (section: Section, forceNewQuestions = false) => {
    if (!activePlan || !apiKey) return;

    // 1. Check for an existing in-progress session for this section.
    const existingInProgressSession = sessionHistory.find(s => 
      s.planId === activePlan.id && 
      s.section.title === section.title && 
      s.status === 'in-progress'
    );

    if (existingInProgressSession && !forceNewQuestions) {
      // If found, continue that session.
      setActiveSessionRecordId(existingInProgressSession.id);
      setAppState('quiz');
      return;
    }

    // No in-progress session, or user wants new questions. Create a new attempt.
    setLoadingQuiz(true);
    setSelectedSectionForQuiz(section);
    setError(null);
    try {
      let questions: Question[];

      // Find the most recent previous session for this section to reuse questions from.
      const previousSessions = sessionHistory
        .filter(s => s.planId === activePlan.id && s.section.title === section.title)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const latestPreviousSession = previousSessions[0];

      if (forceNewQuestions || !latestPreviousSession) {
        // Generate new questions if forced, or if no previous session exists.
        questions = await generateQuestions(apiKey, section.title, activePlan.topic);
      } else {
        // Reuse questions from the most recent previous session.
        questions = latestPreviousSession.questions;
      }

      // 4. Create a new session record for this new attempt.
      const newSessionRecord: SessionRecord = {
        id: uuidv4(),
        planId: activePlan.id,
        topic: activePlan.topic,
        section,
        questions,
        userAnswers: new Array(questions.length).fill(''),
        gradedAnswers: [],
        date: new Date().toISOString(),
        status: 'in-progress',
      };
      
      setSessionHistory(prev => [newSessionRecord, ...prev]);
      setActiveSessionRecordId(newSessionRecord.id);
      setAppState('quiz');

    } catch (err) {
      console.error("Failed to generate questions:", err);
      setError(`Failed to start the quiz for "${section.title}". Please try again.`);
    } finally {
      setLoadingQuiz(false);
      setSelectedSectionForQuiz(null);
    }
  };

  const handleUpdateQuizAnswers = (answers: string[]) => {
    if (!activeSessionRecordId) return;
    setSessionHistory(prev => prev.map(s => 
      s.id === activeSessionRecordId ? { ...s, userAnswers: answers } : s
    ));
  };
  
  const handleFinishQuiz = async (userAnswers: string[]) => {
    if (!activeSessionRecordId || !apiKey) return;

    const currentSession = sessionHistory.find(s => s.id === activeSessionRecordId);
    if (!currentSession) return;
    
    // Persist answers immediately to prevent data loss on grading failure.
    handleUpdateQuizAnswers(userAnswers);

    setLoading(true);
    setQuizError(null);
    
    const questionsToGrade = currentSession.questions;
    const totalQuestions = questionsToGrade.length;
    // Start with a copy of already graded answers. This is key for retries.
    const gradedAnswers: GradedAnswer[] = [...currentSession.gradedAnswers];

    try {
      // Start looping from the first ungraded answer.
      for (let i = gradedAnswers.length; i < totalQuestions; i++) {
        setGradingProgress({ current: i + 1, total: totalQuestions });
        
        const question = questionsToGrade[i];
        const userAnswer = userAnswers[i];
        
        const gradeResult = await gradeAnswer(apiKey, question.question, userAnswer);
        
        const newGradedAnswer: GradedAnswer = {
          question: question.question,
          userAnswer,
          grade: gradeResult.grade,
          summary: gradeResult.summary,
          keyConceptsMissed: gradeResult.keyConceptsMissed,
          suggestedResearchLinks: gradeResult.suggestedResearchLinks,
        };
        
        gradedAnswers.push(newGradedAnswer);

        // Crucially, save the growing list of graded answers to state after each one.
        // This persists the grading progress.
        setSessionHistory(prev => prev.map(s => 
          s.id === activeSessionRecordId 
            ? { ...s, userAnswers, gradedAnswers: [...gradedAnswers] } 
            : s
        ));
      }

      // If we get here, all questions have been graded successfully.
      const completedSessionRecord: SessionRecord = {
        ...currentSession,
        userAnswers,
        gradedAnswers,
        status: 'completed',
      };
      
      setSessionHistory(prev => prev.map(s => s.id === activeSessionRecordId ? completedSessionRecord : s));
      setAppState('feedback');

    } catch (err) {
      console.error("Failed to grade answers:", err);
      // The progress is already saved inside the loop, so we just show an error.
      setQuizError("Failed to contact the AI for grading. Your progress up to this point has been saved. Please check your network connection and try again.");
    } finally {
      setLoading(false);
      setGradingProgress(null);
    }
  };
  
  const handleResetApiKey = () => {
    setApiKey(null);
  };

  const handleExportAllData = () => {
    const exportData: ExportData = {
      version: 1,
      type: 'full',
      timestamp: new Date().toISOString(),
      data: {
        studyPlans,
        sessionHistory,
      },
    };
    const date = new Date().toISOString().split('T')[0];
    exportDataToFile(exportData, `reup-ai-backup-full-${date}.json`);
  };

  const handleExportPlan = () => {
    if (!activePlan) return;
    const planHistory = sessionHistory.filter(s => s.planId === activePlan.id);
    const exportData: ExportData = {
      version: 1,
      type: 'single_plan',
      timestamp: new Date().toISOString(),
      data: {
        studyPlans: [activePlan],
        sessionHistory: planHistory,
      },
    };
    const safeTopic = activePlan.topic.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    exportDataToFile(exportData, `reup-ai-plan-${safeTopic}-${date}.json`);
  };

  const handleImportTrigger = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await readDataFromFile(file);
      
      const confirmed = window.confirm(
        'Are you sure you want to import this data? This will add new items and overwrite any existing plans or sessions with the same ID.'
      );

      if (confirmed) {
        // Merge study plans
        const plansMap = new Map(studyPlans.map(p => [p.id, p]));
        importedData.data.studyPlans.forEach(p => plansMap.set(p.id, p));
        
        // Merge session history
        const historyMap = new Map(sessionHistory.map(s => [s.id, s]));
        importedData.data.sessionHistory.forEach(s => historyMap.set(s.id, s));
        
        setStudyPlans(Array.from(plansMap.values()));
        setSessionHistory(Array.from(historyMap.values()));
        
        alert('Data imported successfully!');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      console.error("Failed to import data:", err);
      setError(`Import failed: ${errorMessage}`);
    } finally {
      // Reset file input value to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  if (!apiKey) {
    return <ApiKeySetupScreen onSave={setApiKey} loading={loading} />;
  }

  const renderContent = () => {
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
        if (!activePlan) return <SetupScreen studyPlans={studyPlans} onSelectPlan={handleSelectPlan} onDeletePlan={handleDeletePlan} onStart={handleStart} loading={loading} sessionHistory={sessionHistory} onResetApiKey={handleResetApiKey} onExportAllData={handleExportAllData} onImportData={handleImportTrigger} />;
        return <StudyPlanView 
          plan={activePlan} 
          sessionHistory={sessionHistory.filter(s => s.planId === activePlanId)}
          onStartQuiz={handleStartQuiz} 
          onReviewSession={(sessionId) => {
            setActiveSessionRecordId(sessionId);
            setAppState('feedback');
          }}
          onBackToPlanList={handleBackToPlanList}
          loadingQuiz={loadingQuiz}
          selectedSection={selectedSectionForQuiz}
          onExportPlan={handleExportPlan}
        />;
        
      case 'quiz':
        if (!activeSessionRecord) return <p>Error: Quiz session not found.</p>;
        return <QuizView 
          session={activeSessionRecord} 
          onUpdateAnswers={handleUpdateQuizAnswers}
          onFinishQuiz={handleFinishQuiz}
          onBack={(answers) => {
            handleUpdateQuizAnswers(answers);
            setActiveSessionRecordId(null);
            setQuizError(null); // Clear any quiz errors when leaving
            setAppState('study_plan');
          }}
          loading={loading}
          gradingProgress={gradingProgress}
          error={quizError}
          onRetry={() => {
            if (activeSessionRecord) handleFinishQuiz(activeSessionRecord.userAnswers);
          }}
        />;
        
      case 'feedback':
        if (!activeSessionRecord) return <p>Error: Session record not found.</p>;
        return <FeedbackView 
          sessionRecord={activeSessionRecord} 
          onFinish={() => {
            setActiveSessionRecordId(null);
            setAppState('study_plan');
          }}
          onTryAgain={(section) => {
            setActiveSessionRecordId(null);
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
          onExportAllData={handleExportAllData}
          onImportData={handleImportTrigger}
        />;
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        className="hidden"
        accept="application/json"
      />
      {renderContent()}
    </div>
  );
}

export default App;
