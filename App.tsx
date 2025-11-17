
import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { Message, Sender } from './types';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
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

    const aiMessageId = (Date.now() + 1).toString();
    const aiPlaceholder: Message = {
        id: aiMessageId,
        text: '',
        sender: Sender.AI,
    };

    setMessages(prev => [...prev, userMessage, aiPlaceholder]);
    setIsLoading(true);

    try {
      await geminiService.sendMessage(text, (chunk) => {
        setMessages(prev => prev.map(m => 
            m.id === aiMessageId 
                ? { ...m, text: m.text + chunk } 
                : m
        ));
      });
    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      setMessages(prev => prev.map(m => 
        m.id === aiMessageId 
            ? { ...m, text: 'Xin lỗi, Táo đang gặp sự cố kết nối. Vui lòng thử lại sau giây lát.' } 
            : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white font-sans max-w-md mx-auto border-x border-gray-700">
      <Header />
      <ChatWindow messages={messages} isLoading={isLoading} />
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default App;
