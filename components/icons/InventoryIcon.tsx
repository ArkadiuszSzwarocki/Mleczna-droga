
import React from 'react';

const InventoryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125V6.375m1.125 13.125A1.125 1.125 0 003.375 21h17.25c.621 0 1.125-.504 1.125-1.125V6.375m-18.375 0h18.375M3.375 6.375c0-1.125.9-2.025 2.025-2.025h13.2c1.125 0 2.025.9 2.025 2.025M16.5 6.375v3.375m-6-3.375v3.375m-6 0v3.375" />
  </svg>
);

export default InventoryIcon;
