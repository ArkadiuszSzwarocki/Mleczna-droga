
import React from 'react';

const DocumentCheckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> {/* Circle Check part */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.25A2.25 2.25 0 013 17.25V7.5A2.25 2.25 0 015.25 5.25H9" /> {/* Document part */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.25V3m0 2.25h4.5M9 9.75h4.5M9 14.25h1.033" />
  </svg>
);
export default DocumentCheckIcon;