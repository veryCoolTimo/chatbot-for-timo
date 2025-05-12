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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]"
          onClick={onClose} // Close on backdrop click
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="glass-card p-6 rounded-lg shadow-xl max-w-md w-full mx-4 relative"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 dark:hover:bg-gray-700/30 text-gray-600 dark:text-gray-300 transition-colors"
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
                    className="glass-input flex-grow px-3 py-2 text-sm w-full border border-transparent focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors duration-200"
                  />
                  <button
                    onClick={handleAddModelClick}
                    disabled={!customModelId.trim()}
                    className={`btn btn-secondary px-3 py-1.5 text-sm ${
                      !customModelId.trim() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Add
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enter the exact ID of a model available on OpenRouter.
                </p>
              </div>

              {/* Placeholder for API Key Input if needed later */}
              {/* 
              <div>
                <label htmlFor="apiKeyInput" className="block text-sm font-medium mb-1">
                  OpenRouter API Key (Optional, for local use)
                </label>
                <input type="password" id="apiKeyInput" placeholder="sk-or-..." className="glass-input w-full px-3 py-1.5 text-sm" />
                 <p className="text-xs text-red-500 mt-1">Warning: Storing API keys in the browser is insecure.</p>
              </div> 
              */}

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 