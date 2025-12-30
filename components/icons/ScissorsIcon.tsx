import React from 'react';

const ScissorsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l-1.26.315a1.125 1.125 0 00-1.059 1.213 12.01 12.01 0 00.234 3.545 12.01 12.01 0 003.545.234 1.125 1.125 0 001.213-1.06l.315-1.26m9.422 0l-1.26-.315a1.125 1.125 0 01-1.059-1.213 12.01 12.01 0 01-.234-3.545 12.01 12.01 0 01-3.545-.234 1.125 1.125 0 01-1.213 1.06l-.315 1.26m9.422 0a1.125 1.125 0 00-1.213-1.06l-1.26.315m0 0l-3.545 3.546a1.125 1.125 0 01-1.591 0l-3.545-3.546m0 0a1.125 1.125 0 00-1.213 1.06l-1.26.315m0 0l3.545 3.546a1.125 1.125 0 001.591 0l3.545-3.546m-3.545-3.546a1.125 1.125 0 011.213-1.06l1.26-.315" />
  </svg>
);

export default ScissorsIcon;
