import React from 'react';

const TemplateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.25A2.25 2.25 0 013 17.25V7.5A2.25 2.25 0 015.25 5.25H9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.25V3m0 2.25h4.5m-4.5 0a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25m-4.5 0h4.5m-4.5 0a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25m-1.5 13.5v-1.5m0 1.5a2.25 2.25 0 002.25-2.25v-1.5a2.25 2.25 0 00-2.25-2.25H16.5m-9 6h9" />
  </svg>
);

export default TemplateIcon;
