import React from 'react';

const WarehouseIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18h16.5a1.5 1.5 0 011.5 1.5v16.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V4.5a1.5 1.5 0 011.5-1.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5h.01M8.25 10.5h.01M8.25 13.5h.01M12 7.5h.01M12 10.5h.01M12 13.5h.01M15.75 7.5h.01M15.75 10.5h.01M15.75 13.5h.01" />
  </svg>
);

export default WarehouseIcon;
