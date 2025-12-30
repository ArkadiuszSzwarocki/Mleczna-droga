import React from 'react';
import { PsdTask, View, PsdConsumedMaterial } from '../types';
// FIX: Correct import path to be relative
import { useUIContext } from './contexts/UIContext';
import { formatDate } from '../src/utils';
import Button from './Button';
import PrintLabelIcon from './icons/PrintLabelIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface PsdTaskReportPageProps {
  task: PsdTask;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-4 break-inside-avoid">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-secondary-700 p-2 rounded-t-md border-b-2 border-primary-500">{title}</h3>
        <div className="p-2 border border-t-0 rounded-b-md dark:border-secondary-600">
            {children}
        </div>
    </section>
);

const PsdTaskReportPage: React.FC<PsdTaskReportPageProps> = ({ task }) => {
    const { handleSetView } = useUIContext();

    const handleBack = () => {
        handleSetView(View.PSD_REPORTS);
    };

    const handlePrint = () => {
        window.print();
    };

    const totalProduced = (task.batches || []).reduce((total, batch) => 
        total + (batch.producedGoods || []).filter(g => !g.isAnnulled).reduce((batchSum, good) => batchSum + good.producedWeight, 0), 0);

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
            <header className="flex justify-between items-center mb-4 pb-3 border-b dark:border-secondary-600 no-print">
                <div>
                    <Button onClick={handleBack} variant="secondary" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                        Powrót do Raportów
                    </Button>
                </div>
                <Button onClick={handlePrint} leftIcon={<PrintLabelIcon className="h-5 w-5"/>}>
                    Drukuj Raport
                </Button>
            </header>

            <div id="printable-psd-task-report">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-primary-700 dark:text-primary-300">Raport Końcowy Zlecenia Produkcyjnego PSD</h1>
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{task.name}</h2>
                    <p className="font-mono text-sm text-gray-500 dark:text-gray-400">{task.id}</p>
                </div>
                
                <Section title="Podsumowanie Zlecenia">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        <strong className="text-gray-600 dark:text-gray-400">Produkt:</strong><span>{task.recipeName}</span>
                        <strong className="text-gray-600 dark:text-gray-400">Ilość planowana:</strong><span>{task.targetQuantity} kg</span>
                        <strong className="text-gray-600 dark:text-gray-400">Ilość wyprodukowana:</strong><span>{totalProduced.toFixed(2)} kg</span>
                        <strong className="text-gray-600 dark:text-gray-400">Data planowana:</strong><span>{formatDate(task.plannedDate)}</span>
                        <strong className="text-gray-600 dark:text-gray-400">Data zakończenia:</strong><span>{task.completedAt ? formatDate(task.completedAt, true) : 'N/A'}</span>
                        <strong className="text-gray-600 dark:text-gray-400">Utworzone przez:</strong><span>{task.createdBy}</span>
                    </div>
                    {task.notes && <div className="mt-2 pt-2 border-t dark:border-secondary-600"><p className="text-sm"><strong>Notatki do zlecenia:</strong> {task.notes}</p></div>}
                </Section>
                
                <Section title="Szczegóły Partii">
                    {(task.batches || []).map(batch => {
                        const standardConsumption = (batch.consumedPallets || []).filter(c => !c.isAdjustment);
                        const adjustments = (batch.consumedPallets || []).filter(c => c.isAdjustment);

                        return (
                            <div key={batch.id} className="mb-4 p-2 border dark:border-secondary-600 rounded-md break-inside-avoid">
                                <h4 className="font-semibold text-md text-primary-600 dark:text-primary-400">Partia #{batch.batchNumber} (Cel: {batch.targetWeight} kg)</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Status: {batch.status} | Start: {batch.startTime ? formatDate(batch.startTime, true) : 'N/A'} | Koniec: {batch.endTime ? formatDate(batch.endTime, true) : 'N/A'}</p>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                    <div>
                                        <h5 className="font-semibold text-sm">Zużyte Surowce ({standardConsumption.length})</h5>
                                        {standardConsumption.length > 0 ? (
                                            <ul className="text-xs list-disc list-inside">
                                                {standardConsumption.map(p => <li key={p.palletId}>{p.productName} ({p.consumedWeight} kg) z palety <span className="font-mono">{p.displayId}</span></li>)}
                                            </ul>
                                        ) : <p className="text-xs italic">Brak.</p>}
                                    </div>
                                    <div>
                                        <h5 className="font-semibold text-sm">Wyprodukowane Towary ({(batch.producedGoods || []).filter(g => !g.isAnnulled).length})</h5>
                                         {(batch.producedGoods || []).filter(g => !g.isAnnulled).length > 0 ? (
                                            <ul className="text-xs list-disc list-inside">
                                                {(batch.producedGoods || []).filter(g => !g.isAnnulled).map(p => <li key={p.id}>{p.productName} ({p.producedWeight} kg) - ID: <span className="font-mono">{p.displayId}</span></li>)}
                                            </ul>
                                        ) : <p className="text-xs italic">Brak.</p>}
                                    </div>
                                </div>
                                {adjustments.length > 0 && (
                                    <div className="mt-2 pt-2 border-t dark:border-secondary-600">
                                        <h5 className="font-semibold text-sm text-yellow-700 dark:text-yellow-400">Dodane Korekty (Dosypki) ({adjustments.length})</h5>
                                        <ul className="text-xs list-disc list-inside">
                                            {adjustments.map((p, index) => <li key={`${p.palletId}-${index}`}>{p.productName} ({p.consumedWeight} kg) z <span className="font-mono">{p.displayId}</span></li>)}
                                        </ul>
                                    </div>
                                )}
                                {batch.notes && <p className="text-xs mt-2"><strong>Notatki do partii:</strong> {batch.notes}</p>}
                            </div>
                        );
                    })}
                </Section>
            </div>
        </div>
    );
};

export default PsdTaskReportPage;