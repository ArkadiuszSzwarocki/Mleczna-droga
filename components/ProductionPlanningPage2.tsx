import React, { useState, useMemo } from 'react';
import { PsdTask, View } from '../types';
import { usePsdContext } from './contexts/PsdContext';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import Button from './Button';
import { formatDate } from '../src/utils';
import PlusIcon from './icons/PlusIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import PsdTaskCard from './PsdTaskCard';
import ConfirmationModal from './ConfirmationModal';
import SetBatchSizeModal from './SetBatchSizeModal';


export const PsdWeeklyPlannerPage: React.FC = () => {
    const { modalHandlers, handleSetView } = useUIContext();
    const { currentUser } = useAuth();
    const { psdTasks, handleDeletePsdTask, handleUpdatePsdTask } = usePsdContext();
    const [weekOffset, setWeekOffset] = useState(0);
    const [taskToDelete, setTaskToDelete] = useState<PsdTask | null>(null);
    const [taskToStart, setTaskToStart] = useState<PsdTask | null>(null);
    const [isSetBatchSizeModalOpen, setIsSetBatchSizeModalOpen] = useState(false);


    const plannedTasks = useMemo(() => 
        (psdTasks || []).filter(t => t.status === 'planned' || t.status === 'ongoing'), 
    [psdTasks]);

    const { weekDates, weekTasks } = useMemo(() => {
        const today = new Date();
        today.setDate(today.getDate() + weekOffset * 7);
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
        startOfWeek.setHours(0, 0, 0, 0);

        const dates = Array.from({ length: 5 }).map((_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            return date;
        });

        const tasksByDate: Record<string, PsdTask[]> = {};
        plannedTasks.forEach(task => {
            const dateStr = task.plannedDate;
            if (!tasksByDate[dateStr]) {
                tasksByDate[dateStr] = [];
            }
            tasksByDate[dateStr].push(task);
        });

        return { weekDates: dates, weekTasks: tasksByDate };
    }, [weekOffset, plannedTasks]);
    
    const handleStartProduction = (task: PsdTask) => {
        setTaskToStart(task);
        setIsSetBatchSizeModalOpen(true);
    };

    const handleInitializeBatches = (batchSize: number) => {
        if (!currentUser) {
            console.error("Cannot initialize batches: User not logged in.");
            return;
        }
        if (taskToStart) {
            const result = handleUpdatePsdTask(taskToStart.id, { type: 'INITIALIZE_BATCHES', payload: { batchSize } });
            if (result.success) {
                handleSetView(View.LPSD_PRODUCTION);
            } else {
                alert(result.message);
            }
        }
        setIsSetBatchSizeModalOpen(false);
        setTaskToStart(null);
    };


    const handleAddTask = (date: Date) => {
        if (!currentUser) {
            console.error("Cannot create task: User not logged in.");
            return;
        }
        
        const psdPrefix = 'ZLEPSD';
        const existingPsdIds = (psdTasks || [])
            .map(task => task.id)
            .filter(id => id.startsWith(psdPrefix));
    
        let maxNumber = 0;
        if (existingPsdIds.length > 0) {
            maxNumber = Math.max(
                ...existingPsdIds.map(id => parseInt(id.replace(psdPrefix, ''), 10) || 0)
            );
        }
        
        const newSequence = maxNumber + 1;
        const newId = `${psdPrefix}${String(newSequence).padStart(5, '0')}`;
        
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const newTask: PsdTask = {
            id: newId,
            name: newId,
            recipeId: '',
            recipeName: '',
            targetQuantity: 0,
            plannedDate: dateStr,
            shelfLifeMonths: 0,
            status: 'planned',
            createdAt: new Date().toISOString(),
            createdBy: currentUser.username,
            batches: [],
        };
        modalHandlers.showPinPrompt(() => modalHandlers.openEditPsdTaskModal(newTask));
    };

    const handleEditTask = (task: PsdTask) => {
        modalHandlers.showPinPrompt(() => modalHandlers.openEditPsdTaskModal(task));
    };

    const confirmDelete = () => {
        if (taskToDelete && handleDeletePsdTask) {
            handleDeletePsdTask(taskToDelete.id);
        }
        setTaskToDelete(null);
    };
    
    const getWeekDisplayString = () => {
        const start = weekDates[0];
        const end = weekDates[weekDates.length - 1];
        return `${start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    };

    const DayColumn: React.FC<{ date: Date, tasks: PsdTask[] }> = ({ date, tasks }) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const isToday = date.getTime() === today.getTime();
        const isPast = date < today;
        const totalWeight = tasks.reduce((sum, task) => sum + task.targetQuantity, 0);

        return (
            <div className="bg-slate-100 dark:bg-secondary-900/70 rounded-lg p-3 flex flex-col">
                <h3 className={`font-semibold text-center mb-3 ${isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {date.toLocaleDateString('pl-PL', { weekday: 'long' })}
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
                    </span>
                </h3>
                <div className="flex justify-between items-baseline text-xs mb-2 px-1 text-gray-600 dark:text-gray-400">
                    <span>Łącznie:</span>
                    <span className="font-bold">{totalWeight.toLocaleString('pl-PL')} kg</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {tasks.map(task => 
                        <PsdTaskCard 
                            key={task.id} 
                            task={task} 
                            onStart={handleStartProduction} 
                            onContinue={() => handleSetView(View.LPSD_PRODUCTION)}
                            onEdit={handleEditTask}
                            onDelete={setTaskToDelete}
                        />
                    )}
                </div>
                <Button 
                    onClick={() => handleAddTask(date)} 
                    variant="secondary" 
                    className="w-full mt-3 text-xs" 
                    leftIcon={<PlusIcon className="h-4 w-4"/>}
                    disabled={isPast}
                    title={isPast ? "Nie można planować produkcji na przeszłe daty." : "Dodaj Zlecenie"}
                >
                    Dodaj Zlecenie
                </Button>
            </div>
        );
    };

    return (
        <>
            <div className="h-full flex flex-col p-4 md:p-6 bg-slate-200 dark:bg-secondary-900">
                <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                    <h2 className="text-2xl font-bold text-primary-700 dark:text-primary-300">Planer Tygodniowy PSD</h2>
                    <div className="flex items-center gap-2 bg-white dark:bg-secondary-800 p-1 rounded-lg shadow">
                        <Button onClick={() => setWeekOffset(w => w - 1)} variant="secondary" className="p-2"><ChevronLeftIcon className="h-5 w-5"/></Button>
                        <span className="font-semibold text-center w-64">{getWeekDisplayString()}</span>
                        <Button onClick={() => setWeekOffset(w => w + 1)} variant="secondary" className="p-2"><ChevronRightIcon className="h-5 w-5"/></Button>
                    </div>
                </header>
                <div className="flex-grow flex flex-col gap-6 overflow-y-auto pb-4">
                    {weekDates.map(date => {
                        const year = date.getFullYear();
                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                        const day = date.getDate().toString().padStart(2, '0');
                        const dateKey = `${year}-${month}-${day}`;
                        return (
                            <DayColumn 
                                key={date.toISOString()}
                                date={date}
                                tasks={weekTasks[dateKey] || []}
                            />
                        )
                    })}
                </div>
            </div>
            {taskToDelete && (
                <ConfirmationModal
                    isOpen={!!taskToDelete}
                    onClose={() => setTaskToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Potwierdź Usunięcie Zlecenia"
                    message={`Czy na pewno chcesz usunąć zlecenie "${taskToDelete.name}"?`}
                    confirmButtonText="Tak, usuń"
                />
            )}
            {taskToStart && (
                <SetBatchSizeModal
                    isOpen={isSetBatchSizeModalOpen}
                    onClose={() => setIsSetBatchSizeModalOpen(false)}
                    task={taskToStart}
                    onConfirm={handleInitializeBatches}
                />
            )}
        </>
    );
};
