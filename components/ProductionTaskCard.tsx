import React from 'react';
import { ProductionRun, Permission } from '../types';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import Button from './Button';
import { formatProductionTime } from '../src/utils';
import PlayIcon from './icons/PlayIcon';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import { AGRO_LINE_PRODUCTION_RATE_KG_PER_MINUTE } from '../constants';
import { View } from '../types';

interface ProductionTaskCardProps {
    task: ProductionRun;
    onEdit: (task: ProductionRun) => void;
    onDelete: (task: ProductionRun) => void;
}

const ProductionTaskCard: React.FC<ProductionTaskCardProps> = ({ task, onEdit, onDelete }) => {
    const { handleSetView } = useUIContext();
    const { checkPermission, currentUser } = useAuth();
    
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'boss';
    const canExecute = isAdmin || checkPermission(Permission.EXECUTE_PRODUCTION_AGRO);
    const canPlan = isAdmin || checkPermission(Permission.PLAN_PRODUCTION_AGRO);

    const productionTimeMinutes = task.targetBatchSizeKg / AGRO_LINE_PRODUCTION_RATE_KG_PER_MINUTE;

    const handleStart = () => {
        handleSetView(View.CurrentProductionRun, { runId: task.id });
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = task.plannedDate.split('-').map(Number);
    const taskDate = new Date(year, month - 1, day);
    const isPast = taskDate < today;

    // Admin i Szef mogą zarządzać planem nawet w przeszłości
    const isActionDisabled = isPast && !isAdmin;

    return (
        <div className={`p-3 bg-white dark:bg-secondary-800 rounded-lg shadow border-l-4 relative ${
            task.status === 'ongoing' ? 'border-green-500' :
            (task.hasShortages ? 'border-yellow-500' : 'border-primary-500')
        }`}>
            {task.hasShortages && (
                <div className="absolute top-2 right-2" title="Zaplanowano z brakami materiałowymi">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                </div>
            )}
            <p className="font-semibold text-sm text-gray-800 dark:text-gray-200 pr-6 truncate" title={task.recipeName}>{task.recipeName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate" title={task.id}>Nr zlecenia: {task.id}</p>
            
            <div className="flex justify-between items-baseline mt-2">
                <span className="text-lg font-bold text-primary-700 dark:text-primary-300">{task.targetBatchSizeKg.toLocaleString('pl-PL')} kg</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">Czas: ~{formatProductionTime(productionTimeMinutes)}</span>
            </div>
            
            <div className="mt-3 pt-2 border-t dark:border-secondary-700 flex justify-end gap-2">
                {task.status === 'ongoing' && canExecute && (
                     <Button onClick={handleStart} variant="primary" className="text-xs bg-green-600 hover:bg-green-700">Kontynuuj</Button>
                )}
                {task.status === 'planned' && canExecute && (
                    <Button onClick={handleStart} disabled={task.hasShortages || isActionDisabled} title={isPast && !isAdmin ? "Nie można rozpoczynać zleceń z przeszłości" : (task.hasShortages ? 'Nie można rozpocząć - braki materiałowe' : '')} className="text-xs" leftIcon={<PlayIcon className="h-4 w-4"/>}>
                        Rozpocznij
                    </Button>
                )}
                {canPlan && (
                    <>
                        <Button onClick={() => onEdit(task)} variant="secondary" className="p-1.5" title="Edytuj" disabled={isActionDisabled}><EditIcon className="h-4 w-4"/></Button>
                        <Button onClick={() => onDelete(task)} variant="secondary" className="p-1.5 text-red-600 hover:bg-red-100 dark:bg-red-900/40 dark:hover:bg-red-800/80" title="Usuń" disabled={isActionDisabled}><TrashIcon className="h-4 w-4"/></Button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ProductionTaskCard;