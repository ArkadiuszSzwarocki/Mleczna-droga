import React from 'react';

const CalendarSlashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {/* Calendar Body */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    {/* Calendar day markers (optional, for a bit more detail) */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5H15v.008h.75V10.5zm0 3H15v.008h.75V13.5zm0 3H15v.008h.75V16.5zm-3.75-3H12v.008h.75V13.5zm0 3H12v.008h.75V16.5zm0-6H12v.008h.75V10.5zm-3.75 3H8.25v.008h.75V13.5zm0 3H8.25v.008h.75V16.5zm0-6H8.25v.008h.75V10.5z" />
    {/* Slash */}
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15" />
  </svg>
);

export default CalendarSlashIcon;