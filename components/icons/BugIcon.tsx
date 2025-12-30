
import React from 'react';

const BugIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21v-4.591m0 4.591a8.962 8.962 0 01-3.956-1.857m3.956 1.857a8.962 8.962 0 003.956-1.857m-3.956-1.857v-4.591m0 4.591L8.044 12.04M15.956 16.409L12 11.819m0 0L8.044 16.409m3.956-4.59L12 7.23m0 4.59l3.956-4.59M8.044 12.04L12 7.23m3.956 4.59l3.956-4.59M8.044 12.04L4.088 7.45m11.824 4.59l3.956 4.59M4.088 7.45L12 3m8.716 9.747a9.004 9.004 0 00-8.716-6.747M3.284 14.251a9.004 9.004 0 008.716 6.747" />
  </svg>
);

export default BugIcon;
