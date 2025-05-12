'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Send, Paperclip, X } from 'lucide-react';
import { motion } from 'framer-motion';
import copy from 'copy-to-clipboard';

interface InputBarProps {
  onSend: (message: string, files?: File[]) => void;
  isStreaming: boolean;
  isModelSelected: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  initialValue?: string;
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

export default function InputBar({
  onSend,
  isStreaming,
  isModelSelected,
  textareaRef: externalTextareaRef,
  initialValue = "",
}: InputBarProps) {
  const [input, setInput] = useState(initialValue);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Use external ref if provided, otherwise use internal ref
  const textareaRef = externalTextareaRef || internalTextareaRef;

  // Синхронизация с initialValue из пропсов
  useEffect(() => {
    setInput(initialValue);
  }, [initialValue]);

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

  // Переносим объявление isSendDisabled выше
  const isSendDisabled = isStreaming || (!input.trim() && files.length === 0) || !isModelSelected;

  const handleSendClick = useCallback(() => {
    if (!isSendDisabled) {
      onSend(input, files);
      setInput("");
      setFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [onSend, input, files, isSendDisabled, textareaRef]);

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
                handleSendClick();
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
  }, [handleSendClick, textareaRef]); // Add textareaRef to deps as it's used in onresult/onend

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

  return (
    <div className="glass-input p-2 flex items-end gap-2 w-full">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !isSendDisabled) {
            e.preventDefault();
            handleSendClick();
          }
        }}
        placeholder={isRecording ? "Listening..." : "Type a message or drop files..."}
        className="flex-1 bg-transparent resize-none p-1 focus:outline-none min-h-[38px] max-h-40 no-scrollbar"
        rows={1}
        disabled={isStreaming || !isModelSelected}
        style={{ outline: 'none', border: 'none' }}
      />
      <div className="btn-group">
        <label 
          className={`btn btn-secondary p-1.5 min-w-0 w-8 h-8 flex items-center justify-center ${isStreaming || !isModelSelected ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20 dark:hover:bg-gray-700/30 cursor-pointer'}`}
        >
          <Paperclip className="w-4 h-4" />
          <input 
            type="file" 
            multiple 
            onChange={handleFileChange} 
            className="hidden" 
            disabled={isStreaming || !isModelSelected} 
          />
        </label>
        <button 
          onClick={toggleRecording}
          className={`btn btn-secondary p-1.5 min-w-0 w-8 h-8 flex items-center justify-center ${isStreaming || !isModelSelected ? 'opacity-50 cursor-not-allowed' : isRecording ? 'bg-accent text-white' : 'hover:bg-white/20 dark:hover:bg-gray-700/30'}`}
          disabled={isStreaming || !isModelSelected}
          aria-label="Voice input"
        >
          <Mic className="w-4 h-4" />
        </button>
        <button 
          onClick={handleSendClick}
          disabled={isSendDisabled}
          className="btn btn-primary p-1.5 min-w-0 w-8 h-8 flex items-center justify-center"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
} 