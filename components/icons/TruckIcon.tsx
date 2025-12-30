import React from 'react';

const TruckIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M20,8h-3V4c0-1.103-0.897-2-2-2H4C2.897,2,2,2.897,2,4v11c0,1.103,0.897,2,2,2h1
c0,1.654,1.346,3,3,3s3-1.346,3-3h4c0,1.654,1.346,3,3,3s3-1.346,3-3h1c1.103,0,2-0.897,2-2v-5C22,8.897,21.103,8,20,8z M8,18
c-0.552,0-1-0.448-1-1s0.448-1,1-1s1,0.448,1,1S8.552,18,8,18z M18,18c-0.552,0-1-0.448-1-1s0.448-1,1-1s1,0.448,1,1
S18.552,18,18,18z M20,12h-3V9h3V12z" />
  </svg>
);

export default TruckIcon;