
import React, { useState } from 'react';

interface ApiKeySetupScreenProps {
  onSave: (apiKey: string) => void;
}

const ApiKeySetupScreen: React.FC<ApiKeySetupScreenProps> = ({ onSave }) => {
  const [key, setKey] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (key.trim()) {
      onSave(key.trim());
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md mx-auto">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 border border-slate-700">
          <h1 className="text-2xl font-bold text-center text-white mb-2">Welcome to Re-up AI</h1>
          <p className="text-center text-slate-400 mb-6">Please enter your Gemini API key to begin.</p>
          
          <form onSubmit={handleSave} className="space-y-6">
            <div>
              <label htmlFor="api-key" className="block text-sm font-medium text-slate-400">
                Gemini API Key
              </label>
              <input
                id="api-key"
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="mt-1 block w-full bg-slate-900 border border-slate-600 rounded-md shadow-sm py-3 px-4 text-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                placeholder="Enter your key here"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={!key.trim()}
              className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-brand-primary hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-brand-primary disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
              Save & Start
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            <p>Your API key is stored only in your browser's local storage.</p>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-brand-primary hover:underline"
            >
              Get your Gemini API key from Google AI Studio
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeySetupScreen;