
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
      text: "Chào bạn! Tôi là Táo, trợ lý AI của Shop Táo Ngon. Tôi có thể giúp gì cho bạn hôm nay?",
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
      const aiResponseText = await geminiService.sendMessage(text);
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
        text: 'Xin lỗi, Táo đang gặp sự cố kết nối. Vui lòng thử lại sau giây lát.',
        sender: Sender.AI,
      };
      setMessages(prev => [...prev, errorMessage]);
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
