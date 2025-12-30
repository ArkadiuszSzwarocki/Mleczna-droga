
import React from 'react';
import Alert from '../Alert';
import ChartBarSquareIcon from '../icons/ChartBarSquareIcon';

const ProductionReportPage: React.FC = () => {
    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg flex flex-col items-center justify-center h-full">
            <ChartBarSquareIcon className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Raport Produkcji</h2>
            <p className="mt-2 text-gray-500 dark:text-gray-400">Ten widok jest w budowie.</p>
        </div>
    );
};

export default ProductionReportPage;
