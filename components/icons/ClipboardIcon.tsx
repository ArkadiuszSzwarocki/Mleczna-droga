
import React from 'react';

const ClipboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.25a2.25 2.25 0 012.25-2.25h1.5A2.25 2.25 0 0115 5.25v2.25m-6-4.5h6m-6 4.5H6.375a2.25 2.25 0 00-2.25 2.25v11.25c0 1.242.98 2.25 2.25 2.25h11.25c1.242 0 2.25-.98 2.25-2.25v-11.25a2.25 2.25 0 00-2.25-2.25H17.25" />
  </svg>
);

export default ClipboardIcon;
