import React from 'react';

const StationIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v8H4z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12l4 6h4l4-6H6z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 18h4v3h-4z" />
  </svg>
);

export default StationIcon;
