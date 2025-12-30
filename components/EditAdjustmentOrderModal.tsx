import React, { useState, useEffect, useMemo } from 'react';
import { AdjustmentOrder, AdjustmentMaterial } from '../types';
import { useRecipeAdjustmentContext } from './contexts/RecipeAdjustmentContext';
import { useWarehouseContext } from './contexts/WarehouseContext';
import Button from './Button';
import Input from './Input';
import SearchableSelect from './SearchableSelect';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import Select from './Select';
import { ADJUSTMENT_REASONS } from '../constants';

interface EditAdjustmentOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: AdjustmentOrder | null;
}

const EditAdjustmentOrderModal: React.FC<EditAdjustmentOrderModalProps> = ({ isOpen, onClose, order }) => {
    const { handleUpdateAdjustmentOrder } = useRecipeAdjustmentContext();
    const { allProducts } = useWarehouseContext();

    const [materials, setMaterials] = useState<Omit<AdjustmentMaterial, 'pickedQuantityKg' | 'sourcePalletId'>[]>([]);
    const [reason, setReason] = useState('');
    const [errors, setErrors] = useState<{ form?: string; items?: (Record<string, string> | null)[] }>({});

    useEffect(() => {
        if (isOpen && order) {
            setMaterials(order.materials.map(m => ({ productName: m.productName, quantityKg: m.quantityKg })));
            setReason(order.reason || '');
            setErrors({});
        }
    }, [isOpen, order]);

    const rawMaterialOptions = useMemo(() => 
        (allProducts || []).filter((p: any) => p.type === 'raw_material').map((p: any) => ({ value: p.name, label: p.name })),
    [allProducts]);
    
    const handleMaterialChange = (index: number, field: 'productName' | 'quantityKg', value: any) => {
        const newMaterials = [...materials];
        (newMaterials[index] as any)[field] = value;
        setMaterials(newMaterials);
    };

    const handleAddMaterial = () => {
        setMaterials([...materials, { productName: '', quantityKg: 0 }]);
    };

    const handleRemoveMaterial = (index: number) => {
        if (materials.length > 1) {
            setMaterials(materials.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = () => {
        if (!order) return;
        setErrors({});
        let hasError = false;

        const itemErrors = materials.map(item => {
            const currentItemErrors: Record<string, string> = {};
            if (!item.productName) {
                currentItemErrors.productName = 'Wybierz produkt.';
                hasError = true;
            }
            const weight = Number(item.quantityKg);
            if (isNaN(weight) || weight <= 0) {
                currentItemErrors.quantityKg = 'Waga musi być > 0.';
                hasError = true;
            }
            return Object.keys(currentItemErrors).length > 0 ? currentItemErrors : null;
        });

        if (itemErrors.some(e => e !== null)) {
            setErrors({ items: itemErrors });
            hasError = true;
        }
        
        if (!reason) {
            setErrors(prev => ({ ...prev, form: "Powód korekty jest wymagany."}));
            hasError = true;
        }

        if (hasError) return;

        const updatedMaterials: AdjustmentMaterial[] = materials.map(m => ({
            productName: m.productName,
            quantityKg: Number(m.quantityKg),
            pickedQuantityKg: 0, // Reset picked quantity on edit
        }));

        const result = handleUpdateAdjustmentOrder(order.id, { materials: updatedMaterials, reason });
        if (result.success) {
            onClose();
        } else {
            setErrors({ form: result.message });
        }
    };

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[170]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">Edytuj Zlecenie Korekty</h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {errors.form && <Alert type="error" message={errors.form} />}
                    
                    <p className="text-sm">Edytujesz zlecenie <strong className="font-mono">#{order.id.split('-')[1]}</strong> dla <strong className="font-semibold">{order.recipeName}</strong>.</p>
                    
                     <Select
                        label="Powód korekty"
                        id="edit-adjustment-reason"
                        options={ADJUSTMENT_REASONS}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        error={errors.form && !reason ? "Wybierz powód" : undefined}
                    />

                    <div className="space-y-3 pt-4 border-t dark:border-secondary-700">
                        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-200">Materiały do dodania</h3>
                        {materials.map((material, index) => {
                            const itemError = errors.items?.[index];
                            return (
                                <div key={index} className="grid grid-cols-[1fr_120px_auto] gap-3 items-end p-2 border dark:border-secondary-600 rounded bg-slate-50 dark:bg-secondary-900/50">
                                    <SearchableSelect
                                        label={`Surowiec #${index + 1}`}
                                        id={`edit-material-name-${index}`}
                                        options={rawMaterialOptions}
                                        value={material.productName}
                                        onChange={(val) => handleMaterialChange(index, 'productName', val)}
                                        error={itemError?.productName}
                                    />
                                    <Input
                                        label="Ilość (kg)"
                                        id={`edit-material-qty-${index}`}
                                        type="number"
                                        value={String(material.quantityKg)}
                                        onChange={(e) => handleMaterialChange(index, 'quantityKg', e.target.value)}
                                        min="0.01" step="0.01"
                                        error={itemError?.quantityKg}
                                    />
                                    <Button onClick={() => handleRemoveMaterial(index)} variant="secondary" className="p-2 mb-1" disabled={materials.length <= 1}><TrashIcon className="h-5 w-5 text-red-500"/></Button>
                                </div>
                            )
                        })}
                        <Button onClick={handleAddMaterial} variant="secondary" leftIcon={<PlusIcon className="h-4 w-4"/>}>Dodaj materiał</Button>
                    </div>
                </div>

                <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3 mt-4">
                    <Button onClick={onClose} variant="secondary">Anuluj</Button>
                    <Button onClick={handleSubmit}>Zapisz Zmiany</Button>
                </div>
            </div>
        </div>
    );
};

export default EditAdjustmentOrderModal;