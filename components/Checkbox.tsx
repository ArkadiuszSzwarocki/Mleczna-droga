import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, id, ...props }) => {
  const checkboxId = id || `checkbox-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="relative flex items-start">
      <div className="flex h-6 items-center">
        <input
          id={checkboxId}
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 dark:border-secondary-600 text-primary-600 focus:ring-primary-600 dark:bg-secondary-700 dark:ring-offset-secondary-800"
          {...props}
        />
      </div>
      <div className="ml-3 text-sm leading-6">
        <label htmlFor={checkboxId} className="font-medium text-gray-900 dark:text-gray-300 cursor-pointer">
          {label}
        </label>
      </div>
    </div>
  );
};

export default Checkbox;