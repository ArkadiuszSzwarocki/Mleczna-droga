
import React from 'react';

// FIX: Changed interface to a type alias to correctly inherit all button attributes, resolving multiple type errors.
type ButtonProps = {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) => {
  const baseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150";

  const variantClasses = {
    primary: 'text-white bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
    secondary: 'text-gray-700 bg-gray-200 hover:bg-gray-300 focus:ring-primary-500 dark:bg-secondary-700 dark:text-gray-200 dark:hover:bg-secondary-600',
    danger: 'text-white bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {leftIcon && <span className="mr-2 -ml-1" aria-hidden="true">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2 -mr-1" aria-hidden="true">{rightIcon}</span>}
    </button>
  );
};

export default Button;
