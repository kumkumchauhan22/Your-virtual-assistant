
import React from 'react';
import { Message } from '../types';
import SourceLink from './SourceLink';

interface ChatBubbleProps {
  message: Message;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-xl ${
        isUser 
          ? 'bg-indigo-600 text-white rounded-br-none' 
          : message.isRoast 
            ? 'bg-gradient-to-br from-purple-900 to-indigo-950 text-slate-100 rounded-bl-none border border-purple-500/30'
            : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
      }`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${message.isRoast ? 'bg-pink-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {message.isRoast ? 'ZenRoast Mode' : 'Factual Mode'}
            </span>
          </div>
        )}
        <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
          {message.content}
        </div>
        {!isUser && message.sources && <SourceLink sources={message.sources} />}
      </div>
    </div>
  );
};

export default ChatBubble;
