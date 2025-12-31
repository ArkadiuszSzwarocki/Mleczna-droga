

import React from 'react';

// FIX: Added type alias for props to support an optional title for accessibility and resolve type assignment errors in components using this icon.
type PencilIconProps = React.SVGProps<SVGSVGElement> & {
  title?: string;
};

const PencilIcon: React.FC<PencilIconProps> = ({ title, ...props }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    {title && <title>{title}</title>}
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
  </svg>
);

export default PencilIcon;
