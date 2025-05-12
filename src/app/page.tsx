'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import ChatWindow from '../components/ChatWindow';
import InputBar from '../components/InputBar';
import type { ChatMessage } from '../lib/openrouter';
import { sendChat } from '../lib/openrouter';
import { createParser } from 'eventsource-parser';
import { encode } from 'gpt-tokenizer';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('openai/gpt-3.5-turbo');
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokenCount, setTokenCount] = useState(0);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
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
  }, [messages, currentModel]);

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
  };

  const handleSend = async (content: string, files?: File[]) => {
    if (isStreaming && !content && (!files || files.length === 0)) return;

    const newMessage: ChatMessage = { role: 'user', content };
    setMessages(prev => [...prev, newMessage]);
    setIsStreaming(true);

    try {
      const apiMessages = [...messages, newMessage].map(({ role, content }) => ({ role, content }));

      const stream = await sendChat(apiMessages, currentModel, files);

      if (!stream) {
        throw new Error('No stream received from sendChat');
      }

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      
      // @ts-ignore - Suppress TypeScript error for createParser callback
      const parser = createParser((event: any) => { 
        if (event.type === 'event') {
          if (event.data === '[DONE]') {
            setIsStreaming(false);
            return;
          }
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
            console.error('Error parsing JSON chunk:', event.data, e);
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-blue-100 dark:from-gray-900 dark:to-blue-950 font-inter">
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:[mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none"></div>
      <Header 
        currentModel={currentModel}
        onModelChange={setCurrentModel}
        onNewChat={handleNewChat}
        tokenCount={tokenCount}
      />
      <div ref={chatWindowRef} className="flex-1 overflow-hidden">
        <ChatWindow messages={messages} />
      </div>
      <InputBar onSend={handleSend} isStreaming={isStreaming} textareaRef={textareaRef} />
      
      {/* Help Modal */}
      {isHelpModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="glass-card p-6 max-w-md mx-4 relative">
            <button 
              onClick={() => setIsHelpModalOpen(false)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200/20"
              aria-label="Close help modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h2 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Focus message input</span>
                <span className="glass-card px-2 py-1 text-sm">Ctrl/⌘ + K</span>
              </div>
              <div className="flex justify-between">
                <span>Toggle this help</span>
                <span className="glass-card px-2 py-1 text-sm">Ctrl/⌘ + /</span>
              </div>
              <div className="flex justify-between">
                <span>Send message</span>
                <span className="glass-card px-2 py-1 text-sm">Enter</span>
              </div>
              <div className="flex justify-between">
                <span>New line in message</span>
                <span className="glass-card px-2 py-1 text-sm">Shift + Enter</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 