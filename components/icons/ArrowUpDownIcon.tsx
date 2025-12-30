

import React from 'react';

const ArrowUpDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v18m9-18L16.5 3m0 0L21 7.5m-4.5-4.5v18" />
  </svg>
);

export default ArrowUpDownIcon;
