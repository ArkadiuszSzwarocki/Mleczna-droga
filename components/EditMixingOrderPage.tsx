
import React, { useMemo } from 'react';
import { useMixingContext } from './contexts/MixingContext';
import { useProductionContext } from './contexts/ProductionContext';
import { useAppContext } from './contexts/AppContext';
import { useUIContext } from './contexts/UIContext';
import { MixingTask, View } from '../types';
import { formatDate, getMixingTaskStatusLabel } from '../src/utils';
import Button from './Button';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import MixerIcon from './icons/MixerIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';
import Alert from './Alert';
import CheckCircleIcon from './icons/CheckCircleIcon';
import CubeIcon from './icons/CubeIcon';

const EditMixingOrderPage: React.FC = () => {
    const { mixingTasks } = useMixingContext();
    const { finishedGoodsList } = useProductionContext();
    const { viewParams, handleSetView, modalHandlers } = useUIContext();

    const task = useMemo(() => 
        (mixingTasks || []).find(t => t.id === viewParams?.taskId),
    [mixingTasks, viewParams]);

    if (!task) {
        return (
            <div className="p-6 text-center">
                <Alert type="error" message="Nie znaleziono zlecenia miksowania." />
                <Button onClick={() => handleSetView(View.MIXING_PLANNER)} className="mt-4">Wróć do listy</Button>
            </div>
        );
    }

    const createdProduct = useMemo(() => {
        if (task.status !== 'completed') return null;
        // Find the finished good created from this mixing task
        return (finishedGoodsList || []).find(fg => fg.sourceMixingTaskId === task.id);
    }, [finishedGoodsList, task]);

    const handleBack = () => {
        // Return to archive if coming from there, else planner
        if (task.status === 'completed' || task.status === 'cancelled') {
            handleSetView(View.ARCHIVED_MIXING_ORDERS);
        } else {
            handleSetView(View.MIXING_PLANNER);
        }
    };

    const handlePrintLabel = () => {
        if (createdProduct) {
            modalHandlers.openNetworkPrintModal({
                type: 'finished_good',
                data: createdProduct,
                context: 'reprint'
            });
        }
    };

    const statusColors = {
        planned: 'bg-gray-200 text-gray-800 dark:bg-secondary-700 dark:text-gray-200',
        ongoing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
        completed: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
        cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
    };

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900 min-h-full flex flex-col">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b dark:border-secondary-700 gap-4">
                <div className="flex items-center gap-3">
                    <Button onClick={handleBack} variant="secondary" className="p-2"><ArrowLeftIcon className="h-5 w-5"/></Button>
                    <div>
                        <div className="flex items-center gap-3">
                             <MixerIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                             <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Zlecenie Miksowania</h2>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-mono mt-1">{task.id}</p>
                    </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full font-bold text-sm uppercase tracking-wide ${statusColors[task.status]}`}>
                    {getMixingTaskStatusLabel(task.status)}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Details & Composition */}
                <div className="lg:col-span-2 space-y-6">
                    <section className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b dark:border-secondary-700 pb-2">
                            Szczegóły Zlecenia
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500 dark:text-gray-400">Nazwa / Odbiorca</p>
                                <p className="font-semibold text-lg text-gray-900 dark:text-gray-100">{task.name}</p>
                            </div>
                            <div>
                                <p className="text-gray-500 dark:text-gray-400">Utworzono</p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{formatDate(task.createdAt, true)}</p>
                            </div>
                             <div>
                                <p className="text-gray-500 dark:text-gray-400">Utworzył</p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{task.createdBy}</p>
                            </div>
                        </div>
                    </section>

                    <section className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b dark:border-secondary-700 pb-2">
                            Kompozycja (Składniki)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-secondary-700">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Produkt</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Plan (kg)</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Pobrano (kg)</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Postęp</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-secondary-700">
                                    {task.targetComposition.map(item => {
                                        const consumed = (task.consumedSourcePallets || [])
                                            .filter(c => c.productName === item.productName)
                                            .reduce((sum, c) => sum + c.consumedWeight, 0);
                                        const progress = item.quantity > 0 ? (consumed / item.quantity) * 100 : 0;
                                        const isComplete = progress >= 99.9;

                                        return (
                                            <tr key={item.id}>
                                                <td className="px-4 py-3 font-medium">{item.productName}</td>
                                                <td className="px-4 py-3 text-right">{item.quantity.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right font-bold">{consumed.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${isComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                        {progress.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-slate-50 dark:bg-secondary-700 font-bold">
                                    <tr>
                                        <td className="px-4 py-2">SUMA</td>
                                        <td className="px-4 py-2 text-right">
                                            {task.targetComposition.reduce((sum, i) => sum + i.quantity, 0).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {(task.consumedSourcePallets || []).reduce((sum, c) => sum + c.consumedWeight, 0).toFixed(2)}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>
                </div>

                {/* Right Column: Source Pallets & Output */}
                <div className="lg:col-span-1 space-y-6">
                    {createdProduct && (
                        <section className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-6 rounded-lg shadow-md">
                            <h3 className="text-lg font-bold text-green-800 dark:text-green-300 mb-4 flex items-center gap-2">
                                <CheckCircleIcon className="h-6 w-6"/> Wynik Miksowania
                            </h3>
                            <div className="space-y-2 mb-4">
                                <p className="text-sm text-green-700 dark:text-green-300">Utworzono paletę:</p>
                                <div className="p-3 bg-white dark:bg-secondary-800 rounded border border-green-300 dark:border-green-700">
                                    <p className="font-bold text-lg">{createdProduct.productName}</p>
                                    <p className="font-mono text-sm text-gray-500">{createdProduct.displayId}</p>
                                    <p className="text-xl font-extrabold mt-1">{createdProduct.quantityKg.toFixed(2)} kg</p>
                                </div>
                            </div>
                            <Button onClick={handlePrintLabel} className="w-full justify-center" leftIcon={<PrintLabelIcon className="h-5 w-5"/>}>
                                Drukuj Etykietę
                            </Button>
                        </section>
                    )}

                    <section className="bg-white dark:bg-secondary-800 p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 border-b dark:border-secondary-700 pb-2 flex items-center gap-2">
                            <CubeIcon className="h-5 w-5 text-gray-500"/> Pobrane Palety
                        </h3>
                        {(!task.consumedSourcePallets || task.consumedSourcePallets.length === 0) ? (
                            <p className="text-gray-500 dark:text-gray-400 text-sm italic">Brak pobranych palet.</p>
                        ) : (
                            <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {task.consumedSourcePallets.map((pallet, index) => (
                                    <li key={index} className="p-3 bg-slate-50 dark:bg-secondary-700 rounded border dark:border-secondary-600 text-sm">
                                        <div className="flex justify-between">
                                            <span className="font-bold text-gray-700 dark:text-gray-300">{pallet.productName}</span>
                                            <span className="font-mono text-gray-500 dark:text-gray-400 text-xs">{pallet.displayId}</span>
                                        </div>
                                        <div className="mt-1 flex justify-between items-end">
                                            <span className="text-xs text-gray-500">Pobrano:</span>
                                            <span className="font-bold text-primary-600 dark:text-primary-400">{pallet.consumedWeight.toFixed(2)} kg</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

export default EditMixingOrderPage;
