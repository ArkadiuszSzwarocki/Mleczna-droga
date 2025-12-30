import React from 'react';

interface StatCardProps {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    onClick?: () => void;
    colorClass?: string;
    layout?: 'icon-left' | 'icon-right';
    valueSize?: 'text-2xl' | 'text-4xl';
    className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
    label,
    value,
    icon,
    onClick,
    colorClass,
    layout = 'icon-left',
    valueSize = 'text-2xl',
    className = ''
}) => {
    const isClickable = !!onClick;
    const Component = isClickable ? 'button' : 'div';

    const baseClasses = `group bg-white dark:bg-secondary-800 w-full text-left transition-transform transform`;
    const interactiveClasses = isClickable ? 'enabled:hover:-translate-y-1 enabled:hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:ring-offset-secondary-800' : '';
    const disabledClasses = !isClickable ? '' : 'disabled:cursor-default';
    
    const defaultStyling = 'p-4 rounded-lg shadow-md';

    const containerClasses = `${baseClasses} ${interactiveClasses} ${disabledClasses} ${className || defaultStyling}`;
    
    const iconElement = colorClass ? (
        <div className={`p-3 rounded-lg ${colorClass}`}>
            {icon}
        </div>
    ) : icon;

    if (layout === 'icon-right') {
        return (
            <Component onClick={onClick} disabled={!isClickable} className={`${containerClasses} flex items-center justify-between`}>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                    <p className={`${valueSize} font-bold text-gray-800 dark:text-gray-200`}>{value}</p>
                </div>
                {iconElement}
            </Component>
        );
    }
    
    return (
        <Component onClick={onClick} disabled={!isClickable} className={`${containerClasses} flex items-center gap-4`}>
            {iconElement}
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                <p className={`${valueSize} font-bold text-gray-800 dark:text-gray-200`}>{value}</p>
            </div>
        </Component>
    );
};

export default StatCard;