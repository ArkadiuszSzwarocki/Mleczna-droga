
import React, { useState, useMemo, useEffect } from 'react';
import { ProductionRun, PsdTask, Recipe, RawMaterialLogEntry, InternalTransferOrder, InternalTransferItem } from '../types';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useProductionContext } from './contexts/ProductionContext';
import { usePsdContext } from './contexts/PsdContext';
import { useLogisticsContext } from './contexts/LogisticsContext';
import { useUIContext } from './contexts/UIContext';
import { useAppContext } from './contexts/AppContext';
import { getBlockInfo, exportToCsv, formatDate } from '../src/utils';
import Input from './Input';
import Button from './Button';
import Alert from './Alert';
import { useSortableData } from '../src/useSortableData';
import SortableHeader from './SortableHeader';
import DocumentChartBarIcon from './icons/DocumentChartBarIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import TruckIcon from './icons/TruckIcon';
import XCircleIcon from './icons/XCircleIcon';
import { OSIP_WAREHOUSE_ID } from '../constants';

type DemandItem = {
    productName: string;
    required: number;
    available: number;
    osipAvailable: number; 
    deficit: number;
    relatedRuns: string[];
};

const QuantitySelectionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (qty: number) => void;
    item: DemandItem | null;
}> = ({ isOpen, onClose, onConfirm, item }) => {
    const [qty, setQty] = useState('');

    useEffect(() => {
        if (isOpen && item) {
            setQty(item.deficit.toFixed(0));
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[200]">
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-2xl p-6 w-full max-w-md animate-fadeIn" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">Ile kg przenieść?</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircleIcon className="h-6 w-6"/></button>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4 text-sm">
                    <p><strong>Surowiec:</strong> {item.productName}</p>
                    <p><strong>Brakujący stan:</strong> {item.deficit.toFixed(0)} kg</p>
                    <p><strong>Dostępne w OSiP:</strong> {item.osipAvailable.toFixed(0)} kg</p>
                </div>
                <Input 
                    label="Ilość do zamówienia (kg)"
                    type="number"
                    value={qty}
                    onChange={e => setQty(e.target.value)}
                    autoFocus
                    min="1"
                    max={item.osipAvailable}
                />
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="secondary" onClick={onClose}>Anuluj</Button>
                    <Button onClick={() => onConfirm(parseFloat(qty))} disabled={!qty || parseFloat(qty) <= 0 || parseFloat(qty) > item.osipAvailable}>Potwierdź</Button>
                </div>
            </div>
        </div>
    );
};

const RawMaterialDemandPage: React.FC = () => {
    const { productionRunsList, recipes } = useProductionContext();
    const { rawMaterialsLogList } = useWarehouseContext();
    const { psdTasks } = usePsdContext();
    const { handleCreateInternalTransfer, internalTransferOrders } = useLogisticsContext();
    const { showToast } = useUIContext();
    const { reservedForTransferPalletIds, setInternalTransferOrders } = useAppContext();

    const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() + 7);
        return date.toISOString().split('T')[0];
    });

    const [demandData, setDemandData] = useState<DemandItem[]>([]);
    const [isCalculating, setIsCalculating] = useState(false);
    const [selectedItemForTransfer, setSelectedItemForTransfer] = useState<DemandItem | null>(null);

    useEffect(() => {
        setIsCalculating(true);
        const workerCode = `
            const getBlockInfo = (item) => {
                const isRaw = 'palletData' in item;
                const today = new Date().toISOString().split('T')[0];
                const isBlockedManually = isRaw ? item.palletData?.isBlocked : item.isBlocked;
                let isExpired = false;
                const expiryDateString = isRaw ? item.palletData?.dataPrzydatnosci : item.expiryDate;

                if (expiryDateString && typeof expiryDateString === 'string') {
                    const datePart = expiryDateString.includes('T') ? expiryDateString.split('T')[0] : expiryDateString;
                    isExpired = datePart < today;
                }
                if (isExpired || isBlockedManually) return { isBlocked: true };
                return { isBlocked: false };
            };

            self.onmessage = (e) => {
                const { productionRunsList, psdTasks, recipes, rawMaterialsLogList, startDate, endDate, osipId, reservedIds } = e.data;
                const reservedSet = new Set(reservedIds);
                const requiredQuantities = {};
                const allRecipes = recipes || [];

                const processItems = (items, isPsd) => {
                    items.forEach(item => {
                        if (!item.plannedDate || (item.status !== 'planned' && item.status !== 'ongoing')) return;
                        const itemDate = new Date(item.plannedDate + 'T00:00:00.000Z');
                        const start = new Date(startDate + 'T00:00:00.000Z');
                        const end = new Date(endDate + 'T23:59:59.999Z');
                        if (itemDate < start || itemDate > end) return;
                        const itemRecipe = allRecipes.find(r => r.id === item.recipeId);
                        if (!itemRecipe) return;
                        const targetQuantity = isPsd ? item.targetQuantity : item.targetBatchSizeKg;
                        const recipeBatchWeight = itemRecipe.ingredients.reduce((sum, ing) => sum + ing.quantityKg, 0);
                        if (recipeBatchWeight <= 0) return;
                        const scale = targetQuantity / recipeBatchWeight;
                        itemRecipe.ingredients.forEach(ing => {
                            const requiredWithOverage = ing.quantityKg * scale * 1.05;
                            if (!isFinite(requiredWithOverage)) return;
                            if (!requiredQuantities[ing.productName]) {
                                requiredQuantities[ing.productName] = { required: 0, runs: new Set() };
                            }
                            requiredQuantities[ing.productName].required += requiredWithOverage;
                            requiredQuantities[ing.productName].runs.add(item.id);
                        });
                    });
                };

                processItems(productionRunsList || [], false);
                processItems(psdTasks || [], true);

                const availableStock = {};
                const osipStock = {};

                (rawMaterialsLogList || []).forEach(pallet => {
                    const block = getBlockInfo(pallet);
                    const isReserved = reservedSet.has(pallet.id);
                    if (!block.isBlocked && !isReserved && pallet.palletData.currentWeight > 0) {
                        const productName = pallet.palletData.nazwa;
                        if (pallet.currentLocation === osipId) {
                            osipStock[productName] = (osipStock[productName] || 0) + pallet.palletData.currentWeight;
                        } else {
                            availableStock[productName] = (availableStock[productName] || 0) + pallet.palletData.currentWeight;
                        }
                    }
                });

                const result = Object.entries(requiredQuantities).map(([productName, data]) => {
                    const available = availableStock[productName] || 0;
                    const osipAvail = osipStock[productName] || 0;
                    const deficit = Math.max(0, data.required - available);
                    return {
                        productName,
                        required: data.required,
                        available,
                        osipAvailable: osipAvail,
                        deficit,
                        relatedRuns: Array.from(data.runs)
                    };
                });
                self.postMessage(result);
            };
        `;

        const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(workerBlob);
        const worker = new Worker(workerUrl);

        worker.onmessage = (e) => {
            setDemandData(e.data);
            setIsCalculating(false);
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
        };

        worker.postMessage({ 
            productionRunsList, 
            psdTasks, 
            recipes, 
            rawMaterialsLogList, 
            startDate, 
            endDate,
            osipId: OSIP_WAREHOUSE_ID,
            reservedIds: Array.from(reservedForTransferPalletIds)
        });

        return () => worker.terminate();
    }, [productionRunsList, psdTasks, recipes, rawMaterialsLogList, startDate, endDate, reservedForTransferPalletIds]);

    const { items: sortedData, requestSort, sortConfig } = useSortableData(demandData, { key: 'deficit', direction: 'descending' });

    const handleConfirmTransferQty = (quantityRequested: number) => {
        if (!selectedItemForTransfer) return;

        const newItem: InternalTransferItem = {
            productName: selectedItemForTransfer.productName,
            requestedQty: quantityRequested,
            unit: 'kg'
        };

        const existingPlannedOrder = (internalTransferOrders || []).find(
            o => o.status === 'PLANNED' && o.sourceWarehouse === 'OSIP' && (o.destinationWarehouse === 'MS01' || o.destinationWarehouse === 'CENTRALA')
        );

        if (existingPlannedOrder) {
            setInternalTransferOrders((prev: InternalTransferOrder[]) => prev.map(o => 
                o.id === existingPlannedOrder.id 
                    ? { ...o, items: [...o.items, newItem] } 
                    : o
            ));
            showToast(`Dopisano zapotrzebowanie do istniejącego planu ${existingPlannedOrder.id}.`, 'success');
        } else {
            const result = handleCreateInternalTransfer([newItem], OSIP_WAREHOUSE_ID, 'MS01');
            if (result.success) {
                showToast(`Utworzono nowy plan transferu z OSiP.`, 'success');
            } else {
                showToast(result.message, 'error');
            }
        }

        setSelectedItemForTransfer(null);
    };

    const handleExport = () => {
        const dataToExport = sortedData.map(item => ({
            'Nazwa surowca': item.productName,
            'Wymagane (kg)': item.required.toFixed(2),
            'Dostępne Centrala (kg)': item.available.toFixed(2),
            'Dostępne OSiP (kg)': item.osipAvailable.toFixed(2),
            'Brak (kg)': item.deficit.toFixed(2),
            'Zlecenia': item.relatedRuns.join(', ')
        }));
        exportToCsv(`zapotrzebowanie_surowcowe_${startDate}_do_${endDate}.csv`, dataToExport);
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex-shrink-0 flex items-center mb-4 border-b dark:border-secondary-600 pb-3">
                <DocumentChartBarIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Zapotrzebowanie Surowcowe</h2>
            </header>

            <div className="p-4 bg-gray-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700 mb-4 flex-shrink-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <Input label="Data od" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                    <Input label="Data do" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
                    <Button onClick={handleExport} disabled={sortedData.length === 0 || isCalculating} leftIcon={<PrintLabelIcon className="h-5 w-5"/>}>
                        Eksportuj do CSV
                    </Button>
                </div>
            </div>

            <div className="flex-grow overflow-auto mt-4">
                {isCalculating ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="ml-4 text-gray-500">Przeliczanie bilansu...</p>
                    </div>
                ) : sortedData.length === 0 ? (
                    <div className="text-center py-10 flex flex-col items-center">
                        <InformationCircleIcon className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">Brak Zapotrzebowania</h3>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm">
                        <thead className="bg-gray-100 dark:bg-secondary-700">
                            <tr>
                                <SortableHeader columnKey="productName" sortConfig={sortConfig} requestSort={requestSort}>Surowiec</SortableHeader>
                                <SortableHeader columnKey="required" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Wymagane</SortableHeader>
                                <SortableHeader columnKey="available" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Centrala</SortableHeader>
                                <SortableHeader columnKey="osipAvailable" sortConfig={sortConfig} requestSort={requestSort} className="justify-end text-blue-600">OSiP Wolne</SortableHeader>
                                <SortableHeader columnKey="deficit" sortConfig={sortConfig} requestSort={requestSort} className="justify-end">Brak</SortableHeader>
                                <th className="px-3 py-2 text-right">Akcja</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                            {sortedData.map(item => {
                                const hasOsipStock = item.osipAvailable > 0;
                                return (
                                <tr key={item.productName} className={item.deficit > 0 ? 'bg-red-50/30 dark:bg-red-900/10' : ''}>
                                    <td className="px-3 py-2 font-medium">{item.productName}</td>
                                    <td className="px-3 py-2 text-right font-mono">{item.required.toFixed(0)} kg</td>
                                    <td className="px-3 py-2 text-right font-mono">{item.available.toFixed(0)} kg</td>
                                    <td className={`px-3 py-2 text-right font-mono ${hasOsipStock ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>{item.osipAvailable.toFixed(0)} kg</td>
                                    <td className={`px-3 py-2 text-right font-bold ${item.deficit > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {item.deficit > 0 ? `${item.deficit.toFixed(0)} kg` : 'OK'}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        {item.deficit > 0 && (
                                            <Button 
                                                onClick={() => setSelectedItemForTransfer(item)}
                                                variant="secondary"
                                                className={`text-[10px] py-1 px-2 ${hasOsipStock ? 'bg-blue-50 text-blue-700 border-blue-200' : 'opacity-50 grayscale'}`}
                                                disabled={!hasOsipStock}
                                                leftIcon={<TruckIcon className="h-3 w-3"/>}
                                            >
                                                Zasugeruj transfer
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                )}
            </div>
            
            <QuantitySelectionModal 
                isOpen={!!selectedItemForTransfer} 
                onClose={() => setSelectedItemForTransfer(null)} 
                onConfirm={handleConfirmTransferQty}
                item={selectedItemForTransfer}
            />
        </div>
    );
};

export default RawMaterialDemandPage;
