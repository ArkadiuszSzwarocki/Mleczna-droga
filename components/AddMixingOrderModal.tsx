import React, { useState, useMemo, useEffect } from 'react';
import { MixingTask, MixingTargetCompositionItem } from '../types';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import SearchableSelect from './SearchableSelect';
import XCircleIcon from './icons/XCircleIcon';
import MixerIcon from './icons/MixerIcon';

interface AddMixingOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<MixingTask, 'id' | 'status' | 'createdAt' | 'createdBy' | 'consumedSourcePallets'>) => void;
  taskToEdit?: MixingTask | null;
}

const AddMixingOrderModal: React.FC<AddMixingOrderModalProps> = ({ isOpen, onClose, onSave, taskToEdit }) => {
    const { allProducts } = useAppContext();
    const [recipient, setRecipient] = useState('');
    const [composition, setComposition] = useState<Omit<MixingTargetCompositionItem, 'id'>[]>([{ productName: '', quantity: 0 }]);
    const [errors, setErrors] = useState<{ form?: string[]; recipient?: string; items?: (Record<string, string> | null)[] }>({});
    
    const isEditing = !!taskToEdit;

    useEffect(() => {
        if(isOpen) {
            if (isEditing && taskToEdit) {
                setRecipient(taskToEdit.name);
                // remove 'id' from composition items before setting state
                setComposition(taskToEdit.targetComposition.map(({ id, ...rest }) => rest));
            } else {
                setRecipient('');
                // Start with two ingredients for a new order.
                setComposition([
                    { productName: '', quantity: 0 },
                    { productName: '', quantity: 0 }
                ]);
            }
            setErrors({});
        }
    }, [isOpen, taskToEdit, isEditing]);

    const availableProducts = useMemo(() => 
        (allProducts || [])
            .filter(p => p.type === 'finished_good')
            .map(p => ({ value: p.name, label: p.name })),
    [allProducts]);

    const totalWeight = useMemo(() => composition.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0), [composition]);

    const handleCompositionChange = (index: number, field: 'productName' | 'quantity', value: any) => {
        const newComposition = [...composition];
        const updatedItem = { ...newComposition[index], [field]: value };
        newComposition[index] = updatedItem;
        setComposition(newComposition);
    };

    const handleAddIngredient = () => {
        setComposition([...composition, { productName: '', quantity: 0 }]);
    };

    const handleRemoveIngredient = (index: number) => {
        if(composition.length > 2) {
            setComposition(composition.filter((_, i) => i !== index));
        }
    };

    const validate = (): boolean => {
        const newErrors: { form: string[], recipient?: string; items: (Record<string, string> | null)[] } = { form: [], items: [] };
        let hasErrors = false;
        
        if (composition.length < 2) {
            newErrors.form.push('Zlecenie miksowania musi zawierać co najmniej dwa składniki.');
            hasErrors = true;
        }

        if (!recipient.trim()) {
            newErrors.recipient = 'Odbiorca lub nr zlecenia jest wymagany.';
            hasErrors = true;
        }

        const itemErrors = composition.map(item => {
            const currentItemErrors: Record<string, string> = {};
            if (!item.productName) {
                currentItemErrors.productName = 'Wybierz produkt.';
                hasErrors = true;
            }

            if (!item.quantity || Number(item.quantity) <= 0) {
                currentItemErrors.quantity = 'Ilość musi być > 0.';
                hasErrors = true;
            }
            return Object.keys(currentItemErrors).length > 0 ? currentItemErrors : null;
        });
        
        if (itemErrors.some(e => e !== null)) {
            newErrors.items = itemErrors;
        }
        
        if (totalWeight > 1000) {
            newErrors.form.push(`Całkowita waga palety (${totalWeight.toFixed(2)} kg) nie może przekroczyć 1000 kg.`);
            hasErrors = true;
        }

        setErrors(newErrors);
        return !hasErrors;
    };

    const handleSubmit = () => {
        if (!validate()) {
            return;
        }
        
        const taskData = {
            name: recipient,
            targetComposition: composition.map(item => ({...item, id: `comp-${Date.now()}-${Math.random()}`, quantity: Number(item.quantity)}))
        };
        onSave(taskData);
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <MixerIcon className="h-6 w-6"/> {isEditing ? 'Edytuj' : 'Nowe'} Zlecenie Miksowania
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {errors.form && errors.form.length > 0 && <Alert type="error" message="Popraw błędy w formularzu" details={errors.form.join('<br>')} />}

                    <Input 
                        label="Nazwa zlecenia / Odbiorca"
                        id="recipient-name"
                        value={recipient}
                        onChange={e => setRecipient(e.target.value)}
                        required
                        autoFocus
                        error={errors.recipient}
                    />

                    <div className="p-3 border dark:border-secondary-700 rounded-lg bg-slate-100/50 dark:bg-secondary-900/50 space-y-3">
                        <h4 className="text-md font-semibold text-gray-700 dark:text-gray-200">Kompozycja Mieszanki (Cel: {totalWeight.toFixed(2)} kg / 1000 kg)</h4>
                        {composition.map((item, index) => (
                            <div key={index} className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
                                <SearchableSelect
                                    label={`Składnik #${index + 1}`}
                                    id={`comp-${index}-product`}
                                    options={availableProducts}
                                    value={item.productName}
                                    onChange={(value) => handleCompositionChange(index, 'productName', value)}
                                    placeholder="Wybierz produkt..."
                                    error={errors.items?.[index]?.productName}
                                />
                                <Input
                                    label="Ilość (kg)"
                                    id={`comp-${index}-qty`}
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={item.quantity || ''}
                                    onChange={(e) => handleCompositionChange(index, 'quantity', e.target.value)}
                                    error={errors.items?.[index]?.quantity}
                                />
                                <Button onClick={() => handleRemoveIngredient(index)} variant="secondary" className="p-2 mb-1" disabled={composition.length <= 2}><TrashIcon className="h-5 w-5 text-red-500"/></Button>
                            </div>
                        ))}
                        <Button onClick={handleAddIngredient} variant="secondary" className="text-xs px-2.5 py-1.5" disabled={totalWeight >= 1000} leftIcon={<PlusIcon className="h-4 w-4"/>}>
                            Dodaj Składnik
                        </Button>
                    </div>
                </div>

                <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3 mt-4">
                    <Button onClick={onClose} variant="secondary">Anuluj</Button>
                    <Button onClick={handleSubmit} variant="primary">{isEditing ? 'Zapisz Zmiany' : 'Utwórz Zlecenie'}</Button>
                </div>
            </div>
        </div>
    );
};

export default AddMixingOrderModal;