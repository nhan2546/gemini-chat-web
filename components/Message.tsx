
import React from 'react';
import { Message as MessageType, Sender } from '../types';

interface MessageProps {
  message: MessageType;
}

export const Message: React.FC<MessageProps> = ({ message }) => {
  const isUser = message.sender === Sender.USER;

  const containerClasses = isUser ? 'flex justify-end' : 'flex justify-start';
  const bubbleClasses = isUser
    ? 'bg-blue-600 text-white rounded-l-lg rounded-br-lg'
    : 'bg-gray-700 text-gray-200 rounded-r-lg rounded-bl-lg';

  return (
    <div className={containerClasses}>
      <div className={`p-4 max-w-sm lg:max-w-md shadow-md ${bubbleClasses}`}>
        <p className="text-sm break-words">{message.text}</p>
      </div>
    </div>
  );
};
