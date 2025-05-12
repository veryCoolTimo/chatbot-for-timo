'use client';

import { motion } from 'framer-motion';
import type { ChatMessage } from '../lib/openrouter';
import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Mic, Send, Paperclip, X, Copy, Edit } from 'lucide-react';
import copy from 'copy-to-clipboard';

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming?: boolean;
  onEditMessage?: (index: number) => void;
  editingIndex?: number | null;
  setEditingIndex?: (index: number | null) => void;
}

export default function ChatWindow({ 
  messages, 
  isStreaming, 
  onEditMessage, 
  editingIndex,
  setEditingIndex 
}: ChatWindowProps) {
  const handleCopy = (text: string) => {
    copy(text);
    // Optionally: show a notification "Copied!"
  };

  // Handle ESC key to cancel editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingIndex !== null && setEditingIndex) {
        setEditingIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingIndex, setEditingIndex]);

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto p-4 scroll-smooth">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <div className="glass-card p-6 max-w-md text-center">
            <h2 className="text-xl font-semibold mb-3">Welcome to TimoChatBot</h2>
            <p className="text-gray-600 dark:text-gray-300">
              Ask anything or upload files to start a conversation. Your chat history 
              will be available only for this session.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 w-full items-center">
          {messages.map((message, index) => (
            <div 
              key={index}
              className={`flex w-full ${message.role === 'user' ? 'justify-end' : 'justify-start'}`} 
            >
              <div 
                className={`glass-surface group relative p-4 max-w-xl lg:max-w-2xl w-full break-words shadow-sm ${ 
                  message.role === 'user' 
                    ? 'bg-accent/10 dark:bg-accent/20 rounded-br-[12px]'
                    : 'bg-white/70 dark:bg-white/10 rounded-bl-[12px]'
                }`}
                style={{ borderRadius: 12 }}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
                <div className="absolute bottom-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleCopy(message.content)}
                    className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
                    title="Copy"
                  >
                    <Copy size={14} />
                  </button>
                  {message.role === 'user' && onEditMessage && (
                    <button 
                      onClick={() => onEditMessage(index)}
                      className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isStreaming && (
            <div className="flex w-full justify-start">
              <div className="glass-surface p-4 max-w-xl lg:max-w-2xl w-full break-words shadow-sm bg-white/70 dark:bg-white/10 rounded-bl-[12px]" style={{ borderRadius: 12 }}>
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 