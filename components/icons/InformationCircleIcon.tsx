import React from 'react';

// FIX: Added interface for props to support an optional title for accessibility.
interface InformationCircleIconProps extends React.SVGProps<SVGSVGElement> {
  title?: string;
}

const InformationCircleIcon: React.FC<InformationCircleIconProps> = ({ title, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </svg>
);

export default InformationCircleIcon;