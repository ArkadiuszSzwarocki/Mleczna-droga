
import React, { useState, useMemo } from 'react';
import { ProductionRun, View } from '../types';
import { useProductionContext } from './contexts/ProductionContext';
import { useUIContext } from './contexts/UIContext';
import Button from './Button';
import { formatDate, formatProductionTime } from '../src/utils';
import PlusIcon from './icons/PlusIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import ChevronRightIcon from './icons/ChevronRightIcon';
import ProductionTaskCard from './ProductionTaskCard';
import ConfirmationModal from './ConfirmationModal';
import { AGRO_LINE_PRODUCTION_RATE_KG_PER_MINUTE } from '../constants';


const ProductionPlanningAgroPage: React.FC = () => {
    const { productionRunsList, handleDeletePlannedProductionRun, getDailyCapacity } = useProductionContext();
    const { modalHandlers, handleSetView, modalState } = useUIContext();
    const [weekOffset, setWeekOffset] = useState(0);
    const [taskToDelete, setTaskToDelete] = useState<ProductionRun | null>(null);

    const plannedTasks = useMemo(() =>
        (productionRunsList || []).filter(t => t.status === 'planned' || t.status === 'ongoing'),
    [productionRunsList]);

    const { weekDates, weekTasks } = useMemo(() => {
        const today = new Date();
        // Normalize to Noon to avoid DST/Timezone midnight shifts
        today.setHours(12, 0, 0, 0);
        
        today.setDate(today.getDate() + weekOffset * 7);
        const dayOfWeek = today.getDay();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // Monday as start of week
        startOfWeek.setHours(12, 0, 0, 0); // Ensure start of week is also Noon

        // Changed length from 5 to 6 to include Saturday
        const dates = Array.from({ length: 6 }).map((_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            return date;
        });

        const tasksByDate: Record<string, ProductionRun[]> = {};
        plannedTasks.forEach(task => {
            const dateStr = task.plannedDate;
            if (!tasksByDate[dateStr]) {
                tasksByDate[dateStr] = [];
            }
            tasksByDate[dateStr].push(task);
        });
        
        Object.values(tasksByDate).forEach(tasks => {
            tasks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });

        return { weekDates: dates, weekTasks: tasksByDate };
    }, [weekOffset, plannedTasks]);

    const handleEditTask = (task: ProductionRun) => {
        modalHandlers.openAddEditRunModal({ runToEdit: task });
    };

    const confirmDelete = () => {
        if (taskToDelete) {
            handleDeletePlannedProductionRun(taskToDelete.id);
        }
        setTaskToDelete(null);
    };

    const getWeekDisplayString = () => {
        const start = weekDates[0];
        const end = weekDates[weekDates.length - 1];
        if(!start || !end) return '';
        return `${start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' })} - ${end.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    };

    const DayColumn: React.FC<{ date: Date, tasks: ProductionRun[] }> = ({ date, tasks }) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Destructure the new detailed capacity info
        const { productionMinutes, breakMinutes, totalUsedMinutes, totalMinutes } = getDailyCapacity(dateStr);
        const totalWeight = tasks.reduce((sum, task) => sum + task.targetBatchSizeKg, 0);
        
        // Progress bar represents TOTAL usage (production + breaks) vs capacity
        const occupancyPercentage = totalMinutes > 0 ? (totalUsedMinutes / totalMinutes) * 100 : 0;
        
        const today = new Date();
        today.setHours(12,0,0,0); // Normalize to noon
        const dateDateStr = date.toISOString().split('T')[0];
        const todayDateStr = today.toISOString().split('T')[0];
        const isPast = dateDateStr < todayDateStr;

        const handleAddTask = (date: Date) => {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            modalHandlers.openAddEditRunModal({ isNew: true, initialDate: dateStr });
        };

        return (
            <div className="bg-slate-100 dark:bg-secondary-900/70 rounded-lg p-3 flex flex-col gap-3">
                <h3 className="font-semibold text-center text-gray-800 dark:text-gray-200">
                    {date.toLocaleDateString('pl-PL', { weekday: 'long' })}
                    <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {date.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' })}
                    </span>
                </h3>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                    <div className="flex justify-between items-baseline mb-1">
                        <span>Łącznie:</span>
                        <span className="font-bold text-sm">{totalWeight.toLocaleString('pl-PL')} kg</span>
                    </div>
                     <div className="flex justify-between items-baseline">
                        <span>Obciążenie:</span>
                        {/* Display pure production time vs total available time */}
                        <span className="font-bold text-sm">{formatProductionTime(productionMinutes)} / {formatProductionTime(totalMinutes)}</span>
                    </div>
                    {/* Display technical breaks separately */}
                    {breakMinutes > 0 && (
                        <div className="flex justify-between items-baseline text-gray-500 mt-1">
                            <span>Przerwy tech.:</span>
                            <span className="font-medium">{formatProductionTime(breakMinutes)}</span>
                        </div>
                    )}
                </div>
                <div className="w-full bg-gray-300 dark:bg-secondary-700 rounded-full h-2">
                    <div className={`h-2 rounded-full ${occupancyPercentage > 100 ? 'bg-red-500' : 'bg-primary-600'}`} style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}></div>
                </div>
                <div className="space-y-3">
                    {tasks.map(task =>
                        <ProductionTaskCard
                            key={task.id}
                            task={task}
                            onEdit={handleEditTask}
                            onDelete={setTaskToDelete}
                        />
                    )}
                </div>
                <Button 
                    onClick={() => handleAddTask(date)} 
                    variant="secondary" 
                    className="w-full mt-auto" 
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
                <header className="flex-shrink-0 flex flex-col lg:flex-row justify-between items-center mb-4 gap-3">
                     <div className="flex items-center gap-3">
                        <h2 className="text-xl md:text-2xl font-bold text-primary-700 dark:text-primary-300 break-words">Planer Tygodniowy AGRO</h2>
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-secondary-800 p-1 rounded-lg shadow w-full sm:w-auto justify-between sm:justify-start">
                        <Button onClick={() => setWeekOffset(w => w - 1)} variant="secondary" className="p-2"><ChevronLeftIcon className="h-5 w-5"/></Button>
                        <span className="font-semibold text-center px-4 min-w-[150px]">{getWeekDisplayString()}</span>
                        <Button onClick={() => setWeekOffset(w => w + 1)} variant="secondary" className="p-2"><ChevronRightIcon className="h-5 w-5"/></Button>
                    </div>
                </header>
                {/* Changed to vertical flex column layout for stacking days */}
                <div className="flex-grow flex flex-col gap-4 overflow-y-auto pb-4 scrollbar-hide">
                    {weekDates.map(date => {
                        const dateKey = date.toISOString().split('T')[0];
                        return (
                            <DayColumn
                                key={dateKey}
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
                    message={`Czy na pewno chcesz usunąć zlecenie na "${taskToDelete.recipeName}"? Tej operacji nie można cofnąć.`}
                    confirmButtonText="Tak, usuń"
                />
            )}
        </>
    );
};

export default ProductionPlanningAgroPage;
