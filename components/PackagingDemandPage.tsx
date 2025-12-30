
import React, { useState, useMemo, useEffect } from 'react';
import { ProductionRun, PsdTask, Recipe, PackagingMaterialLogEntry } from '../types';
import { useAppContext } from './contexts/AppContext';
import { getBlockInfo, exportToCsv, formatDate } from '../src/utils';
import Input from './Input';
import Button from './Button';
import Alert from './Alert';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';

type DemandItem = {
    productName: string;
    required: number;
    available: number;
    deficit: number;
    unit: 'kg' | 'szt.';
    relatedRuns: string[];
};

const PackagingDemandPage: React.FC = () => {
    const { productionRunsList, psdTasks, recipes, packagingMaterialsLog } = useAppContext();
    const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date.toISOString().split('T')[0];
    });

    const [demandData, setDemandData] = useState<DemandItem[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setIsCalculating(true);

        const calculateDemand = () => {
            const requiredQuantities: Record<string, { required: number; unit: 'kg' | 'szt.'; runs: Set<string> }> = {};

            const processItems = (items: (ProductionRun | PsdTask)[]) => {
                items.forEach(item => {
                    if (!('plannedDate' in item) || (item.status !== 'planned' && item.status !== 'ongoing')) return;

                    const itemDate = new Date(item.plannedDate + 'T00:00:00.000Z');
                    const start = new Date(startDate + 'T00:00:00.000Z');
                    const end = new Date(endDate + 'T23:59:59.999Z');

                    if (itemDate < start || itemDate > end) return;

                    const itemRecipe = (recipes as Recipe[]).find(r => r.id === item.recipeId);
                    if (!itemRecipe || !itemRecipe.packagingBOM) return;

                    const targetQuantity = 'targetQuantity' in item ? item.targetQuantity : item.targetBatchSizeKg;
                    if (!isFinite(targetQuantity) || targetQuantity <= 0) return;

                    const { bag, bagCapacityKg, foilRoll, foilWeightPerBagKg, stretchFilm, slipSheet } = itemRecipe.packagingBOM;
                    const totalBags = Math.ceil(targetQuantity / bagCapacityKg);
                    const totalFoilWeight = totalBags * foilWeightPerBagKg;
                    const totalPallets = Math.ceil(targetQuantity / 1000);

                    const materials = [
                        { name: bag.name, required: totalBags, unit: 'szt.' as const },
                        { name: foilRoll.name, required: totalFoilWeight, unit: 'kg' as const },
                    ];

                    if (stretchFilm) materials.push({ name: stretchFilm.name, required: totalPallets, unit: 'szt.' as const });
                    if (slipSheet) materials.push({ name: slipSheet.name, required: totalPallets, unit: 'szt.' as const });

                    materials.forEach(mat => {
                        if (!requiredQuantities[mat.name]) {
                            requiredQuantities[mat.name] = { required: 0, unit: mat.unit, runs: new Set() };
                        }
                        requiredQuantities[mat.name].required += mat.required;
                        requiredQuantities[mat.name].runs.add(item.id);
                    });
                });
            };

            processItems([...(productionRunsList || []), ...(psdTasks || [])]);

            const availableStock: Record<string, number> = (packagingMaterialsLog || []).reduce((acc, material) => {
                if (!getBlockInfo(material).isBlocked) {
                    acc[material.productName] = (acc[material.productName] || 0) + material.currentWeight;
                }
                return acc;
            }, {} as Record<string, number>);

            const result = Object.entries(requiredQuantities).map(([productName, data]) => {
                const available = availableStock[productName] || 0;
                const deficit = Math.max(0, data.required - available);
                return {
                    productName,
                    required: data.required,
                    available,
                    deficit,
                    unit: data.unit,
                    relatedRuns: Array.from(data.runs)
                };
            });

            setDemandData(result);
            setIsCalculating(false);
        };

        // Simulate async calculation for better UX
        const timer = setTimeout(calculateDemand, 300);
        return () => clearTimeout(timer);

    }, [productionRunsList, psdTasks, recipes, packagingMaterialsLog, startDate, endDate]);

    const { items: sortedData, requestSort, sortConfig } = useSortableData(demandData, { key: 'deficit', direction: 'descending' });

    const handleExport = () => {
        const dataToExport = sortedData.map(item => ({
            'Nazwa Opakowania': item.productName,
            'Wymagane': item.required.toFixed(2),
            'Jednostka': item.unit,
            'Dostępne': item.available.toFixed(2),
            'Brak': item.deficit.toFixed(2),
            'Powiązane Zlecenia': item.relatedRuns.join(', ')
        }));
        exportToCsv(`zapotrzebowanie_opakowan_${startDate}_do_${endDate}.csv`, dataToExport);
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex-shrink-0 flex items-center mb-4 border-b dark:border-secondary-600 pb-3">
                <ArchiveBoxIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Zapotrzebowanie na Opakowania</h2>
            </header>

            <div className="p-4 bg-gray-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700 mb-4 flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Input label="Data od" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <Input label="Data do" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
                    <Button onClick={handleExport} disabled={sortedData.length === 0 || isCalculating} leftIcon={<PrintLabelIcon className="h-5 w-5" />}>
                        Eksportuj do CSV
                    </Button>
                </div>
            </div>
            
            <Alert type="info" message="Jak działa raport?" details="Raport analizuje BOM (Bill of Materials) dla wszystkich zaplanowanych i trwających zleceń w wybranym okresie. Oblicza całkowite zapotrzebowanie na opakowania i porównuje je z dostępnym stanem magazynowym." />

            <div className="flex-grow overflow-auto mt-4">
                {isCalculating ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="ml-4 text-gray-500">Obliczanie zapotrzebowania...</p>
                    </div>
                ) : sortedData.length === 0 ? (
                    <div className="text-center py-10 flex flex-col items-center">
                        <InformationCircleIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">Brak Danych w Wybranym Okresie</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Spróbuj poszerzyć zakres dat.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                        <thead className="bg-gray-100 dark:bg-secondary-700">
                            <tr>
                                <SortableHeader columnKey="productName" sortConfig={sortConfig} requestSort={requestSort}>Nazwa Opakowania</SortableHeader>
                                <SortableHeader columnKey="required" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Wymagane</SortableHeader>
                                <SortableHeader columnKey="available" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Dostępne</SortableHeader>
                                <SortableHeader columnKey="deficit" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Brak</SortableHeader>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {sortedData.map(item => (
                                <tr key={item.productName} className={item.deficit > 0 ? 'bg-red-50 dark:bg-red-900/40' : ''}>
                                    <td className="px-3 py-2 font-medium">{item.productName}</td>
                                    <td className="px-3 py-2 text-right">{item.required.toFixed(2)} {item.unit}</td>
                                    <td className="px-3 py-2 text-right">{item.available.toFixed(2)} {item.unit}</td>
                                    <td className={`px-3 py-2 text-right font-bold ${item.deficit > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                        {item.deficit.toFixed(2)} {item.unit}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default PackagingDemandPage;
