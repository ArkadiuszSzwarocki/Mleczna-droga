import React from 'react';
// FIX: Removed .tsx extension from icon imports to resolve module loading errors.
import { useAppContext } from './contexts/AppContext';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import Button from './Button';
import { formatDate } from '../src/utils';
// FIX: Removed .tsx extension from icon imports.
import DocumentTextIcon from './icons/DocumentTextIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import { View } from '../types';

const PsdReportsPage: React.FC = () => {
    const { psdTasks, handleSetView } = useAppContext();

    const completedTasks = (psdTasks || []).filter((task: any) => task.status === 'completed');

    const { items: sortedTasks, requestSort, sortConfig } = useSortableData(completedTasks, { key: 'completedAt', direction: 'descending' });

    const handleViewReport = (taskId: string) => {
        // FIX: Corrected view number to use enum for type safety
        handleSetView(View.PSD_TASK_REPORT, { taskId }); 
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex items-center mb-6 border-b dark:border-secondary-600 pb-3">
                <DocumentTextIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Raporty Produkcji Specjalnej (PSD)</h2>
            </header>

            <div className="flex-grow overflow-auto">
                {sortedTasks.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">Brak zakończonych zadań PSD do wyświetlenia.</p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                        <thead className="bg-gray-50 dark:bg-secondary-700">
                            <tr>
                                <SortableHeader columnKey="id" sortConfig={sortConfig} requestSort={requestSort}>ID Zadania</SortableHeader>
                                <SortableHeader columnKey="name" sortConfig={sortConfig} requestSort={requestSort}>Nazwa Zlecenia</SortableHeader>
                                <SortableHeader columnKey="recipeName" sortConfig={sortConfig} requestSort={requestSort}>Produkt</SortableHeader>
                                <SortableHeader columnKey="completedAt" sortConfig={sortConfig} requestSort={requestSort}>Data Zakończenia</SortableHeader>
                                <th className="px-3 py-2 text-right">Akcje</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {sortedTasks.map((task: any) => (
                                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                    <td className="px-3 py-2 whitespace-nowrap font-mono text-primary-600 dark:text-primary-400">{task.id}</td>
                                    <td className="px-3 py-2 font-medium">{task.name}</td>
                                    <td className="px-3 py-2">{task.recipeName}</td>
                                    <td className="px-3 py-2">{formatDate(task.completedAt, true)}</td>
                                    <td className="px-3 py-2 text-right">
                                        <Button onClick={() => handleViewReport(task.id)} variant="secondary" className="text-xs" leftIcon={<ArrowRightIcon className="h-4 w-4"/>}>
                                            Zobacz Raport
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default PsdReportsPage;
