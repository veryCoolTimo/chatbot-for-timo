'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Send, Paperclip, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface InputBarProps {
  onSend: (message: string, files?: File[]) => void;
  isStreaming: boolean;
  isModelSelected: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

// Define Window with SpeechRecognition interface for TypeScript
interface WindowWithSpeechRecognition extends Window {
  webkitSpeechRecognition?: { new(): SpeechRecognition };
  SpeechRecognition?: { new(): SpeechRecognition };
}

// Define SpeechRecognition types for broader compatibility
interface SpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: any) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  item(index: number): SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  item(index: number): SpeechRecognitionAlternative;
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export default function InputBar({ onSend, isStreaming, isModelSelected, textareaRef: externalTextareaRef }: InputBarProps) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Use external ref if provided, otherwise use internal ref
  const textareaRef = externalTextareaRef || internalTextareaRef;

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input, textareaRef]);

  // Inject scrollbar hiding styles on client-side mount
  useEffect(() => {
    const styleId = 'no-scrollbar-style';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none; 
          scrollbar-width: none; 
        }
      `;
      document.head.append(style);
    }
  }, []);

  // Define handleSend using useCallback to stabilize its identity
  const handleSend = useCallback(() => {
    const currentInput = textareaRef.current?.value.trim() || '';
    const currentFiles = files;
    
    if (currentInput || currentFiles.length > 0) {
      onSend(currentInput, currentFiles);
      if (textareaRef.current) {
        textareaRef.current.value = ''; // Clear textarea via ref
        textareaRef.current.style.height = 'auto'; // Reset height
      }
      setFiles([]); // Clear file state
      setInput(''); // Also clear state if still used for display
    }
  }, [onSend, textareaRef, files]);

  // Setup speech recognition effect
  useEffect(() => {
    // Check if speech recognition is available in the browser
    if (typeof window !== 'undefined') {
      try {
        const windowWithSpeech = window as WindowWithSpeechRecognition;
        const SpeechRecognitionAPI = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
        
        if (SpeechRecognitionAPI) {
          recognitionRef.current = new SpeechRecognitionAPI();
          if (recognitionRef.current) {
            recognitionRef.current.lang = 'ru-RU';
            recognitionRef.current.interimResults = true;
            recognitionRef.current.continuous = false;
            
            recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
              let transcript = '';
              for (let i = 0; i < event.results.length; i++) {
                transcript += event.results.item(i).item(0).transcript;
              }

              // Update the textarea directly via ref for consistency
              if (textareaRef.current) {
                textareaRef.current.value = transcript;
              }
              setInput(transcript); // Keep state in sync if needed elsewhere
            };
            
            recognitionRef.current.onend = () => {
              setIsRecording(false);
              // Auto-send if there's content
              if (textareaRef.current?.value.trim()) {
                handleSend(); // handleSend is now stable due to useCallback
              }
            };
            
            recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
              console.error('Speech recognition error', event.error);
              setIsRecording(false);
            };
          }
        } else {
          console.warn('Speech recognition not supported in this browser.');
        }
      } catch (e) {
        console.error('Error initializing speech recognition', e);
      }
    }
    
    // Cleanup function
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.error('Error aborting speech recognition', e);
        }
        recognitionRef.current = null;
      }
    };
  }, [handleSend, textareaRef]); // Add textareaRef to deps as it's used in onresult/onend

  const buttonVariants = {
    hover: { scale: 1.1 },
    tap: { scale: 0.9 }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      console.warn('Speech recognition not available');
      return;
    }
    
    if (isRecording) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error('Error stopping speech recognition', e);
      }
      setIsRecording(false);
    } else {
      setInput('');
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Error starting speech recognition', e);
        setIsRecording(false); // Ensure state is reset on error
      }
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(prevFiles => [...prevFiles, ...Array.from(event.target.files || [])]);
    }
  };
  
  const removeFile = (index: number) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.relatedTarget && (e.currentTarget as Node).contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles(prevFiles => [...prevFiles, ...Array.from(e.dataTransfer.files)]);
    }
  };

  // Disable send if streaming, no input/files, OR no model selected
  const isSendDisabled = isStreaming || (!input.trim() && files.length === 0) || !isModelSelected;

  return (
    <div className="glass-header p-4">
      <div className="max-w-3xl mx-auto">
        {/* Attached files preview */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {files.map((file, index) => (
              <div key={index} className="glass-card flex items-center gap-1 px-2 py-1 text-xs">
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button 
                  onClick={() => removeFile(index)} 
                  className="p-0.5 hover:bg-red-500/20 rounded-full"
                  disabled={isSendDisabled}
                  aria-label="Remove file"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {/* Input area */}
        <div 
          className={`glass-card flex items-end gap-2 p-2 ${
            isDragging ? 'ring-2 ring-blue-500' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* File input button - Wrap label for motion */}
          <motion.label 
            className={`p-2 rounded-lg ${isSendDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20 dark:hover:bg-gray-700/30 cursor-pointer'}`}
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <Paperclip className="w-5 h-5" />
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange} 
              className="hidden" 
              disabled={isSendDisabled} 
            />
          </motion.label>
          
          {/* Mic button */}
          <motion.button 
            onClick={toggleRecording}
            className={`p-2 rounded-lg ${isSendDisabled ? 'opacity-50 cursor-not-allowed' : isRecording ? 'bg-[#6D8CFF] text-white' : 'hover:bg-white/20 dark:hover:bg-gray-700/30'}`} 
            disabled={isSendDisabled}
            aria-label="Voice input"
            variants={buttonVariants}
            whileHover="hover"
            whileTap="tap"
          >
            <Mic className="w-5 h-5" />
          </motion.button>
          
          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !isSendDisabled) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isDragging ? "Drop files here..." : isRecording ? "Говорите..." : "Type a message or drop files..."}
            className="flex-1 bg-transparent focus:outline-none resize-none overflow-y-auto max-h-40 no-scrollbar"
            rows={1}
            disabled={isSendDisabled}
          />
          
          {/* Send button */}
          <motion.button 
            onClick={handleSend}
            disabled={isSendDisabled}
            className={`p-2 rounded-lg ${
              isSendDisabled
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-[#6D8CFF] hover:bg-[#829CFF] text-white'
            }`}
            aria-label="Send message"
            variants={buttonVariants}
            whileHover={isSendDisabled ? "" : "hover"}
            whileTap={isSendDisabled ? "" : "tap"}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
} 