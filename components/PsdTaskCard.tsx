import React from 'react';
import { PsdTask, Permission } from '../types';
import Button from './Button';
import { formatDate } from '../src/utils';
import PlayIcon from './icons/PlayIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import { useAuth } from './contexts/AuthContext';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';

interface PsdTaskCardProps {
    task: PsdTask;
    onStart: (task: PsdTask) => void;
    onContinue: (task: PsdTask) => void;
    onEdit?: (task: PsdTask) => void;
    onDelete?: (task: PsdTask) => void;
}

const PsdTaskCard: React.FC<PsdTaskCardProps> = ({ task, onStart, onContinue, onEdit, onDelete }) => {
    const { checkPermission, currentUser } = useAuth();
    
    const isOngoing = task.status === 'ongoing';
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'boss';
    
    const canExecute = isAdmin || checkPermission(Permission.EXECUTE_PRODUCTION_PSD);
    const canPlan = isAdmin || checkPermission(Permission.PLAN_PRODUCTION_PSD);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = task.plannedDate.split('-').map(Number);
    const taskDate = new Date(year, month - 1, day);
    const isPast = taskDate < today;

    // Admin i Szef mogą edytować/usuwać nawet stare zlecenia
    const isActionDisabled = isPast && !isAdmin;

    return (
        <div className={`p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md border-l-4 relative transition-all hover:shadow-lg ${
            isOngoing ? 'border-green-500 bg-green-50 dark:bg-green-900/40' : 
            (task.hasShortages ? 'border-red-500 bg-red-50 dark:bg-red-900/30 shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]' : 'border-primary-500')
        }`}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                <div className="flex-grow pr-8">
                    <p className="font-bold text-primary-700 dark:text-primary-300">{task.name}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{task.recipeName}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-1 uppercase tracking-tighter">ID: {task.id}</p>
                </div>
                
                {task.hasShortages && !isOngoing && (
                    <div className="absolute top-3 right-3 animate-pulse" title="Braki surowców uniemożliwiają start produkcji">
                        <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                    </div>
                )}
                
                <div className="flex-shrink-0 text-left sm:text-right">
                    <p className="font-extrabold text-lg text-gray-800 dark:text-gray-200">{task.targetQuantity.toLocaleString()} kg</p>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Plan: {formatDate(task.plannedDate)}</p>
                </div>
            </div>

            {task.hasShortages && !isOngoing && (
                <div className="mt-2 p-1.5 bg-red-100 dark:bg-red-900/50 rounded text-[10px] font-bold text-red-700 dark:text-red-300 flex items-center gap-1.5 border border-red-200 dark:border-red-800">
                    <ExclamationTriangleIcon className="h-3 w-3" />
                    BŁĄD: BRAKI SUROWCOWE - ZAMÓW BRAKUJĄCE MATERIAŁY
                </div>
            )}

            <div className="mt-4 pt-3 border-t dark:border-secondary-700 flex justify-end gap-2">
                {isOngoing && canExecute && (
                    <Button onClick={() => onContinue(task)} variant="primary" className="bg-green-600 hover:bg-green-700 w-full sm:w-auto" leftIcon={<ArrowRightIcon className="h-5 w-5"/>}>
                        Kontynuuj
                    </Button>
                )}
                {!isOngoing && canExecute && (
                    <Button 
                        onClick={() => onStart(task)} 
                        variant="primary" 
                        leftIcon={<PlayIcon className="h-5 w-5"/>}
                        disabled={task.hasShortages || (isPast && !isAdmin)}
                        className="w-full sm:w-auto shadow-sm"
                        title={isPast && !isAdmin ? "Nie można rozpoczynać zleceń z przeszłości" : (task.hasShortages ? "Produkcja zablokowana: braki surowców" : "Rozpocznij produkcję")}
                    >
                        Rozpocznij
                    </Button>
                )}
                 {canPlan && onEdit && onDelete && (
                    <div className="flex gap-2">
                        <Button onClick={() => onEdit(task)} variant="secondary" className="p-2" title="Edytuj zlecenia" disabled={isActionDisabled}><EditIcon className="h-4 w-4"/></Button>
                        <Button onClick={() => onDelete(task)} variant="secondary" className="p-2 text-red-600 hover:bg-red-100 dark:bg-red-900/40 dark:hover:bg-red-800" title="Usuń zlecenia" disabled={isActionDisabled}><TrashIcon className="h-4 w-4"/></Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PsdTaskCard;