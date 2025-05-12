'use client'; // Add use client for state and event handlers

import { useState, useEffect } from 'react';
import { Settings, Sun, Moon } from 'lucide-react';
import type { Model } from '../lib/openrouter'; // Corrected path
import { listModels } from '../lib/openrouter'; // Corrected path

interface HeaderProps {
  currentModel: string;
  onModelChange: (modelId: string) => void;
  onNewChat: () => void;
  tokenCount: number;
}

export default function Header({ currentModel, onModelChange, onNewChat, tokenCount }: HeaderProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false); // Basic dark mode toggle state

  useEffect(() => {
    // Load models on component mount
    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const availableModels = await listModels();
        setModels(availableModels);
      } catch (error) {
        console.error("Error fetching models:", error);
        // Handle error display if needed
      }
      setIsLoadingModels(false);
    };
    fetchModels();

    // Check for saved theme preference or system preference
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
    } else {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
    }

  }, []);

  const handleThemeToggle = () => {
      if (isDarkMode) {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
      } else {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
      }
      setIsDarkMode(!isDarkMode);
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-header py-3 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">TimoChatBot</h1>
          <button 
            onClick={onNewChat}
            className="btn btn-primary"
          >
            New Chat
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={currentModel}
            onChange={(e) => onModelChange(e.target.value)}
            disabled={isLoadingModels}
            className="glass-input px-3 py-1.5 text-sm min-w-[180px]"
          >
            {isLoadingModels ? (
              <option value="">Loading Models...</option>
            ) : (
              <>
                <option value="">Select Model</option>
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </>
            )}
          </select>
          
          <div className="glass-card px-3 py-1.5 text-sm min-w-[100px] text-center">
            Tokens: {tokenCount}
          </div>
          
          <button 
            onClick={handleThemeToggle} 
            className="p-2 rounded-full glass-card hover:bg-white/50 dark:hover:bg-gray-700/50"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <button 
            className="p-2 rounded-full glass-card hover:bg-white/50 dark:hover:bg-gray-700/50"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
} 