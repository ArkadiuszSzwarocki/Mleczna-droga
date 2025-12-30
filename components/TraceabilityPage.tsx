
import React, { useState, useMemo, useCallback } from 'react';
import { RawMaterialLogEntry, FinishedGoodItem, ProductionRun, PsdTask, AgroConsumedMaterial, PsdConsumedMaterial } from '../types';
import Input from './Input';
import SearchIcon from './icons/SearchIcon';
import Button from './Button';
import Alert from './Alert';
import { formatDate } from '../src/utils';
import LinkIcon from './icons/LinkIcon';
import { useAppContext } from './contexts/AppContext';
import CubeIcon from './icons/CubeIcon';
import BeakerIcon from './icons/BeakerIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';

interface TraceResult {
    pallet: FinishedGoodItem;
    run: ProductionRun | PsdTask;
    ingredients: {
        productName: string;
        palletId: string;
        lotNumber: string;
        quantity: number;
        batchNumber: number;
    }[];
}

const TraceabilityPage: React.FC = () => {
    const { findPalletByUniversalId, productionRunsList, psdTasks, rawMaterialsLogList } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [result, setResult] = useState<TraceResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setResult(null);

        const id = searchTerm.trim();
        if (!id) return;

        // 1. Znajdź paletę WG
        const palletInfo = findPalletByUniversalId(id);
        if (!palletInfo || palletInfo.type !== 'fg') {
            setError(`Nie znaleziono palety Wyrobu Gotowego o ID: ${id}`);
            return;
        }

        const fg = palletInfo.item as FinishedGoodItem;
        const runId = fg.productionRunId || fg.psdTaskId;

        // 2. Znajdź zlecenie
        const run = (productionRunsList || []).find(r => r.id === runId) || 
                    (psdTasks || []).find(t => t.id === runId);

        if (!run) {
            setError(`Paleta istnieje, ale nie odnaleziono powiązanego zlecenia produkcyjnego (${runId}).`);
            return;
        }

        // 3. Rekonstrukcja składu (Traceability)
        const ingredients: TraceResult['ingredients'] = [];
        
        // Sprawdzamy szarże, z których powstała ta paleta
        const activeBatches = fg.batchSplit?.map(s => s.batchId) || [fg.batchId].filter(Boolean);

        activeBatches.forEach(batchId => {
            const batchObj = run.batches.find(b => b.id === batchId);
            const batchNum = batchObj?.batchNumber || 0;

            // Dla AGRO
            if ('actualIngredientsUsed' in run) {
                const consumptions = (run.actualIngredientsUsed || []).filter(c => c.batchId === batchId && !c.isAnnulled);
                consumptions.forEach(c => {
                    const sourcePallet = (rawMaterialsLogList || []).find(p => p.id === c.actualSourcePalletId);
                    ingredients.push({
                        productName: c.productName,
                        palletId: c.actualSourcePalletId,
                        lotNumber: sourcePallet?.palletData.batchNumber || 'BRAK DANYCH',
                        quantity: c.actualConsumedQuantityKg,
                        batchNumber: batchNum
                    });
                });
            }
            // Dla PSD
            else if (batchObj && 'consumedPallets' in batchObj) {
                (batchObj.consumedPallets || []).forEach(c => {
                    const sourcePallet = (rawMaterialsLogList || []).find(p => p.id === c.palletId);
                    ingredients.push({
                        productName: c.productName,
                        palletId: c.palletId,
                        lotNumber: sourcePallet?.palletData.batchNumber || 'BRAK DANYCH',
                        quantity: c.consumedWeight,
                        batchNumber: batchNum
                    });
                });
            }
        });

        setResult({ pallet: fg, run, ingredients });
    };

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900/50 h-full flex flex-col">
            <header className="flex items-center mb-6 border-b dark:border-secondary-600 pb-3">
                <LinkIcon className="h-8 w-8 text-primary-600 mr-3" />
                <div>
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Traceability - Śledzenie Partii</h2>
                    <p className="text-sm text-gray-500">Weryfikacja składu surowcowego wyrobu gotowego.</p>
                </div>
            </header>

            <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-2xl">
                <Input 
                    label="Wpisz ID Palety Wyrobu Gotowego (SSCC)" 
                    placeholder="np. WGAGR..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)} 
                    icon={<SearchIcon className="h-5 w-5 text-gray-400"/>} 
                />
                <Button type="submit" className="self-end mb-1">Analizuj Ścieżkę</Button>
            </form>

            <div className="flex-grow overflow-auto">
                {error && <Alert type="error" message={error} />}
                
                {result && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* NAGŁÓWEK WYNIKU */}
                        <div className="bg-white dark:bg-secondary-800 p-6 rounded-xl shadow-lg border-l-8 border-green-500">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Wyrób Gotowy</h3>
                                    <p className="text-2xl font-black text-gray-900 dark:text-white">{result.pallet.productName}</p>
                                    <p className="font-mono text-primary-600 dark:text-primary-400 text-lg">{result.pallet.displayId}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Data Produkcji: <strong>{formatDate(result.pallet.productionDate, true)}</strong></p>
                                    <p className="text-sm text-gray-500">Waga Netto: <strong className="text-lg text-gray-900 dark:text-white">{result.pallet.quantityKg} kg</strong></p>
                                </div>
                            </div>
                        </div>

                        {/* PROCES PRODUKCYJNY */}
                        <div className="relative pl-8">
                            <div className="absolute left-3 top-0 bottom-0 w-1 bg-blue-200 dark:bg-blue-900/40 rounded-full"></div>
                            
                            <section className="mb-8 relative">
                                <div className="absolute -left-[26px] top-1 w-5 h-5 rounded-full bg-blue-500 border-4 border-white dark:border-secondary-900 shadow-sm"></div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <h4 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                        <BeakerIcon className="h-5 w-5" />
                                        Zlecenie Produkcyjne: {result.run.id}
                                    </h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                                        Typ linii: {result.run.id.startsWith('ZLEAGR') ? 'AGRO' : 'PSD'} | Receptura: {result.run.recipeName}
                                    </p>
                                </div>
                            </section>

                            {/* SKŁADNIKI SUROWCOWE */}
                            <section className="relative">
                                <div className="absolute -left-[26px] top-1 w-5 h-5 rounded-full bg-yellow-500 border-4 border-white dark:border-secondary-900 shadow-sm"></div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-4 ml-2">Użyte Surowce i Komponenty</h4>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {result.ingredients.map((ing, idx) => (
                                        <div key={idx} className="bg-white dark:bg-secondary-800 p-4 rounded-lg border dark:border-secondary-700 shadow-sm flex items-center gap-4 hover:border-primary-500 transition-colors">
                                            <div className="p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded-full">
                                                <CubeIcon className="h-6 w-6 text-yellow-600" />
                                            </div>
                                            <div className="flex-grow min-w-0">
                                                <div className="flex justify-between items-start">
                                                    <p className="font-bold text-gray-900 dark:text-white truncate">{ing.productName}</p>
                                                    <span className="text-[10px] bg-slate-100 dark:bg-secondary-700 px-1.5 py-0.5 rounded font-bold">SZARŻA #{ing.batchNumber}</span>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">Nr Partii: <span className="font-bold text-gray-700 dark:text-gray-300">{ing.lotNumber}</span></p>
                                                <p className="text-xs text-gray-500">ID Palety: <span className="font-mono text-primary-600">{ing.palletId}</span></p>
                                                <div className="flex justify-between items-center mt-2 pt-2 border-t dark:border-secondary-700">
                                                    <span className="text-xs text-gray-400">Pobrano:</span>
                                                    <span className="font-black text-gray-800 dark:text-gray-200">{ing.quantity.toFixed(3)} kg</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                        
                        <div className="pt-6 text-center text-gray-500 text-xs italic">
                            Raport wygenerowano automatycznie na podstawie rejestrów wagowych systemu MES.
                        </div>
                    </div>
                )}

                {!result && !error && !searchTerm && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed rounded-xl dark:border-secondary-700">
                        <LinkIcon className="h-16 w-16 mb-4 opacity-20" />
                        <p>Wprowadź ID palety wyrobu gotowego, aby wyświetlić jej genealogię.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TraceabilityPage;
