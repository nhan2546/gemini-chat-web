
import React from 'react';

export const Header: React.FC = () => {
  return (
    <div className="px-6 py-4 bg-gray-800 border-b border-gray-700 shadow-md">
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-green-400 flex items-center justify-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM8 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4zm4-2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </div>
          <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-gray-800"></span>
        </div>
        <div>
          <h1 className="text-lg font-semibold text-white">AI Sales Assistant</h1>
          <p className="text-sm text-green-400">Online</p>
        </div>
      </div>
    </div>
  );
};
