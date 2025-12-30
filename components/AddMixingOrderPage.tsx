
import React, { useState, useMemo } from 'react';
import { useAppContext } from './contexts/AppContext';
import { useMixingContext } from './contexts/MixingContext';
import { useUIContext } from './contexts/UIContext';
import { MixingTask, MixingTargetCompositionItem, View } from '../types';
import Button from './Button';
import Input from './Input';
import SearchableSelect from './SearchableSelect';
import Alert from './Alert';
import MixerIcon from './icons/MixerIcon';
import ArrowLeftIcon from './icons/ArrowLeftIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';

const AddMixingOrderPage: React.FC = () => {
    const { allProducts } = useAppContext();
    const { handleAddMixingTask } = useMixingContext();
    const { handleSetView, showToast } = useUIContext();

    const [recipient, setRecipient] = useState('');
    const [composition, setComposition] = useState<Omit<MixingTargetCompositionItem, 'id'>[]>([
        { productName: '', quantity: 0 },
        { productName: '', quantity: 0 }
    ]);
    const [errors, setErrors] = useState<{ form?: string[]; recipient?: string; items?: (Record<string, string> | null)[] }>({});

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
        
        const result = handleAddMixingTask(taskData);
        if (result.success) {
            showToast(result.message, 'success');
            handleSetView(View.MIXING_PLANNER);
        } else {
             setErrors({ form: [result.message] });
        }
    };

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900 min-h-full flex flex-col">
            <header className="flex items-center gap-3 mb-6 pb-4 border-b dark:border-secondary-700">
                <Button onClick={() => handleSetView(View.MIXING_PLANNER)} variant="secondary" className="p-2"><ArrowLeftIcon className="h-5 w-5"/></Button>
                <div>
                    <div className="flex items-center gap-3">
                         <MixerIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
                         <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Nowe Zlecenie Miksowania</h2>
                    </div>
                </div>
            </header>

            <div className="max-w-3xl mx-auto w-full bg-white dark:bg-secondary-800 rounded-xl shadow-lg p-6">
                {errors.form && errors.form.length > 0 && <Alert type="error" message="Popraw błędy w formularzu" details={errors.form.join('<br>')} />}

                <div className="space-y-6">
                    <Input 
                        label="Nazwa zlecenia / Odbiorca"
                        id="recipient-name"
                        value={recipient}
                        onChange={e => setRecipient(e.target.value)}
                        required
                        autoFocus
                        error={errors.recipient}
                        placeholder="np. Mieszanka dla Klienta X"
                    />

                    <div className="p-4 border dark:border-secondary-700 rounded-lg bg-slate-50 dark:bg-secondary-900/50 space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="text-md font-semibold text-gray-700 dark:text-gray-200">Kompozycja Mieszanki</h4>
                            <span className={`text-sm font-bold ${totalWeight > 1000 ? 'text-red-500' : 'text-primary-600'}`}>
                                Cel: {totalWeight.toFixed(2)} kg / 1000 kg
                            </span>
                        </div>
                        
                        {composition.map((item, index) => (
                            <div key={index} className="grid grid-cols-[1fr_140px_auto] gap-3 items-end p-2 bg-white dark:bg-secondary-800 rounded border dark:border-secondary-700">
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
                                <Button onClick={() => handleRemoveIngredient(index)} variant="secondary" className="p-2.5 mb-0.5" disabled={composition.length <= 2}>
                                    <TrashIcon className="h-5 w-5 text-red-500"/>
                                </Button>
                            </div>
                        ))}
                        
                        <Button onClick={handleAddIngredient} variant="secondary" className="w-full justify-center" disabled={totalWeight >= 1000} leftIcon={<PlusIcon className="h-4 w-4"/>}>
                            Dodaj kolejny składnik
                        </Button>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t dark:border-secondary-700">
                        <Button onClick={() => handleSetView(View.MIXING_PLANNER)} variant="secondary" className="px-6">Anuluj</Button>
                        <Button onClick={handleSubmit} variant="primary" className="px-8 py-3 text-lg">Utwórz Zlecenie</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddMixingOrderPage;
