
import React, { useState, useMemo, useEffect } from 'react';
import { DispatchOrder, DispatchOrderItem, User, FinishedGoodItem, MixingTargetCompositionItem } from '../types';
import { useAppContext } from './contexts/AppContext';
import { useMixingContext } from './contexts/MixingContext';
import Button from './Button';
import Input from './Input';
import SearchableSelect from './SearchableSelect';
import Alert from './Alert';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import TruckIcon from './icons/TruckIcon';
import MixerIcon from './icons/MixerIcon';
import CubeIcon from './icons/CubeIcon';
import Select from './Select';
import { MGW01_WAREHOUSE_ID, MGW02_WAREHOUSE_ID, SOURCE_WAREHOUSE_ID_MS01, BUFFER_MS01_ID, OSIP_WAREHOUSE_ID } from '../constants';
import { getBlockInfo } from '../src/utils';

interface NewDispatchOrderFormProps {
  onSave: (orderData: Omit<DispatchOrder, 'id' | 'createdAt' | 'createdBy' | 'status'>) => void;
  onBack: () => void;
  currentUser: User | null;
  orderToEdit?: DispatchOrder | null;
  sourceWarehouse?: 'Centrala' | 'OSIP';
}

// Helper component for mixing composition within a dispatch item
const MixingCompositionEditor: React.FC<{
    composition: Omit<MixingTargetCompositionItem, 'id'>[];
    onChange: (newComp: Omit<MixingTargetCompositionItem, 'id'>[]) => void;
    availableProducts: {value: string, label: string}[];
    stockMap: Record<string, number>;
}> = ({ composition, onChange, availableProducts, stockMap }) => {

    const handleAddIngredient = () => {
        onChange([...composition, { productName: '', quantity: 0 }]);
    };

    const handleRemoveIngredient = (index: number) => {
        if (composition.length > 2) {
             onChange(composition.filter((_, i) => i !== index));
        }
    };

    const handleIngredientChange = (index: number, field: 'productName' | 'quantity', value: any) => {
        const newComp = [...composition];
        newComp[index] = { ...newComp[index], [field]: value };
        onChange(newComp);
    };

    const totalWeight = composition.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    return (
        <div className="mt-2 p-3 bg-white dark:bg-secondary-800 rounded border border-purple-200 dark:border-purple-800">
            <div className="flex justify-between items-center mb-2">
                <h5 className="text-xs font-bold text-purple-700 dark:text-purple-300 uppercase">Składniki Mieszanki</h5>
                <span className="text-xs font-bold text-purple-600">Suma: {totalWeight.toFixed(2)} kg</span>
            </div>
            {composition.map((comp, idx) => {
                const available = stockMap[comp.productName] || 0;
                return (
                    <div key={idx} className="flex flex-col md:flex-row gap-2 mb-2 md:items-end">
                        <div className="flex-grow">
                             <SearchableSelect 
                                label={idx === 0 ? "Produkt" : ""}
                                options={availableProducts}
                                value={comp.productName}
                                onChange={(val) => handleIngredientChange(idx, 'productName', val)}
                                placeholder="Wybierz..."
                                className="text-xs"
                            />
                        </div>
                        <div className="w-full md:w-28">
                             <Input
                                label={idx === 0 ? "W Magazynie" : ""}
                                value={`${available.toFixed(2)} kg`}
                                readOnly
                                disabled
                                className={`text-right py-1.5 ${available > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'}`}
                             />
                        </div>
                        <div className="w-full md:w-24">
                            <Input
                                label={idx === 0 ? "Ilość (kg)" : ""}
                                type="number"
                                value={String(comp.quantity)}
                                onChange={(e) => handleIngredientChange(idx, 'quantity', e.target.value)}
                                min="0.01"
                                step="0.01"
                                className="text-xs py-1.5"
                            />
                        </div>
                        <div className="w-full md:w-auto flex justify-end md:block">
                            <Button onClick={() => handleRemoveIngredient(idx)} variant="secondary" className="p-1.5 mb-[2px]" disabled={composition.length <= 2}>
                                <TrashIcon className="h-4 w-4 text-red-500"/>
                            </Button>
                        </div>
                    </div>
                );
            })}
            <Button onClick={handleAddIngredient} variant="secondary" className="text-xs" leftIcon={<PlusIcon className="h-3 w-3"/>}>
                Dodaj składnik
            </Button>
        </div>
    );
};

type FormItem = {
    id: string;
    productName: string;
    requestedWeightKg: string;
    itemType: 'finished_good' | 'mixing';
    mixingComposition?: Omit<MixingTargetCompositionItem, 'id'>[]; 
};

const NewDispatchOrderForm: React.FC<NewDispatchOrderFormProps> = ({ onSave, onBack, currentUser, orderToEdit, sourceWarehouse = 'Centrala' }) => {
    const { allProducts, finishedGoodsList, dispatchOrders } = useAppContext();
    const { handleAddMixingTask, mixingTasks } = useMixingContext();

    const [recipient, setRecipient] = useState('');
    const [items, setItems] = useState<FormItem[]>([{ id: `new-${Date.now()}`, productName: '', requestedWeightKg: '', itemType: 'finished_good' }]);
    const [errors, setErrors] = useState<{ form?: string, recipient?: string, items?: (Record<string, string> | null)[] }>({});
    
    const isEditing = !!orderToEdit;
    
    useEffect(() => {
        if (isEditing && orderToEdit) {
            setRecipient(orderToEdit.recipient);
            setItems(orderToEdit.items.map(item => ({
                id: item.id,
                productName: item.productName,
                requestedWeightKg: String(item.requestedWeightKg),
                itemType: item.itemType || 'finished_good',
            })));
        }
    }, [isEditing, orderToEdit]);


    const availableStockMap = useMemo(() => {
        const stock: Record<string, number> = {};
        const centralaWarehouses = [MGW01_WAREHOUSE_ID, MGW02_WAREHOUSE_ID, 'MGW01-PRZYJECIA', SOURCE_WAREHOUSE_ID_MS01, BUFFER_MS01_ID];
        
        (finishedGoodsList || []).forEach((p: FinishedGoodItem) => {
            // Filtracja stanów na podstawie wybranego węzła logistycznego
            const isMatch = sourceWarehouse === 'OSIP' 
                ? p.currentLocation === OSIP_WAREHOUSE_ID
                : centralaWarehouses.includes(p.currentLocation || '');

            if (p.status === 'available' && !getBlockInfo(p).isBlocked && isMatch) {
                stock[p.productName] = (stock[p.productName] || 0) + p.quantityKg;
            }
        });

        // Odejmujemy rezerwacje z innych aktywnych zleceń (tylko tych z tego samego magazynu)
        (dispatchOrders || []).forEach((order: DispatchOrder) => {
            if ((order.status === 'planned' || order.status === 'in_fulfillment') && order.id !== orderToEdit?.id && order.sourceWarehouse === sourceWarehouse) {
                order.items.forEach(item => {
                    if (stock[item.productName] && item.itemType === 'finished_good') {
                        stock[item.productName] -= item.requestedWeightKg;
                    }
                });
            }
        });
        
        return stock;
    }, [finishedGoodsList, dispatchOrders, sourceWarehouse, orderToEdit]);

    const productOptions = useMemo(() => {
        // Pokaż tylko te produkty, które mają dostępny stan w wybranym magazynie
        return (allProducts || [])
            .filter((p: any) => (p.type === 'finished_good' || p.type === 'mixing_output') && (availableStockMap[p.name] > 0))
            .map((p: any) => ({ value: p.name, label: p.name }));
    }, [allProducts, availableStockMap]);


    const handleItemChange = (id: string, field: keyof FormItem, value: any) => {
        setItems(prevItems => {
            const existingTasksCount = (mixingTasks || []).length;
            
            return prevItems.map((item, index) => {
                if (item.id === id) {
                    const updated = { ...item, [field]: value };
                    
                    if (field === 'itemType' && value === 'mixing') {
                        if (!item.mixingComposition) {
                            updated.mixingComposition = [{ productName: '', quantity: 0 }, { productName: '', quantity: 0 }];
                        }
                        const previousNewMixingInForm = prevItems.slice(0, index).filter(i => i.itemType === 'mixing').length;
                        const nextNum = existingTasksCount + previousNewMixingInForm + 1;
                        updated.productName = `Paleta Mix ${nextNum}`;
                        updated.requestedWeightKg = '0';
                    }

                    if (field === 'itemType' && value === 'finished_good' && item.itemType === 'mixing') {
                        updated.productName = '';
                    }

                    return updated;
                }
                return item;
            });
        });
    };
    
    const handleCompositionUpdate = (id: string, newComposition: Omit<MixingTargetCompositionItem, 'id'>[]) => {
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                const totalWeight = newComposition.reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
                return { ...item, mixingComposition: newComposition, requestedWeightKg: String(totalWeight) };
            }
            return item;
        }));
    };

    const handleAddItem = () => {
        setItems([...items, { id: `new-${Date.now()}`, productName: '', requestedWeightKg: '', itemType: 'finished_good' }]);
    };

    const handleRemoveItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter((item) => item.id !== id));
        }
    };

    const validateAndSave = () => {
        const newErrors: { form?: string, recipient?: string, items?: (Record<string, string> | null)[] } = {};
        let hasError = false;

        if (!recipient.trim()) {
            newErrors.recipient = 'Odbiorca jest wymagany.';
            hasError = true;
        }

        const itemErrors = items.map(item => {
            const currentItemErrors: Record<string, string> = {};
            if (!item.productName) {
                currentItemErrors.productName = 'Wybierz produkt.';
                hasError = true;
            }
            const weight = parseFloat(item.requestedWeightKg);
            if (isNaN(weight) || weight <= 0) {
                currentItemErrors.requestedWeightKg = 'Waga musi być > 0.';
                hasError = true;
            }
            
            if (item.itemType === 'finished_good') {
                const available = availableStockMap[item.productName] || 0;
                if (weight > available) {
                     currentItemErrors.requestedWeightKg = `Max. ${available.toFixed(2)} kg.`;
                     hasError = true;
                }
            } else if (item.mixingComposition) {
                const invalidComp = item.mixingComposition.some(c => !c.productName || Number(c.quantity) <= 0);
                if (invalidComp) {
                    currentItemErrors.composition = 'Uzupełnij składniki mieszanki.';
                    hasError = true;
                }
            }

            return Object.keys(currentItemErrors).length > 0 ? currentItemErrors : null;
        });

        if (itemErrors.some(e => e !== null)) {
            newErrors.items = itemErrors;
        }
        
        if (hasError) {
            setErrors(newErrors);
            return;
        }

        const processedItems = items.map(item => {
             const baseItem = {
                id: item.id.startsWith('new-') ? `item-dis-${Date.now()}-${Math.random()}` : item.id,
                productName: item.productName,
                itemType: item.itemType,
                requestedWeightKg: parseFloat(item.requestedWeightKg),
                fulfilledWeightKg: 0,
                fulfilledPallets: [],
                linkedMixingTaskId: undefined as string | undefined
            };

            if (item.itemType === 'mixing' && item.mixingComposition) {
                 const taskData = {
                    name: `${recipient} - ${item.productName}`,
                    targetComposition: item.mixingComposition.map(c => ({...c, id: `comp-${Date.now()}-${Math.random()}`, quantity: Number(c.quantity)}))
                };
                const result = handleAddMixingTask(taskData);
                if (result.success && result.newTask) {
                    baseItem.linkedMixingTaskId = result.newTask.id;
                }
            }
            return baseItem;
        });

        onSave({ recipient, items: processedItems } as any);
    };

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900/50">
            <header className="flex items-center gap-3 mb-4 pb-3 border-b dark:border-secondary-700">
                <Button onClick={onBack} variant="secondary" className="p-2"><ArrowLeftIcon className="h-5 w-5"/></Button>
                <TruckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                <div>
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">
                        {isEditing ? 'Edytuj' : 'Nowe'} Zlecenie Wydania - {sourceWarehouse}
                    </h2>
                </div>
            </header>

            <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md space-y-4">
                <Alert 
                    type="info" 
                    message={`Źródło: ${sourceWarehouse}`} 
                    details={`Formularz wyświetla stany magazynowe dostępne wyłącznie w magazynie ${sourceWarehouse === 'OSIP' ? 'OSiP' : 'Centralnym'}.`}
                />

                <Input 
                    label="Odbiorca / Nr zlecenia klienta"
                    id="recipient"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    required
                    autoFocus
                    error={errors.recipient}
                />

                <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Pozycje Zlecenia</h3>
                    {items.map((item, index) => {
                        const available = availableStockMap[item.productName] ?? 0;
                        const itemError = errors.items?.[index];
                        return (
                            <div key={item.id} className="p-3 border dark:border-secondary-700 rounded-lg bg-slate-50 dark:bg-secondary-900/50 space-y-2">
                                <div className="flex justify-end mb-1">
                                     <div className="flex bg-gray-200 dark:bg-secondary-700 rounded p-1 text-xs">
                                        <button 
                                            type="button"
                                            onClick={() => handleItemChange(item.id, 'itemType', 'finished_good')}
                                            className={`px-2 py-1 rounded flex items-center gap-1 ${item.itemType === 'finished_good' ? 'bg-white dark:bg-secondary-600 shadow text-primary-700 dark:text-primary-300' : 'text-gray-500'}`}
                                        >
                                           <CubeIcon className="h-3 w-3"/> Z Magazynu
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => handleItemChange(item.id, 'itemType', 'mixing')}
                                            className={`px-2 py-1 rounded flex items-center gap-1 ${item.itemType === 'mixing' ? 'bg-white dark:bg-secondary-600 shadow text-purple-700 dark:text-purple-300' : 'text-gray-500'}`}
                                        >
                                           <MixerIcon className="h-3 w-3"/> Do Zmiksowania
                                        </button>
                                     </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-[1.5fr_0.8fr_0.8fr_auto] gap-3 items-end">
                                    <div>
                                        {item.itemType === 'finished_good' ? (
                                            <SearchableSelect 
                                                label={`Produkt #${index + 1}`}
                                                id={`item-product-${item.id}`}
                                                options={productOptions}
                                                value={item.productName}
                                                onChange={(val) => handleItemChange(item.id, 'productName', val)}
                                                placeholder="Wyszukaj produkt w stanie..."
                                                error={itemError?.productName}
                                            />
                                        ) : (
                                            <Input
                                                label={`Produkt #${index + 1} (Mieszanka)`}
                                                id={`item-product-${item.id}`}
                                                value={item.productName}
                                                onChange={(e) => handleItemChange(item.id, 'productName', e.target.value)}
                                                error={itemError?.productName}
                                                placeholder="Nazwa mieszanki"
                                            />
                                        )}
                                    </div>
                                    
                                    <div>
                                        <Input
                                            label="W Magazynie"
                                            value={item.itemType === 'finished_good' ? `${available.toFixed(2)} kg` : '---'}
                                            readOnly
                                            disabled
                                            className={`text-right ${available > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-500'}`}
                                        />
                                    </div>

                                    <div>
                                        <Input 
                                            label="Waga (kg)"
                                            id={`item-weight-${item.id}`}
                                            type="number"
                                            value={item.requestedWeightKg}
                                            onChange={(e) => handleItemChange(item.id, 'requestedWeightKg', e.target.value)}
                                            min="0.01"
                                            step="0.01"
                                            error={itemError?.requestedWeightKg}
                                            disabled={item.itemType === 'mixing'}
                                            className={item.itemType === 'mixing' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
                                        />
                                    </div>
                                    <Button onClick={() => handleRemoveItem(item.id)} variant="secondary" className="p-2 mb-1" disabled={items.length <= 1}>
                                        <TrashIcon className="h-5 w-5 text-red-500"/>
                                    </Button>
                                </div>
                                
                                {item.itemType === 'mixing' && item.mixingComposition && (
                                    <>
                                        {itemError?.composition && <p className="text-xs text-red-500 font-bold">{itemError.composition}</p>}
                                        <MixingCompositionEditor 
                                            composition={item.mixingComposition} 
                                            onChange={(newComp) => handleCompositionUpdate(item.id, newComp)}
                                            availableProducts={productOptions}
                                            stockMap={availableStockMap}
                                        />
                                    </>
                                )}
                            </div>
                        )
                    })}
                    <Button onClick={handleAddItem} variant="secondary" leftIcon={<PlusIcon className="h-4 w-4"/>}>Dodaj pozycję</Button>
                </div>
                
                <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3">
                    <Button onClick={onBack} variant="secondary">Anuluj</Button>
                    <Button onClick={validateAndSave}>{isEditing ? 'Zapisz Zmiany' : 'Utwórz Zlecenie'}</Button>
                </div>
            </div>
        </div>
    );
};

export default NewDispatchOrderForm;
