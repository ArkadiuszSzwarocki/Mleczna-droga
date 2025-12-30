
import React from 'react';

const NfcIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12h7.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 17.25h7.5" />
  </svg>
);

export default NfcIcon;
