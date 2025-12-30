
import React, { useState, useMemo } from 'react';
import { useRecipeAdjustmentContext } from './contexts/RecipeAdjustmentContext';
import { useAppContext } from './contexts/AppContext';
import { useProductionContext } from './contexts/ProductionContext';
import { View, ProductionRun, PsdTask, RawMaterialLogEntry } from '../types';
import Button from './Button';
import Input from './Input';
import SearchableSelect from './SearchableSelect';
import Alert from './Alert';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import BeakerIcon from './icons/BeakerIcon';
import { ADJUSTMENT_REASONS, VIRTUAL_LOCATION_ARCHIVED } from '../constants';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import Select from './Select';
import { getBlockInfo } from '../src/utils';

interface Material {
    id: number;
    productName: string;
    quantityKg: string;
}

const CreateAdjustmentOrderPage: React.FC = () => {
    const { 
        productionRunsList, 
        psdTasks, 
        handleSetView, 
        viewParams,
        rawMaterialsLogList 
    } = useAppContext();
    const { handleAddAdjustmentOrder } = useRecipeAdjustmentContext();

    const [selectedRunId, setSelectedRunId] = useState<string>(viewParams?.productionRunId || '');
    const [materials, setMaterials] = useState<Material[]>([{ id: Date.now(), productName: '', quantityKg: '' }]);
    const [reason, setReason] = useState<string>('');
    const [errors, setErrors] = useState<{ form?: string; run?: string; reason?: string; items?: Record<number, { productName?: string, quantityKg?: string }> }>({});

    const activeRuns = useMemo(() => {
        const agro = (productionRunsList || []).filter((r: ProductionRun) => r.status === 'ongoing').map((r: ProductionRun) => ({ value: r.id, label: `AGRO: ${r.recipeName} (${r.id})`}));
        const psd = (psdTasks || []).filter((t: PsdTask) => t.status === 'ongoing').map((t: PsdTask) => ({ value: t.id, label: `PSD: ${t.recipeName} (${t.id})`}));
        return [{value: '', label: 'Wybierz aktywne zlecenie...'}, ...agro, ...psd];
    }, [productionRunsList, psdTasks]);
    
    const selectedRun = useMemo(() => {
        if (!selectedRunId) return null;
        const allRuns: (ProductionRun | PsdTask)[] = [...(productionRunsList || []), ...(psdTasks || [])];
        return allRuns.find(r => r.id === selectedRunId);
    }, [selectedRunId, productionRunsList, psdTasks]);
    
    // Budowanie listy opcji surowców na podstawie FIZYCZNYCH stanów i lokalizacji palet
    const rawMaterialOptions = useMemo(() => {
        const uniqueMaterials = new Set<string>();
        const stockMap = new Map<string, number>();
        const physicalStationMap = new Map<string, string>(); 

        (rawMaterialsLogList || []).forEach(p => {
            if (p.currentLocation && p.currentLocation !== VIRTUAL_LOCATION_ARCHIVED && p.palletData.currentWeight > 0.1) {
                const name = p.palletData.nazwa;
                uniqueMaterials.add(name);
                stockMap.set(name, (stockMap.get(name) || 0) + p.palletData.currentWeight);
                
                const loc = p.currentLocation.toUpperCase();
                if (loc.startsWith('BB') || loc.startsWith('MZ')) {
                    physicalStationMap.set(name, loc);
                }
            }
        });

        const options = Array.from(uniqueMaterials).sort().map(name => {
            const stationId = physicalStationMap.get(name);
            const stock = stockMap.get(name) || 0;
            
            return {
                value: name,
                label: stationId 
                    ? `${name} (STACJA: ${stationId}) - ${stock.toFixed(1)} kg` 
                    : `${name} (MAGAZYN) - ${stock.toFixed(1)} kg`
            };
        });

        return [{ value: '', label: 'Szukaj surowca...' }, ...options];
    }, [rawMaterialsLogList]);

    const handleBack = () => {
        if (viewParams?.returnView) {
            handleSetView(viewParams.returnView, viewParams.returnViewParams || {});
        } else {
            handleSetView(View.RecipeAdjustments);
        }
    };
    
    const handleMaterialChange = (id: number, field: keyof Omit<Material, 'id'>, value: string) => {
        setMaterials(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    };

    const handleAddMaterialRow = () => {
        setMaterials(prev => [...prev, { id: Date.now(), productName: '', quantityKg: '' }]);
    };

    const handleRemoveMaterialRow = (id: number) => {
        if (materials.length > 1) {
            setMaterials(prev => prev.filter(m => m.id !== id));
        } else {
            setMaterials([{ id: Date.now(), productName: '', quantityKg: '' }]);
        }
    };

    const handleSubmit = () => {
        setErrors({});
        let hasError = false;
        const newErrors: typeof errors = { items: {} };

        if (!selectedRunId) {
            newErrors.run = "Musisz wybrać aktywne zlecenie produkcyjne.";
            hasError = true;
        }
        if (!reason) {
            newErrors.reason = "Powód korekty jest wymagany.";
            hasError = true;
        }

        const materialsForOrder = materials
            .map((m, index) => {
                const itemErrors: { productName?: string, quantityKg?: string } = {};
                const quantity = parseFloat(m.quantityKg);

                if (m.productName && (isNaN(quantity) || quantity <= 0)) {
                    itemErrors.quantityKg = 'Podaj ilość > 0.';
                    hasError = true;
                }
                if (!m.productName && quantity > 0) {
                    itemErrors.productName = 'Wybierz surowiec.';
                    hasError = true;
                }
                
                if (Object.keys(itemErrors).length > 0) {
                     if (!newErrors.items) newErrors.items = {};
                     newErrors.items[index] = itemErrors;
                }

                return { productName: m.productName, quantityKg: quantity };
            })
            .filter(m => m.productName && m.quantityKg > 0);
        
        if (materialsForOrder.length === 0) {
            newErrors.form = "Dodaj przynajmniej jeden surowiec.";
            hasError = true;
        }
        
        if (hasError) {
            setErrors(newErrors);
            return;
        }

        const orderData = {
            productionRunId: selectedRunId,
            recipeName: (selectedRun as ProductionRun | PsdTask).recipeName,
            batchId: (viewParams?.batchId as string) || undefined,
            materials: materialsForOrder.map(m => ({ ...m, pickedQuantityKg: 0 })),
            reason: reason,
        };
        
        const result = handleAddAdjustmentOrder(orderData);
        if(result.success) {
            handleBack();
        } else {
            setErrors({ form: result.message });
        }
    };

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900/50 h-full">
            <header className="flex items-center gap-3 mb-4 pb-3 border-b dark:border-secondary-700">
                <Button onClick={handleBack} variant="secondary" className="p-2"><ArrowLeftIcon className="h-5 w-5"/></Button>
                <BeakerIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                <div>
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Nowe Zlecenie Korekty</h2>
                </div>
            </header>

            <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md space-y-4 max-w-4xl mx-auto">
                {errors.form && <Alert type="error" message={errors.form} />}

                <SearchableSelect
                    label="Wybierz aktywne zlecenie produkcyjne"
                    id="production-run-select"
                    options={activeRuns}
                    value={selectedRunId}
                    onChange={setSelectedRunId}
                    error={errors.run}
                    disabled={!!viewParams?.productionRunId}
                />

                <Select
                    label="Powód korekty"
                    id="adjustment-reason"
                    options={ADJUSTMENT_REASONS}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    error={errors.reason}
                />
                
                {selectedRun && (
                    <div className="space-y-3 pt-4 border-t dark:border-secondary-700">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Materiały do Dosypki</h3>
                        {materials.map((material, index) => {
                            const itemError = errors.items?.[index];
                            return (
                                <div key={material.id} className="grid grid-cols-[1fr_150px_auto] gap-4 items-end p-3 border dark:border-secondary-700 rounded-lg bg-slate-50 dark:bg-secondary-900/50">
                                    <div>
                                        <SearchableSelect
                                            label={`Surowiec #${index + 1}`}
                                            id={`material-name-${index}`}
                                            options={rawMaterialOptions}
                                            value={material.productName}
                                            onChange={(val) => handleMaterialChange(material.id, 'productName', val)}
                                            error={itemError?.productName}
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            label="Ilość (kg)"
                                            id={`material-qty-${index}`}
                                            type="number"
                                            value={material.quantityKg}
                                            onChange={(e) => handleMaterialChange(material.id, 'quantityKg', e.target.value)}
                                            placeholder="kg"
                                            min="0.01"
                                            step="0.01"
                                            error={itemError?.quantityKg}
                                        />
                                    </div>
                                     <Button onClick={() => handleRemoveMaterialRow(material.id)} variant="secondary" className="p-2 mb-1" title="Usuń pozycję">
                                        <TrashIcon className="h-5 w-5 text-red-500"/>
                                    </Button>
                                </div>
                            )
                        })}
                         <Button onClick={handleAddMaterialRow} variant="secondary" leftIcon={<PlusIcon className="h-4 w-4"/>}>
                            Dodaj kolejny surowiec
                        </Button>
                    </div>
                )}

                <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3">
                    <Button onClick={handleBack} variant="secondary">Anuluj</Button>
                    <Button onClick={handleSubmit} disabled={!selectedRun}>Utwórz Zlecenie</Button>
                </div>
            </div>
        </div>
    );
};

export default CreateAdjustmentOrderPage;
