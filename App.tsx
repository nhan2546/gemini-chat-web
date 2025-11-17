import React, { useState, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { UserProfile } from './components/UserProfile';
import { ChatWindow } from './components/ChatWindow';
import { ChatInput } from './components/ChatInput';
import { Message, Sender } from './types';
import { geminiService } from './services/geminiService';

const App: React.FC = () => {
  /* ------------------------------------------------------------------ */
  /* 1️⃣ Tạo / lấy sessionId – chỉ tạo một lần khi component mount      */
  /* ------------------------------------------------------------------ */
  const sessionId = useMemo<string>(() => {
    const saved = localStorage.getItem('geminiSessionId');
    if (saved) return saved;               // đã có → dùng lại

    // Trình duyệt hiện đại có randomUUID; nếu muốn fallback thì
    // import { v4 as uuidv4 } from 'uuid' và dùng uuidv4()
    const id = crypto.randomUUID();
    localStorage.setItem('geminiSessionId', id);
    return id;
  }, []); // <‑‑ [] = run once, giống lazy‑init của useState

  /* ------------------------------------------------------------------ */
  /* 2️⃣ Danh sách tin nhắn (state)                                      */
  /* ------------------------------------------------------------------ */
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-message',
      text:
        "Hello! My name is Táo. I'm your AI sales assistant for Apple products. How can I help you today?",
      sender: Sender.AI,
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);

  /* ------------------------------------------------------------------ */
  /* 3️⃣ Gửi tin nhắn tới Gemini (có truyền sessionId)                  */
  /* ------------------------------------------------------------------ */
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMessage: Message = {
        id: Date.now().toString(),
        text,
        sender: Sender.USER,
      };
      setMessages(prev => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // ←*** Ở đây truyền sessionId ***/
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
          id: (Date.now() + 2).toString(),
          text:
            'Sorry, I seem to be having trouble connecting. Please try again in a moment.',
          sender: Sender.AI,
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId]                // <-- phụ thuộc duy nhất
  );

  /* ------------------------------------------------------------------ */
  /* 4️⃣ Giao diện UI                                                    */
  /* ------------------------------------------------------------------ */
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
