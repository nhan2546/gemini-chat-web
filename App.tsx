
import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { UserProfile } from './components/UserProfile';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { Message, Sender } from './types';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  const sessionId = React.useMemo(() => {
  const saved = localStorage.getItem('geminiSessionId');
  if (saved) return saved;

  const id = crypto.randomUUID();   // hoặc require('uuid').v4()
  localStorage.setItem('geminiSessionId', id);
  return id;
  });

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-message',
      text: "Hello! My name is Táo. I'm your AI sales assistant for Apple products. How can I help you today?",
      sender: Sender.AI,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: Sender.USER,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const aiResponseText = await geminiService.sendMessage(text, sessionId);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        sender: Sender.AI,
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I seem to be having trouble connecting. Please try again in a moment.',
        sender: Sender.AI,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans max-w-md mx-auto border-x border-gray-700">
      <Header />
      <UserProfile />
      <ChatWindow messages={messages} isLoading={isLoading} />
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default App;
