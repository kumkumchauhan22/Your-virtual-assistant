
import React from 'react';

const FriendsLogo: React.FC = () => {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
      
      {/* Animated Friends Container */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10 drop-shadow-2xl"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Friend 1 (Left) */}
        <g className="animate-bounce" style={{ animationDuration: '2.5s' }}>
          <circle cx="30" cy="55" r="12" fill="url(#grad1)" />
          <path d="M22 65 Q30 75 38 65" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </g>
        
        {/* Friend 2 (Right) */}
        <g className="animate-bounce" style={{ animationDuration: '3s', animationDelay: '0.2s' }}>
          <circle cx="70" cy="55" r="12" fill="url(#grad2)" />
          <path d="M62 65 Q70 75 78 65" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </g>
        
        {/* Friend 3 (Center/Back) */}
        <g className="animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.5s' }}>
          <circle cx="50" cy="40" r="14" fill="url(#grad3)" />
          <circle cx="45" cy="38" r="1.5" fill="white" />
          <circle cx="55" cy="38" r="1.5" fill="white" />
          <path d="M46 44 Q50 48 54 44" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* Gradients */}
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#be185d" />
          </linearGradient>
          <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#7e22ce" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

export default FriendsLogo;
