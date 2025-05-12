'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Paperclip, X } from 'lucide-react';

interface InputBarProps {
  onSend: (message: string, files?: File[]) => void;
  isStreaming: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
}

// Define Window with SpeechRecognition interface for TypeScript
interface WindowWithSpeechRecognition extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

export default function InputBar({ onSend, isStreaming, textareaRef: externalTextareaRef }: InputBarProps) {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  
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

  // Setup speech recognition
  useEffect(() => {
    // Check if speech recognition is available in the browser
    if (typeof window !== 'undefined') {
      try {
        const windowWithSpeech = window as unknown as WindowWithSpeechRecognition;
        const SpeechRecognition = windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.lang = 'ru-RU';
          recognitionRef.current.interimResults = true;
          recognitionRef.current.continuous = false;
          
          recognitionRef.current.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((result: any) => result[0].transcript)
              .join('');
            
            setInput(transcript);
          };
          
          recognitionRef.current.onend = () => {
            setIsRecording(false);
            // Auto-send if there's content and recording was active
            if (input.trim() && isRecording) {
              handleSend();
            }
          };
          
          recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsRecording(false);
          };
        }
      } catch (e) {
        console.error('Speech recognition not supported', e);
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
      }
    };
  }, [input, isRecording]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      console.warn('Speech recognition not available');
      return;
    }
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setInput('');
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Error starting speech recognition', e);
      }
    }
  };

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (trimmedInput || files.length > 0) {
      onSend(trimmedInput, files);
      setInput('');
      setFiles([]);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
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

  const disabled = isStreaming;

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
                  disabled={disabled}
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
          {/* File input button */}
          <label className={`p-2 rounded-lg ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20 dark:hover:bg-gray-700/30 cursor-pointer'}`}>
            <Paperclip className="w-5 h-5" />
            <input 
              type="file" 
              multiple 
              onChange={handleFileChange} 
              className="hidden" 
              disabled={disabled} 
            />
          </label>
          
          {/* Mic button */}
          <button 
            onClick={toggleRecording}
            className={`p-2 rounded-lg ${disabled ? 'opacity-50 cursor-not-allowed' : isRecording ? 'bg-[#6D8CFF] text-white' : 'hover:bg-white/20 dark:hover:bg-gray-700/30'}`} 
            disabled={disabled}
            aria-label="Voice input"
          >
            <Mic className="w-5 h-5" />
          </button>
          
          {/* Text input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !disabled) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isDragging ? "Drop files here..." : isRecording ? "Говорите..." : "Type a message or drop files..."}
            className="flex-1 bg-transparent focus:outline-none resize-none overflow-y-auto max-h-40 no-scrollbar"
            rows={1}
            disabled={disabled}
          />
          
          {/* Send button */}
          <button 
            onClick={handleSend}
            disabled={(!input.trim() && files.length === 0) || disabled}
            className={`p-2 rounded-lg ${
              (!input.trim() && files.length === 0) || disabled
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-[#6D8CFF] hover:bg-[#829CFF] text-white'
            }`}
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
} 