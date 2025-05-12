'use client'; // Add use client for state and event handlers

import { useState, useEffect } from 'react';
import { Settings, Sun, Moon, Info } from 'lucide-react';
import type { Model } from '../lib/openrouter';
import { listModels } from '../lib/openrouter';
import { motion } from 'framer-motion';

interface HeaderProps {
  currentModel: Model | null;
  onModelChange: (model: Model | null) => void; // Expects Model | null again
  onNewChat: () => void;
  tokenCount: number;
  onToggleSettings: () => void; // Add prop to toggle settings modal
}

export default function Header({ currentModel, onModelChange, onNewChat, tokenCount, onToggleSettings }: HeaderProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState<string | null>(null);

  useEffect(() => {
    const fetchModelsAndSetInitial = async () => {
      setIsLoadingModels(true);
      try {
        const availableModels = await listModels();
        setModels(availableModels);
        // Set default model only if none is passed from parent
        if (!currentModel && availableModels.length > 0) {
          const defaultModel = availableModels.find(m => m.id === 'openai/gpt-3.5-turbo') || availableModels[0];
          onModelChange(defaultModel);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
      }
      setIsLoadingModels(false);
    };
    fetchModelsAndSetInitial();

    // Theme setup
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        document.documentElement.classList.add('dark');
        setIsDarkMode(true);
    } else {
        document.documentElement.classList.remove('dark');
        setIsDarkMode(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Dependencies remain minimal for initial load

  // Theme toggle logic (ensure CSS works)
  const handleThemeToggle = () => {
    console.log('Toggling theme. Current dark mode:', isDarkMode);
    const element = document.documentElement;
    if (element.classList.contains('dark')) {
        element.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        setIsDarkMode(false);
    } else {
        element.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        setIsDarkMode(true);
    }
  };

  const buttonVariants = {
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  // Simplified model change handler for select
  const handleSelectModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const modelId = event.target.value;
    const selectedModel = models.find(m => m.id === modelId) || null;
    onModelChange(selectedModel);
  };

  useEffect(() => {
    if (currentModel && currentModel.pricing && tokenCount > 0) {
      // Using prompt token price for estimation. Pricing is per 1M tokens.
      const pricePerMillionPrompt = currentModel.pricing.prompt * 1000000;
      const cost = (tokenCount / 1000000) * pricePerMillionPrompt;
      // Format to a reasonable number of decimal places, e.g., 6 for typical token costs
      setEstimatedCost(cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 }));
    } else {
      setEstimatedCost(null);
    }
  }, [tokenCount, currentModel]);

  return (
    <header className="sticky top-0 z-50 w-full glass-header py-3 px-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">TimoChatBot</h1>
          <motion.button 
            onClick={onNewChat}
            className="btn btn-primary"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            New Chat
          </motion.button>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={currentModel ? currentModel.id : ""} 
            onChange={handleSelectModelChange}
            disabled={isLoadingModels}
            className="glass-input px-3 py-1.5 text-sm min-w-[180px]"
          >
            {isLoadingModels ? (
              <option value="">Loading Models...</option>
            ) : (
              <>
                {!currentModel && <option value="" disabled>Select Model</option>}
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </>
            )}
          </select>
          
          <div className="glass-card px-3 py-1.5 text-sm min-w-[100px] text-center relative group">
            Tokens: {tokenCount}
            {estimatedCost !== null && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs p-2 
                            bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300
                            pointer-events-none z-10">
                Estimated cost: ${estimatedCost} 
                <span className="text-gray-400 text-[10px] block">(based on prompt tokens for {currentModel?.name || 'selected model'})</span>
              </div>
            )}
          </div>
          
          <motion.button 
            onClick={handleThemeToggle} 
            className="p-2 rounded-full glass-card hover:bg-white/50 dark:hover:bg-gray-700/50"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </motion.button>
          
          <motion.button 
            onClick={onToggleSettings}
            className="p-2 rounded-full glass-card hover:bg-white/50 dark:hover:bg-gray-700/50"
            aria-label="Settings"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <Settings className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </header>
  );
} 