import React, { useState } from 'react';
import LoadingSpinner from './icons/LoadingSpinner';

interface ApiKeySetupScreenProps {
  onSave: (key: string) => void;
  loading: boolean;
}

const ApiKeySetupScreen: React.FC<ApiKeySetupScreenProps> = ({ onSave, loading }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 animate-fade-in">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-white">Welcome to Re-up AI</h1>
            <p className="mt-2 text-slate-400">Please enter your Google Gemini API Key to begin.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="api-key" className="block text-sm font-medium text-slate-400">
                Gemini API Key
              </label>
              <input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                placeholder="Enter your API key"
                required
              />
            </div>
            <button
              type="submit"
              disabled={!apiKey.trim() || loading}
              className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-primary disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              {loading ? <LoadingSpinner /> : 'Save and Continue'}
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-slate-500">
            <p>Your API key is stored only in your browser's local storage and is never sent to our servers.</p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/api-key" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-2 inline-block text-brand-primary hover:underline"
            >
              How to get an API Key &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetupScreen;