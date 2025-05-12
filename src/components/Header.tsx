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
  customModels?: Model[]; // Новый проп
}

export default function Header({ currentModel, onModelChange, onNewChat, tokenCount, onToggleSettings, customModels = [] }: HeaderProps) {
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

  // Объединяем customModels и models без дубликатов
  const allModels = [...customModels, ...models.filter(m => !customModels.some(cm => cm.id === m.id))];

  return (
    <header className="glass-header">
      <div className="flex flex-row items-center justify-between w-full flex-nowrap gap-2">
        <div className="flex flex-row items-center gap-3 min-w-0">
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">TimoChatBot</h1>
          <button 
            onClick={onNewChat}
            className="btn btn-primary"
          >
            New Chat
          </button>
        </div>
        <div className="btn-group flex flex-row items-center flex-nowrap gap-2 min-w-0 justify-end flex-1">
          <select 
            value={currentModel ? currentModel.id : ""} 
            onChange={handleSelectModelChange}
            disabled={isLoadingModels}
            className="glass-input px-3 py-1.5 text-sm min-w-[140px] max-w-[240px] truncate overflow-hidden text-ellipsis"
            style={{ maxWidth: 240, minWidth: 140 }}
          >
            {isLoadingModels ? (
              <option value="">⏳ Searching...</option>
            ) : (
              <>
                {!currentModel && <option value="" disabled>Select Model</option>}
                {allModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </>
            )}
          </select>
          <div 
            className="glass-surface px-3 py-1.5 text-sm min-w-[90px] max-w-[150px] text-center relative group rounded-lg shadow-none overflow-hidden text-ellipsis whitespace-nowrap"
            style={{maxWidth:150, minWidth:90}}
          >
            Tokens: {tokenCount}
            {estimatedCost !== null && currentModel && currentModel.pricing && currentModel.pricing.prompt > 0 && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs p-2 
                            bg-gray-800 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300
                            pointer-events-none z-10">
                Estimated cost: ${estimatedCost} 
                <span className="text-gray-400 text-[10px] block">(based on prompt tokens for {currentModel?.name || 'selected model'})</span>
              </div>
            )}
          </div>
          <button 
            onClick={handleThemeToggle} 
            className="btn glass-surface p-1.5 min-w-0 w-8 h-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 shadow-none"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button 
            onClick={onToggleSettings}
            className="btn glass-surface p-1.5 min-w-0 w-8 h-8 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 shadow-none"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
} 