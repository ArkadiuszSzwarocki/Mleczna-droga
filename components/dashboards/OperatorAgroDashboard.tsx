import React from 'react';
import { useUIContext } from '../contexts/UIContext';
import { View } from '../../types';
import CogIcon from '../icons/CogIcon';
import PlayIcon from '../icons/PlayIcon';
import CubeIcon from '../icons/CubeIcon';
import Button from '../Button';

interface OperatorAgroDashboardProps {
    isWidgetVisible: (id: string) => boolean;
}

const OperatorAgroDashboard: React.FC<OperatorAgroDashboardProps> = ({ isWidgetVisible }) => {
    const { handleSetView } = useUIContext();

    return (
        <div className="space-y-8">
            <header className="border-b dark:border-secondary-600 pb-4">
                <div className="flex items-center">
                    <CogIcon className="h-10 w-10 text-primary-600 dark:text-primary-400 mr-3" />
                    <h2 className="text-3xl font-semibold text-primary-700 dark:text-primary-300">Pulpit Operatora AGRO</h2>
                </div>
            </header>
            
            {isWidgetVisible('main_actions') && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Button onClick={() => handleSetView(View.CurrentProductionRun)} className="py-12 text-2xl" leftIcon={<PlayIcon className="h-10 w-10" />}>Start Produkcji</Button>
                    <Button onClick={() => handleSetView(View.PackagingOperator)} variant="secondary" className="py-12 text-2xl" leftIcon={<CubeIcon className="h-10 w-10" />}>Pakowanie</Button>
                </section>
            )}
        </div>
    );
};

export default OperatorAgroDashboard;