import React from 'react';

interface MixerIconProps extends React.SVGProps<SVGSVGElement> {
  title?: string;
}

const MixerIcon: React.FC<MixerIconProps> = ({ title, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {/* FIX: Added title element for accessibility and to resolve prop error. */}
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69a.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-3.462 1.68-6.57 4.286-8.457a.75.75 0 01.819.162z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.034 11.034L12 12m0 0l.966-.966m-.966.966l-.966.966m.966-.966l.966.966M12 21a9 9 0 110-18 9 9 0 010 18z" />
  </svg>
);

export default MixerIcon;
