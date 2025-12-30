
import React, { useState, useMemo } from 'react';
import { PsdTask, View, Recipe } from '../types';
import { usePsdContext } from './contexts/PsdContext';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import PlusIcon from './icons/PlusIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import PsdTaskCard from './PsdTaskCard';
import ConfirmationModal from './ConfirmationModal';
import SetBatchSizeModal from './SetBatchSizeModal';
import { formatProductionTime } from '../src/utils';

export const PsdWeeklyPlannerPage: React.FC = () => {
    const { modalHandlers, handleSetView } = useUIContext();
    const { currentUser } = useAuth();
    const { recipes } = useAppContext();
    const { psdTasks, handleDeletePsdTask, handleUpdatePsdTask } = usePsdContext();
    const [weekOffset, setWeekOffset] = useState(0);
    const [taskToDelete, setTaskToDelete] = useState<PsdTask | null>(null);
    const [taskToStart, setTaskToStart] = useState<PsdTask | null>(null);
    const [isSetBatchSizeModalOpen, setIsSetBatchSizeModalOpen] = useState(false);

    // Limit dzienny dla PSD (np. 8h pracy)
    const DAILY_CAPACITY_MINUTES = 8 * 60;

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

        const dates = Array.from({ length: 6 }).map((_, i) => {
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
    
    const handleAddTask = (date: Date) => {
        if (!currentUser) return;
        
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
        const dateStr = date.toISOString().split('T')[0];

        const newTask: PsdTask = {
            id: newId,
            name: newId,
            recipeId: '',
            recipeName: '',
            targetQuantity: 0,
            plannedDate: dateStr,
            shelfLifeMonths: 12,
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

    const getWeekDisplayString = () => {
        const start = weekDates[0];
        const end = weekDates[weekDates.length - 1];
        return `${start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6 bg-slate-200 dark:bg-secondary-900 overflow-hidden">
            <header className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 shrink-0">
                <h2 className="text-2xl font-bold text-primary-700 dark:text-primary-300">Planer Tygodniowy PSD</h2>
                <div className="flex items-center gap-2 bg-white dark:bg-secondary-800 p-1 rounded-lg shadow-sm">
                    <Button onClick={() => setWeekOffset(w => w - 1)} variant="secondary" className="p-2"><ChevronLeftIcon className="h-5 w-5"/></Button>
                    <span className="font-semibold text-center w-64 text-sm md:text-base">{getWeekDisplayString()}</span>
                    <Button onClick={() => setWeekOffset(w => w + 1)} variant="secondary" className="p-2"><ChevronRightIcon className="h-5 w-5"/></Button>
                </div>
            </header>

            <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {weekDates.map(date => {
                    const dateKey = date.toISOString().split('T')[0];
                    const tasks = weekTasks[dateKey] || [];
                    const isToday = new Date().toISOString().split('T')[0] === dateKey;
                    
                    const totalWeight = tasks.reduce((sum, t) => sum + t.targetQuantity, 0);
                    
                    // Obliczanie czasu na podstawie receptur
                    const totalMinutes = tasks.reduce((sum, task) => {
                        const recipe = recipes.find((r: Recipe) => r.id === task.recipeId);
                        const rate = recipe?.productionRateKgPerMinute || 50;
                        return sum + (task.targetQuantity / rate);
                    }, 0);

                    const occupancyPercentage = (totalMinutes / DAILY_CAPACITY_MINUTES) * 100;

                    return (
                        <div key={dateKey} className={`flex-shrink-0 w-full md:w-72 flex flex-col bg-white dark:bg-secondary-800 rounded-xl shadow-md border-t-4 ${isToday ? 'border-primary-500' : 'border-transparent'}`}>
                            <div className="p-3 border-b dark:border-secondary-700 text-center space-y-1">
                                <p className="font-bold text-gray-800 dark:text-gray-200 uppercase text-xs">{date.toLocaleDateString('pl-PL', { weekday: 'long' })}</p>
                                <p className="text-xl font-extrabold text-primary-600 dark:text-primary-400">{date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}</p>
                                
                                <div className="text-[10px] text-gray-500 font-bold pt-1">
                                    <div className="flex justify-between px-2">
                                        <span>Waga:</span>
                                        <span>{totalWeight.toLocaleString()} kg</span>
                                    </div>
                                    <div className="flex justify-between px-2">
                                        <span>Czas:</span>
                                        <span>{formatProductionTime(totalMinutes)}</span>
                                    </div>
                                </div>

                                <div className="w-full bg-gray-200 dark:bg-secondary-700 rounded-full h-1.5 mt-2 overflow-hidden">
                                    <div 
                                        className={`h-full transition-all duration-500 ${occupancyPercentage > 100 ? 'bg-red-500' : 'bg-primary-500'}`} 
                                        style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                            
                            <div className="flex-grow overflow-y-auto p-2 space-y-3 scrollbar-hide min-h-[200px]">
                                {tasks.map(task => (
                                    <PsdTaskCard 
                                        key={task.id} 
                                        task={task}
                                        onStart={(t) => { setTaskToStart(t); setIsSetBatchSizeModalOpen(true); }}
                                        onContinue={(t) => handleSetView(View.LPSD_PRODUCTION, { taskId: t.id })}
                                        onEdit={handleEditTask}
                                        onDelete={setTaskToDelete}
                                    />
                                ))}
                                {tasks.length === 0 && (
                                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-secondary-700 rounded-lg">
                                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Brak zleceń</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-2 mt-auto">
                                <Button 
                                    onClick={() => handleAddTask(date)} 
                                    className="w-full justify-center py-2.5 text-xs font-bold" 
                                    variant="secondary" 
                                    leftIcon={<PlusIcon className="h-4 w-4"/>}
                                >
                                    Dodaj Zlecenie
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {taskToDelete && (
                <ConfirmationModal
                    isOpen={!!taskToDelete}
                    onClose={() => setTaskToDelete(null)}
                    onConfirm={() => { handleDeletePsdTask(taskToDelete.id); setTaskToDelete(null); }}
                    title="Usuń Zlecenie PSD"
                    message={`Czy na pewno chcesz trwale usunąć zlecenie "${taskToDelete.id}"?`}
                    confirmButtonText="Tak, usuń"
                />
            )}

            {taskToStart && (
                <SetBatchSizeModal
                    isOpen={isSetBatchSizeModalOpen}
                    onClose={() => setIsSetBatchSizeModalOpen(false)}
                    task={taskToStart}
                    onConfirm={(batchSize) => {
                        const result = handleUpdatePsdTask(taskToStart.id, { type: 'INITIALIZE_BATCHES', payload: { batchSize } });
                        if (result.success) handleSetView(View.LPSD_PRODUCTION);
                        setIsSetBatchSizeModalOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default PsdWeeklyPlannerPage;
