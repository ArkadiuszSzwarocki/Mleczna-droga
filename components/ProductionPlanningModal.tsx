
import React from 'react';

const ProductionPlanningModal: React.FC<any> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold">Planowanie Produkcji (Placeholder)</h2>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded">Zamknij</button>
            </div>
        </div>
    );
};

export { ProductionPlanningModal };
