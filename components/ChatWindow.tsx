import React, { useRef, useEffect } from 'react';
import { Message as MessageType, Sender } from '../types';
import { Message } from './Message';

interface ChatWindowProps {
  messages: MessageType[];
  isLoading: boolean;
}

const TypingIndicator: React.FC = () => (
  <div className="flex justify-start">
    <div className="p-4 max-w-sm lg:max-w-md shadow-md bg-gray-700 text-gray-200 rounded-r-lg rounded-bl-lg">
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
      </div>
    </div>
  </div>
);

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, isLoading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex flex-col space-y-4">
        {messages.map((msg) => {
          // If the message is the empty AI placeholder while loading, show the indicator instead.
          if (msg.sender === Sender.AI && msg.text === '' && isLoading) {
            return <TypingIndicator key="typing-indicator" />;
          }
          return <Message key={msg.id} message={msg} />;
        })}
      </div>
    </div>
  );
};
