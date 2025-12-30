import React, { useMemo } from 'react';
import { ProductionRun, FinishedGoodItem, AdjustmentOrder, LabSample, View } from '../types';
import { useAppContext } from './contexts/AppContext';
import { formatDate } from '../src/utils';
import Button from './Button';
import PrintLabelIcon from './icons/PrintLabelIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';

interface ArchivedProductionRunReportPageProps {
  run: ProductionRun;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-6 break-inside-avoid">
        <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-secondary-700 p-2 rounded-t-md border-b-2 border-primary-500">{title}</h3>
        <div className="p-3 border border-t-0 rounded-b-md dark:border-secondary-600">
            {children}
        </div>
    </section>
);

const ArchivedProductionRunReportPage: React.FC<ArchivedProductionRunReportPageProps> = ({ run }) => {
    const { handleSetView, finishedGoodsList, adjustmentOrders } = useAppContext();

    const handleBack = () => {
        handleSetView(View.ArchivedProductionRuns);
    };

    const handlePrint = () => {
        window.print();
    };

    const runDetails = useMemo(() => {
        const totalConsumed = (run.actualIngredientsUsed || []).reduce((sum, ing) => sum + ing.actualConsumedQuantityKg, 0);
        const totalProduced = run.actualProducedQuantityKg || 0;
        const yieldPercent = totalConsumed > 0 ? (totalProduced / totalConsumed) * 100 : 0;
        
        return {
            totalConsumed,
            totalProduced,
            yieldPercent
        };
    }, [run]);

    const producedPallets = useMemo(() => 
        (finishedGoodsList || []).filter((fg: FinishedGoodItem) => fg.productionRunId === run.id),
    [finishedGoodsList, run.id]);

    const adjustmentsForRun = useMemo(() =>
        (adjustmentOrders || []).filter((order: AdjustmentOrder) => order.productionRunId === run.id),
    [adjustmentOrders, run.id]);
    
    const samplesForRun = useMemo(() => run.samples || [], [run.samples]);

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
            <header className="flex justify-between items-center mb-4 pb-3 border-b dark:border-secondary-600 no-print">
                <div>
                    <Button onClick={handleBack} variant="secondary" leftIcon={<ArrowLeftIcon className="h-5 w-5"/>}>
                        Powrót do Archiwum
                    </Button>
                </div>
                <Button onClick={handlePrint} leftIcon={<PrintLabelIcon className="h-5 w-5"/>}>
                    Drukuj Raport
                </Button>
            </header>

            <div id="printable-history-report">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-primary-700 dark:text-primary-300">Raport Archiwalny Zlecenia Produkcyjnego</h1>
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{run.recipeName}</h2>
                    <p className="font-mono text-sm text-gray-500 dark:text-gray-400">{run.id}</p>
                </div>

                <div className="columns-1 md:columns-2 gap-6">
                    <Section title="Podsumowanie Zlecenia">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <strong>Produkt:</strong><span>{run.recipeName}</span>
                            <strong>Ilość planowana:</strong><span>{run.targetBatchSizeKg.toFixed(2)} kg</span>
                            <strong>Ilość wyprodukowana:</strong><span>{runDetails.totalProduced.toFixed(2)} kg</span>
                            <strong>Wydajność (Yield):</strong><span className={`font-bold ${runDetails.yieldPercent < 98 ? 'text-orange-600' : 'text-green-600'}`}>{runDetails.yieldPercent.toFixed(2)}%</span>
                            <strong>Data zakończenia:</strong><span>{run.endTime ? formatDate(run.endTime, true) : 'N/A'}</span>
                            <strong>Utworzone przez:</strong><span>{run.createdBy}</span>
                        </div>
                    </Section>

                    <Section title="Szczegóły Partii (Szarż)">
                        {run.batches.length > 0 ? (
                            <div className="space-y-3">
                                {run.batches.map(batch => (
                                    <div key={batch.id} className="p-2 border dark:border-secondary-600 rounded-md text-xs">
                                        <p className="font-semibold text-primary-600 dark:text-primary-400">Partia #{batch.batchNumber} (Cel: {batch.targetWeight} kg)</p>
                                        <p>Status: <span className="font-medium">{batch.status}</span></p>
                                        <div className="flex gap-4">
                                            <span>NIRS: <span className={`font-bold ${batch.confirmationStatus?.nirs === 'nok' ? 'text-red-500' : 'text-green-500'}`}>{batch.confirmationStatus?.nirs?.toUpperCase() || 'B/D'}</span></span>
                                            <span>Próbka: <span className={`font-bold ${batch.confirmationStatus?.sampling === 'ok' ? 'text-green-500' : 'text-gray-500'}`}>{batch.confirmationStatus?.sampling?.toUpperCase() || 'B/D'}</span></span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm italic">Brak zdefiniowanych partii.</p>}
                    </Section>

                     <Section title={`Wyprodukowane Palety (${producedPallets.length})`}>
                         {producedPallets.length > 0 ? (
                             <ul className="text-xs list-disc list-inside space-y-1 max-h-48 overflow-y-auto">
                                 {producedPallets.map(p => <li key={p.id}>{p.productName} ({p.quantityKg} kg) - ID: <span className="font-mono">{p.displayId}</span></li>)}
                            </ul>
                        ) : <p className="text-sm italic">Brak.</p>}
                    </Section>

                    <Section title={`Wykonane Korekty (${adjustmentsForRun.length})`}>
                        {adjustmentsForRun.length > 0 ? (
                            <ul className="text-xs list-disc list-inside space-y-1">
                                {adjustmentsForRun.map(order => <li key={order.id}>Zlecenie #{order.id.split('-')[1]} dla partii #{order.batchId?.split('-B')[1] || 'N/A'}. Powód: {order.reason}.</li>)}
                            </ul>
                        ) : <p className="text-sm italic">Brak.</p>}
                    </Section>

                    <Section title={`Pobrane Próbki (${samplesForRun.length})`}>
                        {samplesForRun.length > 0 ? (
                             <ul className="text-xs list-disc list-inside space-y-1">
                                 {samplesForRun.map(s => <li key={s.id}>Worek <span className="font-mono">{s.sampleBagNumber}</span> dla partii #{s.batchNumber} (Archiwum: {s.archiveLocation || 'Brak'})</li>)}
                            </ul>
                        ) : <p className="text-sm italic">Brak.</p>}
                    </Section>
                </div>
            </div>
        </div>
    );
};

export default ArchivedProductionRunReportPage;