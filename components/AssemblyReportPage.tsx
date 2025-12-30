
import React, { useState, useMemo } from 'react';
import { useAppContext } from './contexts/AppContext';
import { ProductionRun, PsdTask, PsdBatch, FinishedGoodItem, AgroConsumedMaterial, PsdConsumedMaterial } from '../types';
import Input from './Input';
import Button from './Button';
import SearchIcon from './icons/SearchIcon';
import Alert from './Alert';
import { formatDate } from '../src/utils';
import CubeTransparentIcon from './icons/CubeTransparentIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ChevronUpIcon from './icons/ChevronUpIcon';

interface AssemblyData {
    run: ProductionRun | PsdTask;
    type: 'AGRO' | 'PSD';
    totalConsumed: Record<string, number>;
    totalProducedKg: number;
    batches: BatchDetail[];
    returns: FinishedGoodItem[];
}

interface BatchDetail {
    id: string;
    number: number;
    standardConsumption: Record<string, number>;
    adjustmentsConsumption: Record<string, number>;
    producedKg: number;
}

const AssemblyReportPage: React.FC = () => {
    const { productionRunsList, psdTasks, finishedGoodsList } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);

    const searchResults = useMemo(() => {
        if (!searchTerm.trim()) return [];
        const lowerTerm = searchTerm.toLowerCase();
        
        const agroMatches = (productionRunsList || []).filter((r: ProductionRun) => 
            r.id.toLowerCase().includes(lowerTerm) || r.recipeName.toLowerCase().includes(lowerTerm)
        ).map((r: ProductionRun) => ({ ...r, type: 'AGRO' as const }));

        const psdMatches = (psdTasks || []).filter((t: PsdTask) => 
            t.id.toLowerCase().includes(lowerTerm) || t.recipeName.toLowerCase().includes(lowerTerm) || t.name.toLowerCase().includes(lowerTerm)
        ).map((t: PsdTask) => ({ ...t, type: 'PSD' as const }));

        return [...agroMatches, ...psdMatches];
    }, [searchTerm, productionRunsList, psdTasks]);

    const reportData = useMemo((): AssemblyData | null => {
        if (!selectedRunId) return null;

        const run = (productionRunsList || []).find((r: ProductionRun) => r.id === selectedRunId) || 
                    (psdTasks || []).find((t: PsdTask) => t.id === selectedRunId);
        
        if (!run) return null;

        const isAgro = (run as any).targetBatchSizeKg !== undefined; // Check property specific to Agro
        const type = isAgro ? 'AGRO' : 'PSD';
        const batches: BatchDetail[] = [];
        const totalConsumed: Record<string, number> = {};
        let totalProducedKg = 0;

        // Helper to aggregate consumption
        const aggregate = (target: Record<string, number>, name: string, amount: number) => {
            target[name] = (target[name] || 0) + amount;
        };

        run.batches.forEach((batch: PsdBatch) => {
            const standardConsumption: Record<string, number> = {};
            const adjustmentsConsumption: Record<string, number> = {};
            let batchProduced = 0;

            // Production (Output)
            if (isAgro) {
                // For Agro, production is often tracked per batch via split/registration logic, but total is on run.
                // We'll try to estimate or find linked FG.
                // In this system, FG usually links to runId and sometimes batchId.
                const batchFGs = (finishedGoodsList || []).filter((fg: FinishedGoodItem) => 
                    fg.productionRunId === run.id && (fg.batchId === batch.id || (fg.batchSplit && fg.batchSplit.some((s: any) => s.batchId === batch.id)))
                );
                
                batchFGs.forEach((fg: FinishedGoodItem) => {
                    if (fg.batchSplit && fg.batchSplit.length > 0) {
                        const splitPart = fg.batchSplit.find((s: any) => s.batchId === batch.id);
                        if (splitPart) batchProduced += splitPart.weight;
                    } else {
                        batchProduced += fg.quantityKg;
                    }
                });

            } else {
                // PSD tracks production in batch.producedGoods
                batchProduced = (batch.producedGoods || [])
                    .filter((g: any) => !g.isAnnulled)
                    .reduce((sum: number, g: any) => sum + g.producedWeight, 0);
            }
            
            totalProducedKg += batchProduced;

            // Consumption (Input)
            let consumables: (AgroConsumedMaterial | PsdConsumedMaterial)[] = [];
            
            if (isAgro) {
                consumables = ((run as ProductionRun).actualIngredientsUsed || [])
                    .filter(c => c.batchId === batch.id && !c.isAnnulled);
            } else {
                consumables = batch.consumedPallets || [];
            }

            consumables.forEach(c => {
                const qty = 'actualConsumedQuantityKg' in c ? c.actualConsumedQuantityKg : (c as PsdConsumedMaterial).consumedWeight;
                const name = c.productName;
                const isAdj = c.isAdjustment;

                if (isAdj) {
                    aggregate(adjustmentsConsumption, name, qty);
                } else {
                    aggregate(standardConsumption, name, qty);
                }
                // Add to global total
                aggregate(totalConsumed, name, qty);
            });

            batches.push({
                id: batch.id,
                number: batch.batchNumber,
                standardConsumption,
                adjustmentsConsumption,
                producedKg: batchProduced
            });
        });

        // Returns
        const returns = (finishedGoodsList || []).filter((fg: FinishedGoodItem) => 
            (isAgro ? fg.productionRunId === run.id : fg.psdTaskId === run.id) && 
            fg.status === 'returned_to_production'
        );

        return {
            run,
            type: type as 'AGRO' | 'PSD',
            totalConsumed,
            totalProducedKg,
            batches,
            returns
        };

    }, [selectedRunId, productionRunsList, psdTasks, finishedGoodsList]);

    const handleSelectRun = (id: string) => {
        setSelectedRunId(id);
        setSearchTerm(''); // Clear search to show report
    };

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900 min-h-full flex flex-col">
            <header className="flex items-center gap-3 mb-6 pb-3 border-b dark:border-secondary-700">
                <CubeTransparentIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                <div>
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Raport Montażu Produkcyjnego</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Szczegółowy bilans surowców, produkcji i zwrotów.</p>
                </div>
            </header>

            {/* Search Section */}
            <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md mb-6">
                <div className="flex gap-2">
                    <div className="flex-grow">
                        <Input
                            label="Szukaj Zlecenia (ID lub Nazwa)"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            icon={<SearchIcon className="h-5 w-5 text-gray-400"/>}
                            placeholder="Np. ZLEAGR..., MlekoMax..."
                        />
                    </div>
                    {selectedRunId && (
                        <Button onClick={() => setSelectedRunId(null)} variant="secondary" className="self-end mb-1">
                            Wyczyść
                        </Button>
                    )}
                </div>
                
                {searchTerm && (
                    <div className="mt-2 max-h-60 overflow-y-auto border dark:border-secondary-700 rounded-md bg-white dark:bg-secondary-900 absolute z-10 w-full max-w-3xl shadow-lg">
                        {searchResults.length > 0 ? (
                            searchResults.map((res: any) => (
                                <button 
                                    key={res.id} 
                                    onClick={() => handleSelectRun(res.id)}
                                    className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-secondary-700 border-b dark:border-secondary-800 last:border-0"
                                >
                                    <div className="flex justify-between">
                                        <span className="font-bold text-primary-700 dark:text-primary-300">{res.recipeName || res.name}</span>
                                        <span className="text-xs bg-gray-200 dark:bg-secondary-600 px-2 py-0.5 rounded">{res.type}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-mono">{res.id} | {formatDate(res.createdAt || res.plannedDate)}</p>
                                </button>
                            ))
                        ) : (
                            <div className="p-3 text-gray-500 text-center text-sm">Brak wyników</div>
                        )}
                    </div>
                )}
            </div>

            {/* Report Section */}
            {reportData ? (
                <div className="space-y-6 animate-fadeIn">
                    {/* Header Info */}
                    <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow border-l-4 border-blue-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{(reportData.run as any).recipeName || (reportData.run as any).name}</h3>
                                <p className="text-sm font-mono text-gray-500">{reportData.run.id}</p>
                            </div>
                            <div className="text-right">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${reportData.run.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                    {reportData.run.status}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">{formatDate((reportData.run as any).createdAt || (reportData.run as any).plannedDate, true)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Section 1: Global Summary */}
                        <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow">
                            <h4 className="text-lg font-semibold mb-4 pb-2 border-b dark:border-secondary-700">Podsumowanie Całkowite</h4>
                            
                            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">Całkowita Produkcja (Netto)</span>
                                    <span className="text-xl font-bold text-green-700 dark:text-green-400">{reportData.totalProducedKg.toFixed(2)} kg</span>
                                </div>
                            </div>

                            <h5 className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase">Zużyte Surowce (Suma)</h5>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-100 dark:bg-secondary-700">
                                        <tr>
                                            <th className="p-2 text-left">Surowiec</th>
                                            <th className="p-2 text-right">Ilość (kg)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-secondary-700">
                                        {Object.entries(reportData.totalConsumed).map(([name, qty]) => (
                                            <tr key={name}>
                                                <td className="p-2 text-gray-800 dark:text-gray-200">{name}</td>
                                                <td className="p-2 text-right font-mono">{(qty as number).toFixed(3)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-slate-50 dark:bg-secondary-700/50 font-bold border-t-2 border-slate-200 dark:border-secondary-600">
                                            <td className="p-2">RAZEM WSAD</td>
                                            <td className="p-2 text-right">{(Object.values(reportData.totalConsumed) as number[]).reduce((a, b) => a + b, 0).toFixed(3)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        {/* Section 4: Returns (Placed here for layout balance) */}
                         <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow h-fit">
                            <h4 className="text-lg font-semibold mb-4 pb-2 border-b dark:border-secondary-700">Zwroty do Produkcji</h4>
                            {reportData.returns.length > 0 ? (
                                <ul className="space-y-2">
                                    {reportData.returns.map(ret => (
                                        <li key={ret.id} className="p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-sm text-orange-800 dark:text-orange-200">{ret.productName}</p>
                                                <p className="text-xs text-orange-700 dark:text-orange-300 font-mono">{ret.displayId}</p>
                                            </div>
                                            <span className="font-bold text-orange-700 dark:text-orange-300">{ret.quantityKg.toFixed(2)} kg</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-sm italic">Brak zarejestrowanych zwrotów (resztek).</p>
                            )}
                        </div>
                    </div>

                    {/* Section 2 & 3: Batches Breakdown */}
                    <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow">
                        <h4 className="text-lg font-semibold mb-4 pb-2 border-b dark:border-secondary-700">Szczegóły Szarż (Partii)</h4>
                        <div className="space-y-4">
                            {reportData.batches.map(batch => (
                                <div key={batch.id} className="border dark:border-secondary-700 rounded-lg overflow-hidden">
                                    <button 
                                        onClick={() => setExpandedBatchId(expandedBatchId === batch.id ? null : batch.id)}
                                        className="w-full flex justify-between items-center p-3 bg-slate-100 dark:bg-secondary-700 hover:bg-slate-200 dark:hover:bg-secondary-600 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            {expandedBatchId === batch.id ? <ChevronUpIcon className="h-5 w-5"/> : <ChevronDownIcon className="h-5 w-5"/>}
                                            <span className="font-bold text-gray-800 dark:text-gray-200">Partia #{batch.number}</span>
                                        </div>
                                        <div className="flex gap-4 text-sm">
                                            <span>Produkcja: <strong>{batch.producedKg.toFixed(2)} kg</strong></span>
                                            <span>Wsad: <strong>{((Object.values(batch.standardConsumption) as number[]).reduce((a, b) => a + b, 0) + (Object.values(batch.adjustmentsConsumption) as number[]).reduce((a, b) => a + b, 0)).toFixed(2)} kg</strong></span>
                                        </div>
                                    </button>
                                    
                                    {expandedBatchId === batch.id && (
                                        <div className="p-4 bg-white dark:bg-secondary-800 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                                            <div>
                                                <h5 className="text-xs font-bold uppercase text-gray-500 mb-2">Zużycie Standardowe</h5>
                                                <ul className="text-sm space-y-1">
                                                    {Object.entries(batch.standardConsumption).map(([name, qty]: [string, number]) => (
                                                        <li key={name} className="flex justify-between border-b dark:border-secondary-700 last:border-0 py-1">
                                                            <span>{name}</span>
                                                            <span className="font-mono">{qty.toFixed(3)} kg</span>
                                                        </li>
                                                    ))}
                                                    {Object.keys(batch.standardConsumption).length === 0 && <li className="italic text-gray-400">Brak danych</li>}
                                                </ul>
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-bold uppercase text-yellow-600 dark:text-yellow-500 mb-2">Dosypki (Korekty)</h5>
                                                <ul className="text-sm space-y-1">
                                                    {Object.entries(batch.adjustmentsConsumption).map(([name, qty]: [string, number]) => (
                                                        <li key={name} className="flex justify-between border-b dark:border-secondary-700 last:border-0 py-1 bg-yellow-50 dark:bg-yellow-900/10 px-1 rounded">
                                                            <span>{name}</span>
                                                            <span className="font-mono font-bold">{qty.toFixed(3)} kg</span>
                                                        </li>
                                                    ))}
                                                     {Object.keys(batch.adjustmentsConsumption).length === 0 && <li className="italic text-gray-400">Brak dosypek</li>}
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-secondary-800 rounded-lg shadow border-2 border-dashed border-gray-300 dark:border-secondary-700">
                    <p className="text-gray-500 dark:text-gray-400 mb-2">Wybierz zlecenie z listy wyszukiwania, aby zobaczyć raport.</p>
                </div>
            )}
        </div>
    );
};

export default AssemblyReportPage;
