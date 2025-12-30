import React, { useState } from 'react';
import { MixingTask, Permission } from '../types';
import { useMixingContext } from './contexts/MixingContext';
import Button from './Button';
import { formatDate, getMixingTaskStatusLabel } from '../src/utils';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import MixerIcon from './icons/MixerIcon';
import PlusIcon from './icons/PlusIcon';
import AddMixingOrderModal from './AddMixingOrderModal';
import ConfirmationModal from './ConfirmationModal';
import { useAuth } from './contexts/AuthContext';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';

const MixingPlannerPage: React.FC = () => {
    const { mixingTasks, handleAddMixingTask, handleDeleteMixingTask, handleUpdateMixingTask } = useMixingContext();
    const { checkPermission } = useAuth();
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState<MixingTask | null>(null);

    const { items: sortedTasks, requestSort, sortConfig } = useSortableData(mixingTasks || [], { key: 'createdAt', direction: 'descending' });

    return (
        <>
            <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
                <header className="flex justify-between items-center mb-6 border-b dark:border-secondary-600 pb-3 gap-3">
                    <div className="flex items-center gap-3">
                        <MixerIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Planowanie Miksowania</h2>
                    </div>
                    {checkPermission(Permission.PLAN_MIXING) && <Button onClick={() => setIsAddModalOpen(true)} leftIcon={<PlusIcon className="h-5 w-5"/>}>Nowe Zlecenie</Button>}
                </header>
                <div className="flex-grow overflow-auto">
                    <table className="min-w-full text-sm">
                         <tbody className="divide-y dark:divide-secondary-700">
                            {sortedTasks.map(task => (
                                <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                    <td className="px-4 py-3 font-mono">{task.id}</td>
                                    <td className="px-4 py-3 font-semibold">{task.name}</td>
                                    <td className="px-4 py-3 text-right">{getMixingTaskStatusLabel(task.status)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <AddMixingOrderModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSave={(data) => handleAddMixingTask(data)} />
        </>
    );
};

export default MixingPlannerPage;