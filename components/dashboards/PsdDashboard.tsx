
import React, { useState, useMemo } from 'react';
import { usePsdContext } from '../contexts/PsdContext';
import { useUIContext } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { View, PsdTask } from '../../types';
import Button from '../Button';
import BeakerIcon from '../icons/BeakerIcon';
import PlayIcon from '../icons/PlayIcon';
import StartPsdBatchModal from '../StartPsdBatchModal';
import PsdTaskCard from '../PsdTaskCard';
import PinEntryModal from '../PinEntryModal';

interface PsdDashboardProps {
    isWidgetVisible: (id: string) => boolean;
}

const PsdDashboard: React.FC<PsdDashboardProps> = ({ isWidgetVisible }) => {
    const { psdTasks, handleUpdatePsdTask } = usePsdContext();
    const { handleSetView } = useUIContext();
    const { currentUser } = useAuth();
    const [taskToStart, setTaskToStart] = useState<PsdTask | null>(null);
    
    const [isPinModalOpen, setIsPinModalOpen] = useState(false);
    const [taskPendingPin, setTaskPendingPin] = useState<PsdTask | null>(null);
    const [pinError, setPinError] = useState<string | null>(null);


    const tasksToShow = useMemo(() => {
        return (psdTasks || [])
            .filter((task: PsdTask) => task.status === 'planned' || task.status === 'ongoing')
            .sort((a, b) => {
                if (a.status === 'ongoing' && b.status !== 'ongoing') return -1;
                if (a.status !== 'ongoing' && b.status === 'ongoing') return 1;
                return (a.orderIndex || 0) - (b.orderIndex || 0);
            });
    }, [psdTasks]);

    const handleStartClick = (task: PsdTask) => {
        setTaskPendingPin(task);
        setIsPinModalOpen(true);
    };

    const handlePinSuccess = () => {
        setIsPinModalOpen(false);
        setTaskToStart(taskPendingPin); // Open the next modal
        setTaskPendingPin(null);
    };

    const handlePinSubmit = (pin: string) => {
        setPinError(null);
        if (currentUser?.pin === pin) {
            handlePinSuccess();
        } else {
            setPinError('Nieprawidłowy kod PIN.');
        }
    };


    const handleContinueClick = (task: PsdTask) => {
        handleSetView(View.LPSD_PRODUCTION, { taskId: task.id });
    };

    const handleConfirmStart = (targetWeight: number) => {
        if (!taskToStart) return;
        const result = handleUpdatePsdTask(taskToStart.id, {
            type: 'START_FIRST_BATCH',
            payload: { targetWeight },
        });
        if (result.success) {
            handleSetView(View.LPSD_PRODUCTION, { taskId: taskToStart.id });
        }
        setTaskToStart(null);
    };

    return (
        <div className="space-y-8">
            <header className="border-b dark:border-secondary-600 pb-4">
                <div className="flex items-center">
                    <BeakerIcon className="h-10 w-10 text-primary-600 dark:text-primary-400 mr-3" />
                    <div>
                        <h2 className="text-3xl font-semibold text-primary-700 dark:text-primary-300">Pulpit Operatora PSD</h2>
                        <p className="text-md text-gray-500 dark:text-gray-400">Twoje zadania produkcyjne na dziś.</p>
                    </div>
                </div>
            </header>
            
            {isWidgetVisible('tasks_list') && (
                <section>
                    <h3 className="text-xl font-semibold mb-3 text-gray-800 dark:text-gray-200">Zlecenia do Realizacji</h3>
                    {tasksToShow.length > 0 ? (
                        <div className="space-y-4">
                            {tasksToShow.map(task => (
                                <PsdTaskCard 
                                    key={task.id} 
                                    task={task}
                                    onStart={handleStartClick}
                                    onContinue={handleContinueClick}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-slate-100 dark:bg-secondary-800/50 rounded-lg">
                            <p className="text-gray-500 dark:text-gray-400">Brak zaplanowanych zadań do realizacji.</p>
                        </div>
                    )}
                </section>
            )}

            <PinEntryModal
                isOpen={isPinModalOpen}
                onClose={() => {
                    setIsPinModalOpen(false);
                    setTaskPendingPin(null);
                    setPinError(null);
                }}
                onSubmit={handlePinSubmit}
                error={pinError}
            />

            {taskToStart && (
                <StartPsdBatchModal
                    isOpen={!!taskToStart}
                    onClose={() => setTaskToStart(null)}
                    task={taskToStart}
                    onConfirm={handleConfirmStart}
                />
            )}
        </div>
    );
};

export default PsdDashboard;
