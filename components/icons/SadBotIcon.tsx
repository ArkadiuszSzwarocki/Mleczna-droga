import React from 'react';

const SadBotIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" {...props}>
    <style>{`
      @keyframes sad-rock {
        0%, 100% { transform: rotate(-3deg); }
        50% { transform: rotate(3deg); }
      }
      .sad-bot-body {
        transform-origin: 50px 80px;
        animation: sad-rock 4s ease-in-out infinite;
      }
    `}</style>
    <g className="sad-bot-body">
      {/* Head */}
      <rect x="30" y="20" width="40" height="30" rx="5" fill="#cbd5e1" />
      {/* Eyes */}
      <line x1="40" y1="35" x2="48" y2="40" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      <line x1="48" y1="35" x2="40" y2="40" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="35" x2="68" y2="40" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      <line x1="68" y1="35" x2="60" y2="40" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      {/* Body */}
      <rect x="25" y="50" width="50" height="30" rx="5" fill="#94a3b8" />
      {/* Base */}
      <path d="M 20 80 A 30 10 0 0 0 80 80 Z" fill="#475569" />
    </g>
  </svg>
);

export default SadBotIcon;
