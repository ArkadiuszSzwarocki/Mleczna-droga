
import React, { useState, useMemo, useEffect } from 'react';
import { RawMaterialLogEntry, FinishedGoodItem, PackagingMaterialLogEntry, InternalTransferItem } from '../types';
import { useAppContext } from './contexts/AppContext';
import { useLogisticsContext } from './contexts/LogisticsContext';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import SearchableSelect from './SearchableSelect';
import TruckIcon from './icons/TruckIcon';
import ArrowLeftRightIcon from './icons/ArrowLeftRightIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import { 
    OSIP_WAREHOUSE_ID, 
    SOURCE_WAREHOUSE_ID_MS01, 
    MGW01_WAREHOUSE_ID, 
    MGW02_WAREHOUSE_ID, 
    BUFFER_MS01_ID 
} from '../constants';
import { getBlockInfo } from '../src/utils';

interface CreateInternalTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TransferFormItem {
    id: string;
    productName: string;
    requestedQty: string;
    unit: string;
}

const CreateInternalTransferModal: React.FC<CreateInternalTransferModalProps> = ({ isOpen, onClose }) => {
    const { rawMaterialsLogList, finishedGoodsList, packagingMaterialsLog, allProducts } = useAppContext();
    const { handleCreateInternalTransfer } = useLogisticsContext();
    
    const [direction, setDirection] = useState<'OSIP_TO_MAIN' | 'MAIN_TO_OSIP'>('MAIN_TO_OSIP');
    const [items, setItems] = useState<TransferFormItem[]>([{ id: `item-${Date.now()}`, productName: '', requestedQty: '', unit: 'kg' }]);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setItems([{ id: `item-${Date.now()}`, productName: '', requestedQty: '', unit: 'kg' }]);
            setFeedback(null);
            setDirection('MAIN_TO_OSIP');
        }
    }, [isOpen]);

    const sourceWarehouses = useMemo(() => {
        if (direction === 'OSIP_TO_MAIN') {
            return [OSIP_WAREHOUSE_ID];
        } else {
            return [
                SOURCE_WAREHOUSE_ID_MS01, BUFFER_MS01_ID, MGW01_WAREHOUSE_ID, MGW02_WAREHOUSE_ID, 
                'MDM01', 'MOP01', 'PSD', 'BF_MP01', 'MP01', 'KO01', 'MIX01'
            ];
        }
    }, [direction]);

    const availableStockMap = useMemo(() => {
        const stock: Record<string, { qty: number, unit: string }> = {};
        
        const process = (list: any[], isRaw: boolean, isPkg: boolean) => {
            (list || []).forEach(p => {
                if (p.currentLocation && sourceWarehouses.includes(p.currentLocation)) {
                    const { isBlocked } = getBlockInfo(p);
                    if (!isBlocked) {
                        const name = isRaw ? p.palletData.nazwa : p.productName;
                        const weight = isRaw ? p.palletData.currentWeight : (isPkg ? p.currentWeight : p.quantityKg);
                        
                        let unit = 'kg';
                        if (isPkg && (p.productName.toLowerCase().includes('worek') && !p.productName.toLowerCase().includes('folia'))) {
                            unit = 'szt.';
                        }

                        if (!stock[name]) stock[name] = { qty: 0, unit };
                        stock[name].qty += weight;
                    }
                }
            });
        };

        process(rawMaterialsLogList, true, false);
        process(finishedGoodsList, false, false);
        process(packagingMaterialsLog, false, true);

        return stock;
    }, [rawMaterialsLogList, finishedGoodsList, packagingMaterialsLog, sourceWarehouses]);

    const productOptions = useMemo(() => {
        return (Object.entries(availableStockMap) as [string, { qty: number; unit: string }][])
            .filter(([_, data]) => data.qty > 0)
            .map(([name, _]) => ({
                value: name,
                label: name
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [availableStockMap]);

    const handleAddItem = () => {
        setItems(prev => [...prev, { id: `item-${Date.now()}-${prev.length}`, productName: '', requestedQty: '', unit: 'kg' }]);
    };

    const handleRemoveItem = (id: string) => {
        if (items.length > 1) {
            setItems(prev => prev.filter(i => i.id !== id));
        }
    };

    const handleItemChange = (id: string, field: keyof TransferFormItem, value: string) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const updated = { ...item, [field]: value };
                if (field === 'productName') {
                    updated.unit = availableStockMap[value]?.unit || 'kg';
                }
                return updated;
            }
            return item;
        }));
    };

    const handleSubmit = () => {
        setFeedback(null);
        const validItems = items.filter(i => i.productName && parseFloat(i.requestedQty) > 0);
        if (validItems.length === 0) {
            setFeedback({ type: 'error', message: 'Wprowadź co najmniej jedną pozycję.' });
            return;
        }

        const itemsToRequest: InternalTransferItem[] = validItems.map(i => ({
            productName: i.productName,
            requestedQty: parseFloat(i.requestedQty),
            unit: i.unit
        }));

        let source = direction === 'MAIN_TO_OSIP' ? 'CENTRALA' : OSIP_WAREHOUSE_ID;
        let dest = direction === 'MAIN_TO_OSIP' ? OSIP_WAREHOUSE_ID : 'CENTRALA';

        const result = handleCreateInternalTransfer(itemsToRequest, source, dest);
        if (result.success) {
            onClose();
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
    };

    if (!isOpen) return null;

    const sourceLabel = direction === 'MAIN_TO_OSIP' ? 'Centrali' : 'OSiP';

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[160]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <TruckIcon className="h-6 w-6"/>
                        Planowanie Transferu Wewnętrznego
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                <div className="flex flex-col gap-4 flex-grow overflow-hidden">
                    <div className="flex bg-slate-100 dark:bg-secondary-900 p-1 rounded-lg shrink-0 w-fit mx-auto mb-2">
                        <button
                            onClick={() => { setDirection('MAIN_TO_OSIP'); }}
                            className={`py-2 px-6 rounded-md text-sm font-bold transition-all flex items-center gap-3 ${
                                direction === 'MAIN_TO_OSIP'
                                    ? 'bg-white dark:bg-secondary-700 text-primary-700 dark:text-primary-300 shadow-md'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <span>Centrala</span>
                            <ArrowLeftRightIcon className="h-4 w-4 opacity-50"/>
                            <span>OSiP</span>
                        </button>
                        <button
                            onClick={() => { setDirection('OSIP_TO_MAIN'); }}
                            className={`py-2 px-6 rounded-md text-sm font-bold transition-all flex items-center gap-3 ${
                                direction === 'OSIP_TO_MAIN'
                                    ? 'bg-white dark:bg-secondary-700 text-primary-700 dark:text-primary-300 shadow-md'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                            }`}
                        >
                            <span>OSiP</span>
                            <ArrowLeftRightIcon className="h-4 w-4 opacity-50"/>
                            <span>Centrala</span>
                        </button>
                    </div>

                    <div className="flex-grow overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                        {feedback && <Alert type={feedback.type} message={feedback.message} />}
                        
                        <div className="space-y-2">
                            <div className="hidden md:grid grid-cols-[1fr_200px_160px_auto] gap-4 px-3 mb-1">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produkt</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Stan w {sourceLabel}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ilość</span>
                                <span className="w-10"></span>
                            </div>

                            {items.map((item, idx) => {
                                const stockData = availableStockMap[item.productName];
                                return (
                                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-[1fr_200px_160px_auto] gap-4 items-center p-3 bg-slate-50 dark:bg-secondary-900/50 rounded-lg border dark:border-secondary-700 animate-fadeIn">
                                        <SearchableSelect
                                            label=""
                                            options={productOptions}
                                            value={item.productName}
                                            onChange={(val) => handleItemChange(item.id, 'productName', val)}
                                            placeholder="Wyszukaj produkt..."
                                            className="!mb-0"
                                        />
                                        <div className={`flex flex-col items-center justify-center h-10 rounded border transition-colors ${item.productName ? 'bg-white dark:bg-secondary-800 border-blue-200 dark:border-blue-900 shadow-sm' : 'bg-transparent border-dashed border-gray-200 dark:border-secondary-700'}`}>
                                            {item.productName ? (
                                                <>
                                                    <span className="text-[10px] font-bold text-gray-400 leading-none mb-1">DOSTĘPNE</span>
                                                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 leading-none">
                                                        {stockData?.qty.toFixed(1) || 0} {stockData?.unit || 'kg'}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-gray-300 italic">Brak wyboru</span>
                                            )}
                                        </div>
                                        <div className="relative">
                                            <Input
                                                label=""
                                                type="number"
                                                value={item.requestedQty}
                                                onChange={(e) => handleItemChange(item.id, 'requestedQty', e.target.value)}
                                                placeholder="0.00"
                                                className="!mb-0 font-bold"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 uppercase">{item.unit}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveItem(item.id)} 
                                            className="p-2 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                                            disabled={items.length <= 1}
                                        >
                                            <TrashIcon className="h-5 w-5"/>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <button 
                            onClick={handleAddItem} 
                            className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-secondary-700 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-primary-500 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all font-medium"
                        >
                            <PlusIcon className="h-5 w-5"/>
                            <span>Dodaj kolejny produkt do listy</span>
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t dark:border-secondary-700 flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 text-[11px] text-gray-500 italic">
                        <InformationCircleIcon className="h-4 w-4 text-blue-500"/>
                        Planowanie nie rezerwuje konkretnych palet. Jednostki zostaną dobrane automatycznie podczas załadunku.
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button onClick={onClose} variant="secondary">Anuluj</Button>
                        <Button onClick={handleSubmit}>Utwórz Plan Transferu</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateInternalTransferModal;
