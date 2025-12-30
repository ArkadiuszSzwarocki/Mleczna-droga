import React from 'react';

const MLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#60a5fa" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="12" fill="url(#logo-gradient)" />
    <path
      d="M7 15V9.5C7 8.5 7.5 8 8.5 8H9.5M15 15V9.5C15 8.5 14.5 8 13.5 8H12.5M9.5 8L12 11L12.5 8"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default MLogoIcon;