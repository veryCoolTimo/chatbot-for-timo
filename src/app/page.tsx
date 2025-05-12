'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import ChatWindow from '../components/ChatWindow';
import InputBar from '../components/InputBar';
import type { ChatMessage, Model } from '../lib/openrouter';
import { sendChat } from '../lib/openrouter';
import { createParser, EventSourceMessage } from 'eventsource-parser';
import { encode } from 'gpt-tokenizer';
import SettingsModal from '../components/SettingsModal';
import copy from 'copy-to-clipboard';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentModel, setCurrentModel] = useState<Model | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [customModels, setCustomModels] = useState<Model[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (chatWindowRef.current && chatWindowRef.current.children[0]) {
      const chatContainer = chatWindowRef.current.children[0];
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const countTokens = () => {
      if (messages.length > 0) {
        const allContent = messages.map(m => m.content).join('\n');
        try {
          const tokens = encode(allContent).length;
          setTokenCount(tokens);
        } catch (e) {
          console.warn("Could not encode tokens, estimating from length:", e);
          setTokenCount(Math.round(allContent.length / 4)); // Fallback to rough estimate
        }
      } else {
        setTokenCount(0);
      }
    };
    countTokens();
  }, [messages]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd + K to focus on textarea
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
      
      // Check for Ctrl/Cmd + / to toggle help modal
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setIsHelpModalOpen(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleNewChat = () => {
    setMessages([]);
    setTokenCount(0);
    setInputValue("");
  };

  const handleModelChange = (model: Model | null) => {
    setCurrentModel(model);
    // Optionally reset chat when model changes
    // handleNewChat(); 
  };

  const handleToggleSettings = () => {
    setIsSettingsModalOpen(!isSettingsModalOpen);
  };

  const handleAddModel = (modelId: string) => {
    if (!modelId.trim()) return;
    // Create a temporary Model object for the custom ID
    const customModel: Model = {
      id: modelId.trim(),
      name: `${modelId.trim()} (Custom)`,
      description: 'Custom model added via settings',
      pricing: { prompt: 0, completion: 0 }
    };
    setCurrentModel(customModel);
    setCustomModels(prev => prev.some(m => m.id === customModel.id) ? prev : [...prev, customModel]);
    setIsSettingsModalOpen(false);
  };

  const handleEditMessage = (index: number) => {
    const messageToEdit = messages[index];
    if (messageToEdit && messageToEdit.role === 'user') {
      setInputValue(messageToEdit.content);
      setEditingIndex(index);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      setMessages(prev => prev.filter((_, i) => i !== index));
      setEditingIndex(null);
    }
  };

  const handleSend = async (content: string, files?: File[]) => {
    const finalContent = content || inputValue;
    if (!currentModel) {
      alert('Please select a model first.');
      return;
    }
    if (isStreaming && !finalContent && (!files || files.length === 0)) return;

    const newMessage: ChatMessage = { role: 'user', content: finalContent };
    setMessages(prev => [...prev, newMessage]);
    setInputValue("");
    setIsStreaming(true);

    try {
      const apiMessages = [...messages, newMessage].map(({ role, content }) => ({ role, content }));

      const stream = await sendChat(apiMessages, currentModel.id, files);

      if (!stream) {
        throw new Error('No stream received from sendChat');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      
      const parser = createParser({ 
        onEvent: (event: EventSourceMessage) => { 
          if (event.data === '[DONE]') {
            setIsStreaming(false);
            return;
          }
          if (event.data) {
            try {
              const json = JSON.parse(event.data);
              const textChunk = json.choices?.[0]?.delta?.content;
              if (textChunk) {
                setMessages(prev => {
                  const lastMsgIndex = prev.length - 1;
                  if (lastMsgIndex < 0 || prev[lastMsgIndex].role !== 'assistant') {
                    return [...prev, {role: 'assistant', content: textChunk}];
                  }
                  const updatedMessages = [...prev];
                  updatedMessages[lastMsgIndex] = {
                    ...updatedMessages[lastMsgIndex],
                    content: updatedMessages[lastMsgIndex].content + textChunk,
                  };
                  return updatedMessages;
                });
              }
            } catch (e) {
              // It might not be JSON, could be other event types or malformed data
              // console.error('Error parsing JSON chunk:', event.data, e);
            }
          }
        }
      });

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (done) {
          setIsStreaming(false);
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        parser.feed(chunk);
      }

    } catch (error) {
      console.error("Error sending message or processing stream:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error instanceof Error ? error.message : String(error)}` }]);
      setIsStreaming(false);
    }
  };

  return (
    <div className="main-container flex flex-col min-h-screen">
      <div className="chat-shell flex flex-col min-h-screen">
        <Header 
          currentModel={currentModel}
          onModelChange={handleModelChange}
          onNewChat={handleNewChat}
          tokenCount={tokenCount}
          onToggleSettings={handleToggleSettings}
          customModels={customModels}
        />
        <div ref={chatWindowRef} className="flex-1 min-h-0 w-full max-w-full flex flex-col items-center overflow-y-auto">
          <ChatWindow 
            messages={messages} 
            isStreaming={isStreaming} 
            onEditMessage={handleEditMessage}
            editingIndex={editingIndex}
            setEditingIndex={setEditingIndex}
          />
        </div>
        <InputBar 
          initialValue={inputValue}
          onSend={handleSend} 
          isStreaming={isStreaming} 
          isModelSelected={!!currentModel}
          textareaRef={textareaRef} 
        />
      </div>
      {/* Settings Modal */}
      {isSettingsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <SettingsModal 
              isOpen={isSettingsModalOpen} 
              onClose={handleToggleSettings}
              onAddModel={handleAddModel}
            />
          </div>
        </div>
      )}
      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="glass-card p-6 relative">
              <button 
                onClick={() => setIsHelpModalOpen(false)}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors"
                aria-label="Close help modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Keyboard Shortcuts</h2>
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex justify-between items-center"> 
                  <span>Focus message input</span>
                  <span className="glass-surface px-2 py-0.5 text-xs rounded-lg shadow-none">Ctrl/⌘ + K</span> 
                </div>
                <div className="flex justify-between items-center">
                  <span>Toggle this help</span>
                  <span className="glass-surface px-2 py-0.5 text-xs rounded-lg shadow-none">Ctrl/⌘ + /</span> 
                </div>
                <div className="flex justify-between items-center">
                  <span>Send message</span>
                  <span className="glass-surface px-2 py-0.5 text-xs rounded-lg shadow-none">Enter</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>New line in message</span>
                  <span className="glass-surface px-2 py-0.5 text-xs rounded-lg shadow-none">Shift + Enter</span> 
                </div>
                <div className="flex justify-between items-center">
                  <span>Cancel editing</span>
                  <span className="glass-surface px-2 py-0.5 text-xs rounded-lg shadow-none">Esc</span> 
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 