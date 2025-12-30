
import React from 'react';

// FIX: Changed interface to a type alias to correctly inherit all select attributes.
type SelectProps = {
  label: string;
  id?: string;
  options: { value: string | number; label: string }[];
  error?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>;

const Select: React.FC<SelectProps> = ({ label, id, options, error, className, ...props }) => {
    const selectId = id || `select-${label.replace(/\s+/g, '-').toLowerCase()}`;

    return (
        <div className="w-full">
             {label && (
                <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label}
                </label>
             )}
            <select
                id={selectId}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm sm:text-sm focus:outline-none 
                    ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-secondary-600 focus:ring-primary-500 focus:border-primary-500'}
                    ${props.disabled ? 'bg-gray-100 dark:bg-secondary-700 cursor-not-allowed' : 'bg-white dark:bg-secondary-800'}
                    text-gray-900 dark:text-gray-200
                    ${className || ''}`}
                {...props}
            >
                {(options || []).map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
        </div>
    );
};

export default Select;
