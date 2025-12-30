

import React from 'react';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';

const alertConfig = {
  success: {
    icon: <CheckCircleIcon className="h-5 w-5" />,
    colorClasses: 'bg-green-100 border-green-400 text-green-800 dark:bg-green-900/50 dark:border-green-700 dark:text-green-200',
  },
  error: {
    icon: <XCircleIcon className="h-5 w-5" />,
    colorClasses: 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/50 dark:border-red-700 dark:text-red-200',
  },
  info: {
    icon: <InformationCircleIcon className="h-5 w-5" />,
    colorClasses: 'bg-blue-100 border-blue-400 text-blue-800 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-200',
  },
  warning: {
    icon: <ExclamationTriangleIcon className="h-5 w-5" />,
    colorClasses: 'bg-yellow-100 border-yellow-400 text-yellow-800 dark:bg-yellow-900/50 dark:border-yellow-700 dark:text-yellow-200',
  },
};

// Helper to check for basic HTML tags.
const containsHtml = (str: string) => /<[a-z][\s\S]*>/i.test(str);

// Component to render details safely.
const AlertDetails: React.FC<{ details: string }> = ({ details }) => {
    if (containsHtml(details)) {
        // Only use dangerouslySetInnerHTML for strings that actually contain HTML.
        return <p className="mt-1 text-xs" dangerouslySetInnerHTML={{ __html: details }}></p>;
    }
    // Render as plain text for safety otherwise.
    return <p className="mt-1 text-xs">{details}</p>;
};

const Alert = ({ type, message, details }: { type: 'success' | 'error' | 'info' | 'warning', message: string, details?: string | React.ReactNode }) => {
  const config = alertConfig[type];

  // Helper to render details which can be string (with potential HTML) or ReactNode
  const renderDetails = () => {
    if (!details) return null;
    if (typeof details === 'string') {
        return <AlertDetails details={details} />;
    }
    // It's a ReactNode, render it in a container that matches AlertDetails style
    return <div className="mt-1 text-xs">{details}</div>;
  };

  if (!config) {
    console.error(`Invalid alert type: "${type}". Rendering a default info alert.`);
    const fallbackConfig = alertConfig['info'];
    return (
      <div className={`p-4 border-l-4 rounded-md ${fallbackConfig.colorClasses}`} role="alert">
        <div className="flex">
          <div className="flex-shrink-0">{fallbackConfig.icon}</div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium break-words">{message}</p>
            {renderDetails()}
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className={`p-4 border-l-4 rounded-md ${config.colorClasses}`} role="alert">
      <div className="flex">
        <div className="flex-shrink-0">{config.icon}</div>
        <div className="ml-3 flex-1 min-w-0">
          <p className="text-sm font-medium break-words">{message}</p>
          {renderDetails()}
        </div>
      </div>
    </div>
  );
};

export default Alert;