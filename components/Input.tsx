
import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id?: string;
  type?: string;
  error?: string;
  className?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  uppercase?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  id,
  type = 'text',
  error,
  className = '',
  icon,
  rightIcon,
  onRightIconClick,
  uppercase,
  onChange,
  ...props
}, ref) => {
  const inputId = id || `input-${label.replace(/\s+/g, '-').toLowerCase()}`;
  const hasIcon = !!icon;
  const hasRightIcon = !!rightIcon;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (uppercase && e.target.value) {
      e.target.value = e.target.value.toUpperCase();
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      <div className="relative rounded-md shadow-sm">
        {hasIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                {icon}
            </div>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          onWheel={(e) => type === 'number' && e.currentTarget.blur()}
          className={`block w-full px-4 py-2 text-gray-900 dark:text-gray-200 border rounded-lg shadow-sm sm:text-sm 
                    ${hasIcon ? 'pl-10' : ''}
                    ${hasRightIcon ? 'pr-10' : ''}
                    ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500 dark:border-red-400' 
                           : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500 dark:border-secondary-600 dark:focus:border-primary-400'
                    }
                    ${props.disabled ? 'bg-gray-100 dark:bg-secondary-700 cursor-not-allowed' 
                                     : (className || 'bg-white dark:bg-secondary-800')
                    }
                    `}
          onChange={handleInputChange}
          {...props}
        />
        {hasRightIcon && (
             <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <button type="button" onClick={onRightIconClick} className="text-gray-400 hover:text-gray-600">
                    {rightIcon}
                </button>
            </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
});

export default Input;
