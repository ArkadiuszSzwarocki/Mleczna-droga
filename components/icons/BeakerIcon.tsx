import React from 'react';

const BeakerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.25M9.75 3.104a2.25 2.25 0 00-2.25 2.25v4.504a2.25 2.25 0 00.659 1.591L9.5 14.25m3.75-9.146a2.25 2.25 0 012.25 2.25v4.504a2.25 2.25 0 01-.659 1.591L14 14.25m-3.75-9.146V3.104a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25v5.714m-3.75 0h3.75M3 14.25h18M3 14.25a2.25 2.25 0 00-2.25 2.25v.75c0 1.242.98 2.25 2.25 2.25h18a2.25 2.25 0 002.25-2.25v-.75a2.25 2.25 0 00-2.25-2.25M3 14.25v-2.25c0-.98.787-1.768 1.75-1.768h14.5c.963 0 1.75.788 1.75 1.768v2.25" />
  </svg>
);

export default BeakerIcon;