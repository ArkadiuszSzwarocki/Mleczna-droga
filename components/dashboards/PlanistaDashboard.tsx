import React, { useMemo } from 'react';
import { View } from '../../types';
import { useProductionContext } from '../contexts/ProductionContext';
import { useWarehouseContext } from '../contexts/WarehouseContext';
import { useLogisticsContext } from '../contexts/LogisticsContext';
import { useMixingContext } from '../contexts/MixingContext';
import { useUIContext } from '../contexts/UIContext';
import CalendarDaysIcon from '../icons/CalendarDaysIcon';
import DocumentTextIcon from '../icons/DocumentTextIcon';
import ExclamationTriangleIcon from '../icons/ExclamationTriangleIcon';
import Button from '../Button';
import MixerIcon from '../icons/MixerIcon';
import RecipeProductionCalculator from './RecipeProductionCalculator';
import { StatCard } from '../StatCard';
import { getBlockInfo } from '../../src/utils';

interface PlanistaDashboardProps {
    isWidgetVisible: (id: string) => boolean;
}

const PlanistaDashboard: React.FC<PlanistaDashboardProps> = ({ isWidgetVisible }) => {
    const { productionRunsList } = useProductionContext();
    const { expiringPalletsDetails } = useWarehouseContext();
    const { dispatchOrders } = useLogisticsContext();
    const { mixingTasks } = useMixingContext();
    const { handleSetView: onSetView } = useUIContext();

    const runsThisWeekCount = useMemo(() => {
        return (productionRunsList || []).filter((run: any) => run.status === 'planned').length;
    }, [productionRunsList]);

    const criticalExpiryCount = useMemo(() => 
        (expiringPalletsDetails || []).filter((p: any) => p.status === 'critical' && !getBlockInfo(p.pallet).isBlocked).length,
    [expiringPalletsDetails]);

    const mixingTasksCount = useMemo(() =>
        (mixingTasks || []).filter((t: any) => t.status === 'planned' || t.status === 'ongoing').length,
    [mixingTasks]);

    return (
        <div className="space-y-8">
            <header className="border-b dark:border-secondary-600 pb-4">
                <div className="flex items-center">
                    <CalendarDaysIcon className="h-10 w-10 text-primary-600 dark:text-primary-400 mr-3" />
                    <div>
                        <h2 className="text-3xl font-semibold text-primary-700 dark:text-primary-300">Pulpit Planisty</h2>
                        <p className="text-md text-gray-500 dark:text-gray-400">Przegląd kluczowych zadań i wskaźników.</p>
                    </div>
                </div>
            </header>
            
            <section className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 space-y-6">
                    {isWidgetVisible('stats_row') && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <StatCard label="Zlecenia planowane" value={runsThisWeekCount} icon={<CalendarDaysIcon className="h-8 w-8 text-blue-500"/>} onClick={() => onSetView(View.ProductionPlanningAgro)} />
                             <StatCard label="Krótki termin" value={criticalExpiryCount} icon={<ExclamationTriangleIcon className="h-8 w-8 text-orange-500"/>} />
                             <StatCard label="Miksowanie" value={mixingTasksCount} icon={<MixerIcon className="h-8 w-8 text-green-500"/>} onClick={() => onSetView(View.MIXING_PLANNER)} />
                        </div>
                    )}
                </div>
                {isWidgetVisible('production_calculator') && (
                     <div className="lg:col-span-2">
                        <RecipeProductionCalculator />
                    </div>
                )}
            </section>
        </div>
    );
};

export default PlanistaDashboard;