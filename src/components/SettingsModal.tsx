'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddModel: (modelId: string) => void;
}

export default function SettingsModal({ isOpen, onClose, onAddModel }: SettingsModalProps) {
  const [customModelId, setCustomModelId] = useState('');

  const handleAddModelClick = () => {
    onAddModel(customModelId);
    setCustomModelId(''); // Clear input after adding
  };

  if (!isOpen) return null;

  return (
    <div className="modal-content">
      <div className="glass-card p-6 rounded-card shadow-xl w-full max-w-md mx-auto relative">
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
          aria-label="Close settings"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100">Settings</h2>
        <div className="space-y-6">
          <div>
            <label htmlFor="customModelInput" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Add Custom Model ID
            </label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                id="customModelInput"
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder="e.g., organization/model-name-v1" 
                className="glass-input flex-grow px-3 py-2 text-sm w-full border border-transparent focus:border-accent focus:ring-1 focus:ring-accent transition-colors duration-200" 
              />
              <button
                onClick={handleAddModelClick}
                disabled={!customModelId.trim()}
                className={`btn btn-primary px-4 py-2 text-sm font-medium transition-opacity ${ 
                  !customModelId.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
                }`}
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Enter the exact ID of a model available on OpenRouter.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 