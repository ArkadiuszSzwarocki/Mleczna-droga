import React from 'react';

const EditIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 19.82a2.25 2.25 0 01-1.061.641l-4.5 1.125a.75.75 0 01-.92-1.003l1.125-4.5a2.25 2.25 0 01.641-1.061L16.862 4.487z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12.75v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18.75v-13.5A2.25 2.25 0 015.25 3H11.25" />
  </svg>
);

export default EditIcon;
