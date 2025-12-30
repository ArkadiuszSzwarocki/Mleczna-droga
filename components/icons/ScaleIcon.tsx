
import React from 'react';

const ScaleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c-.317.047-.634.09-.95.127m-11.6 0c.317.047.634.09.95.127m10.65 0A48.55 48.55 0 0112 5.25c-2.291 0-4.545-.16-6.75-.47m13.5 0v1.5a.75.75 0 01-.75.75h-12a.75.75 0 01-.75-.75v-1.5m13.5 0h-12" />
  </svg>
);

export default ScaleIcon;
