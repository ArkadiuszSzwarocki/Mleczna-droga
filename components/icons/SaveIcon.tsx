import React from 'react';

const SaveIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 16.5V3.75m13.5 0h-1.5a2.25 2.25 0 00-2.25 2.25V7.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 3.75m13.5 0V7.5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h10.5M3.75 9.75h10.5M3.75 12.75h5.25" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.75H7.5" />
  </svg>
);

export default SaveIcon;