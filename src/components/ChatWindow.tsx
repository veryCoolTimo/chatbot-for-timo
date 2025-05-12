'use client';

import { motion } from 'framer-motion';
import type { ChatMessage } from '../lib/openrouter';

interface ChatWindowProps {
  messages: ChatMessage[];
}

export default function ChatWindow({ messages }: ChatWindowProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
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
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              layout
              className={`${
                message.role === 'user'
                  ? 'glass-card ml-auto bg-blue-100 dark:bg-blue-800/30'
                  : 'glass-card mr-auto'
              } p-4 max-w-[85%]`}
            >
              <div className="text-xs font-semibold mb-1 flex items-center">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <div className="whitespace-pre-wrap break-words text-sm">
                {message.content || (
                  <div className="animate-pulse">
                    <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-1"></div>
                    <div className="h-2 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 