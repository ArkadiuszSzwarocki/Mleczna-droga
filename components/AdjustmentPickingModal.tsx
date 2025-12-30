
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AdjustmentOrder, RawMaterialLogEntry, FinishedGoodItem, AdjustmentMaterial, UserRole, ProductionRun } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import { useRecipeAdjustmentContext } from './contexts/RecipeAdjustmentContext';
import { useAppContext } from './contexts/AppContext';
import { useAuth } from './contexts/AuthContext';
import QrCodeIcon from './icons/QrCodeIcon';
import { getBlockInfo } from '../src/utils';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import PlayIcon from './icons/PlayIcon';

interface AdjustmentPickingModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: AdjustmentOrder | null;
}

type MaterialState = {
    productName: string;
    quantityKg: number;
    pickedQuantityKg: number;
    inputValue: string;
    sourcePalletId?: string;
    sourcePalletConfirmed: boolean;
    locationType: 'station' | 'warehouse';
    stationId?: string;
    isProcessing: boolean;
};

const AdjustmentPickingModal: React.FC<AdjustmentPickingModalProps> = ({ isOpen, onClose, order }) => {
    const { handleUpdateAdjustmentOrder } = useRecipeAdjustmentContext();
    const { findPalletByUniversalId, stationRawMaterialMapping, showToast, handleManualAgroConsumption, productionRunsList } = useAppContext();
    const { currentUser } = useAuth();
    const [materials, setMaterials] = useState<MaterialState[]>([]);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [rowErrors, setRowErrors] = useState<Record<number, string | null>>({});
    
    const quantityInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const isProcessOperator = currentUser?.role === 'operator_procesu' || currentUser?.role === 'admin' || currentUser?.role === 'boss';
    const isProductionOperator = currentUser?.role === 'operator_agro' || currentUser?.role === 'magazynier' || currentUser?.role === 'admin' || currentUser?.role === 'boss';

    const getMaterialSourceInfo = useCallback((productName: string) => {
        if (!stationRawMaterialMapping) return { type: 'warehouse' as const };
        
        const stationId = Object.keys(stationRawMaterialMapping).find(
            key => stationRawMaterialMapping[key] === productName
        );
        
        if (stationId) {
            return { type: 'station' as const, stationId };
        }
        return { type: 'warehouse' as const };
    }, [stationRawMaterialMapping]);

    useEffect(() => {
        if (isOpen && order && order.materials) {
            const initialMaterials = order.materials.map(m => {
                const source = getMaterialSourceInfo(m.productName);
                return {
                    productName: m.productName,
                    quantityKg: m.quantityKg,
                    pickedQuantityKg: m.pickedQuantityKg || 0,
                    inputValue: '',
                    sourcePalletId: m.sourcePalletId,
                    sourcePalletConfirmed: !!m.sourcePalletId,
                    locationType: source.type,
                    stationId: source.stationId,
                    isProcessing: false,
                };
            });
            setMaterials(initialMaterials);
            setRowErrors({});
            setFeedback(null);
        }
    }, [isOpen, order, getMaterialSourceInfo]);
    
    const updateMaterialState = (index: number, updates: Partial<MaterialState>) => {
        setMaterials(prev => prev.map((m, i) => i === index ? { ...m, ...updates } : m));
    };

    const handlePalletIdValidation = (index: number) => {
        const material = materials[index];
        if (!material.sourcePalletId) return;

        const pallet = findPalletByUniversalId(material.sourcePalletId);
        if (!pallet || pallet.type !== 'raw') {
            setRowErrors(prev => ({ ...prev, [index]: `Nie znaleziono palety: ${material.sourcePalletId}` }));
            updateMaterialState(index, { sourcePalletConfirmed: false });
        } else {
            const rawItem = pallet.item as RawMaterialLogEntry;
            const { isBlocked, reason } = getBlockInfo(rawItem);
            if (isBlocked) {
                setRowErrors(prev => ({ ...prev, [index]: `Zablokowana: ${reason}` }));
                updateMaterialState(index, { sourcePalletConfirmed: false });
            } else if (rawItem.palletData.nazwa !== material.productName) {
                setRowErrors(prev => ({ ...prev, [index]: `ZŁY PRODUKT: ${rawItem.palletData.nazwa.toUpperCase()}`}));
                updateMaterialState(index, { sourcePalletConfirmed: false });
            } else {
                setRowErrors(prev => ({ ...prev, [index]: null }));
                updateMaterialState(index, { sourcePalletConfirmed: true });
                quantityInputRefs.current[index]?.focus();
            }
        }
    };
    
    const getTargetBatchId = useCallback(() => {
        if (!order) return 'default';
        if (order.batchId) return order.batchId;
        
        const run = productionRunsList.find((r: ProductionRun) => r.id === order.productionRunId);
        const activeBatch = run?.batches?.find((b: any) => b.status === 'ongoing');
        return activeBatch?.id || 'default';
    }, [order, productionRunsList]);

    const handleAutoDraw = async (index: number) => {
        const material = materials[index];
        if (!order || material.locationType !== 'station') return;

        updateMaterialState(index, { isProcessing: true });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const amountToTake = material.quantityKg - material.pickedQuantityKg;
        const batchId = getTargetBatchId();

        const res = await handleManualAgroConsumption(order.productionRunId, batchId, material.productName, amountToTake);
        
        if (res.type === 'success') {
            const newTotal = material.pickedQuantityKg + amountToTake;
            savePickedQuantityToContext(index, newTotal);
            showToast(`[AUTO] Stacja ${material.stationId}: naważono ${amountToTake} kg ${material.productName}`, 'success');
        } else {
            setRowErrors(prev => ({ ...prev, [index]: res.message }));
        }
        
        updateMaterialState(index, { isProcessing: false });
    };

    const savePickedQuantityToContext = (index: number, newTotalPicked: number) => {
        if (!order) return;
        const newMaterials = [...materials];
        newMaterials[index].pickedQuantityKg = newTotalPicked;
        newMaterials[index].inputValue = '';
        setMaterials(newMaterials);

        const materialsToSave: AdjustmentMaterial[] = newMaterials.map(m => ({
            productName: m.productName,
            quantityKg: m.quantityKg,
            pickedQuantityKg: m.pickedQuantityKg,
            sourcePalletId: m.sourcePalletId
        }));
        
        handleUpdateAdjustmentOrder(order.id, { materials: materialsToSave });
    };

    const handleApproveManual = async (index: number) => {
        const material = materials[index];
        if (!order) return;

        const val = parseFloat(material.inputValue);
        if (isNaN(val) || val <= 0) {
            setRowErrors(prev => ({ ...prev, [index]: 'Wprowadź wagę > 0' }));
            return;
        }

        const batchId = getTargetBatchId();
        
        // KSIĘGOWANIE ZUŻYCIA FIZYCZNEGO
        // Jeśli skanowaliśmy paletę ze stacji, handleManualAgroConsumption zadziała automatycznie.
        // Jeśli z magazynu, musimy upewnić się że logiczna funkcja to obsłuży.
        const res = await handleManualAgroConsumption(order.productionRunId, batchId, material.productName, val);

        if (res.type === 'success') {
            savePickedQuantityToContext(index, material.pickedQuantityKg + val);
            showToast(`[MANUAL] Odważono ${val} kg do wiadra`, 'info');
            setRowErrors(prev => ({ ...prev, [index]: null }));
        } else {
            setRowErrors(prev => ({ ...prev, [index]: res.message }));
        }
    };

    const handleCompletePicking = () => {
        if (!order) return;
        const incomplete = materials.some(m => Math.abs(m.pickedQuantityKg - m.quantityKg) > m.quantityKg * 0.051);
        if (incomplete) {
            setFeedback({ type: 'error', message: 'Wszystkie pozycje muszą zostać odważone (tolerancja 5%).' });
            return;
        }
        handleUpdateAdjustmentOrder(order.id, { status: 'processing' });
        onClose();
    };

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[160]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="px-6 py-4 border-b dark:border-secondary-700 flex justify-between items-center bg-slate-50 dark:bg-secondary-900/50">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-tighter text-primary-700 dark:text-primary-300">Realizacja Dosypki #{order.id.split('-')[1]}</h2>
                        <p className="text-xs font-bold text-gray-500 uppercase">
                            Tryb: <span className="text-primary-600 font-black">{isProcessOperator ? 'Procesowy' : 'Produkcyjny'}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><XCircleIcon className="h-7 w-7"/></button>
                </header>

                <div className="flex-grow overflow-y-auto p-6 space-y-4 scrollbar-hide">
                    {feedback && <Alert type={feedback.type} message={feedback.message} />}
                    
                    {materials.map((m, idx) => {
                        const isDone = m.pickedQuantityKg >= m.quantityKg * 0.949;
                        return (
                            <div key={idx} className={`p-4 rounded-xl border-2 transition-all ${isDone ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-slate-200 dark:border-secondary-700 bg-white dark:bg-secondary-800'}`}>
                                <div className="flex flex-col md:flex-row justify-between gap-4">
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-black text-lg uppercase tracking-tight">{m.productName}</h3>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${m.locationType === 'station' ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>
                                                {m.locationType === 'station' ? `Stacja ${m.stationId}` : 'Magazyn'}
                                            </span>
                                        </div>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-sm font-bold text-gray-500 uppercase">Wymagane:</span>
                                            <span className="text-2xl font-black text-primary-600">{m.quantityKg.toFixed(2)} kg</span>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-100 dark:bg-secondary-900 p-3 rounded-lg border-2 border-slate-200 dark:border-secondary-700 flex flex-col items-center justify-center min-w-[140px]">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Odważono</span>
                                        <span className={`text-2xl font-black font-mono leading-none ${isDone ? 'text-green-600' : 'text-primary-600'}`}>
                                            {m.pickedQuantityKg.toFixed(3)}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400">KG / {m.quantityKg} KG</span>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t dark:border-secondary-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* PANEL OPERATORA PROCESU (AUTO) */}
                                    {m.locationType === 'station' && (
                                        <div className={`p-3 rounded-lg border-2 ${isProcessOperator ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-gray-200 opacity-50'}`}>
                                            <p className="text-[10px] font-black text-orange-700 uppercase mb-2">Operator Procesu (Automatyka)</p>
                                            <Button 
                                                onClick={() => handleAutoDraw(idx)} 
                                                disabled={!isProcessOperator || isDone || m.isProcessing}
                                                className="w-full bg-orange-600 hover:bg-orange-700 font-black h-12"
                                                leftIcon={m.isProcessing ? <ArrowPathIcon className="h-5 w-5 animate-spin"/> : <ArrowPathIcon className="h-5 w-5"/>}
                                            >
                                                {m.isProcessing ? 'Naważanie...' : 'Naważ ze stacji (Auto)'}
                                            </Button>
                                        </div>
                                    )}

                                    {/* PANEL OPERATORA PRODUKCJI (MANUAL) */}
                                    <div className={`p-3 rounded-lg border-2 ${isProductionOperator ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10' : 'border-gray-200 opacity-50'} ${m.locationType !== 'station' ? 'md:col-span-2' : ''}`}>
                                        <p className="text-[10px] font-black text-blue-700 uppercase mb-2">Operator Produkcji (Do wiadra)</p>
                                        <div className="flex flex-col sm:flex-row gap-2 items-end">
                                            <div className="flex-grow w-full">
                                                <Input 
                                                    label="Zeskanuj paletę" 
                                                    value={m.sourcePalletId || ''} 
                                                    onChange={e => updateMaterialState(idx, { sourcePalletId: e.target.value, sourcePalletConfirmed: false })}
                                                    onBlur={() => handlePalletIdValidation(idx)}
                                                    icon={<QrCodeIcon className="h-5 w-5 text-gray-400"/>}
                                                    disabled={!isProductionOperator || m.sourcePalletConfirmed}
                                                    className="font-mono text-xs"
                                                    placeholder="Skanuj..."
                                                />
                                            </div>
                                            <div className="w-full sm:w-32">
                                                <Input 
                                                    ref={el => { quantityInputRefs.current[idx] = el; }}
                                                    label="Waga (kg)" 
                                                    type="number" 
                                                    value={m.inputValue} 
                                                    onChange={e => updateMaterialState(idx, { inputValue: e.target.value })}
                                                    disabled={!isProductionOperator || !m.sourcePalletConfirmed || isDone}
                                                    placeholder="0.000"
                                                    className="font-black"
                                                />
                                            </div>
                                            <Button onClick={() => handleApproveManual(idx)} disabled={!isProductionOperator || !m.sourcePalletConfirmed || !m.inputValue || isDone} className="h-10 px-4 font-bold bg-blue-600">Zatwierdź</Button>
                                        </div>
                                    </div>
                                </div>
                                {rowErrors[idx] && <p className="mt-2 text-xs text-red-500 font-black uppercase tracking-tighter">{rowErrors[idx]}</p>}
                            </div>
                        );
                    })}
                </div>

                <footer className="px-6 py-4 border-t dark:border-secondary-700 bg-slate-50 dark:bg-secondary-900/50 flex justify-end gap-3">
                    <Button onClick={onClose} variant="secondary">Zamknij</Button>
                    <Button onClick={handleCompletePicking} disabled={!materials.every(m => m.pickedQuantityKg > 0)} className="px-10 py-3 font-black uppercase tracking-tighter shadow-xl">
                        Zakończ Kompletację
                    </Button>
                </footer>
            </div>
        </div>
    );
};

export default AdjustmentPickingModal;
