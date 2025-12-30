
import React from 'react';

const ViewfinderCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5a9 9 0 1118 0 9 9 0 01-18 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5h.008v.008H12V10.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 6.75h9m-9 7.5h9" />
  </svg>
);

export default ViewfinderCircleIcon;