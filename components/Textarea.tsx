import React, { forwardRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id?: string;
  error?: string;
  className?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  id,
  error,
  className = '',
  ...props
}, ref) => {
  const textareaId = id || `textarea-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        ref={ref}
        rows={4}
        className={`block w-full px-4 py-2 text-gray-900 dark:text-gray-200 border rounded-lg shadow-sm sm:text-sm 
                  ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500 dark:border-red-400' 
                         : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500 dark:border-secondary-600 dark:focus:border-primary-400'
                  }
                  ${props.disabled ? 'bg-gray-100 dark:bg-secondary-700 cursor-not-allowed' 
                                   : (className || 'bg-white dark:bg-secondary-800')
                  }
                  `}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});

export default Textarea;
