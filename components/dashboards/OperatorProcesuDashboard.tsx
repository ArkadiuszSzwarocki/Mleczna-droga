import React, { useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { useUIContext } from '../contexts/UIContext';
import { View } from '../../types';
import Button from '../Button';
import CogIcon from '../icons/CogIcon';
import PlayIcon from '../icons/PlayIcon';
import AdjustmentsHorizontalIcon from '../icons/AdjustmentsHorizontalIcon';
import CubeIcon from '../icons/CubeIcon';

interface OperatorProcesuDashboardProps {
    isWidgetVisible: (id: string) => boolean;
}

const OperatorProcesuDashboard: React.FC<OperatorProcesuDashboardProps> = ({ isWidgetVisible }) => {
    const { handleSetView } = useUIContext();
    const { productionRunsList } = useAppContext();

    const activeRun = useMemo(() => (productionRunsList || []).find(r => r.status === 'ongoing'), [productionRunsList]);

    return (
        <div className="space-y-8">
            <header className="border-b dark:border-secondary-600 pb-4">
                <div className="flex items-center">
                    <CogIcon className="h-10 w-10 text-primary-600 dark:text-primary-400 mr-3" />
                    <h2 className="text-3xl font-semibold text-primary-700 dark:text-primary-300">Pulpit Operatora Procesu</h2>
                </div>
            </header>
            
            {isWidgetVisible('quick_actions') && (
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Button onClick={() => handleSetView(View.CurrentProductionRun)} className="py-8 text-xl" leftIcon={<PlayIcon className="h-8 w-8" />}>Produkcja AGRO</Button>
                    <Button onClick={() => handleSetView(View.ManageAdjustments)} variant="secondary" className="py-8 text-xl" leftIcon={<AdjustmentsHorizontalIcon className="h-8 w-8" />}>Dosypki</Button>
                    <Button onClick={() => handleSetView(View.PackagingOperator)} variant="secondary" className="py-8 text-xl" leftIcon={<CubeIcon className="h-8 w-8" />}>Pakowanie</Button>
                </section>
            )}
        </div>
    );
};

export default OperatorProcesuDashboard;