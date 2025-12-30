
import React, { useState, useMemo } from 'react';
import { PalletType, SelectOption } from '../types';
import { useWarehouseContext } from './contexts/WarehouseContext';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import TruckIcon from './icons/TruckIcon';
import SearchableSelect from './SearchableSelect';

interface AddPalletTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AddPalletTransactionModal: React.FC<AddPalletTransactionModalProps> = ({ isOpen, onClose }) => {
    const { suppliers, customers, handleAddPalletTransaction } = useWarehouseContext();
    
    const [contractorValue, setContractorValue] = useState('');
    const [palletType, setPalletType] = useState<PalletType>('EUR');
    const [direction, setDirection] = useState<'IN' | 'OUT'>('OUT');
    const [quantity, setQuantity] = useState('1');
    const [referenceDoc, setReferenceDoc] = useState('');
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const contractorOptions = useMemo(() => {
        return [...suppliers, ...customers].map(c => ({ value: c.value, label: c.label }));
    }, [suppliers, customers]);

    const palletTypeOptions = [
        { value: 'EUR', label: 'EUR (Standard)' },
        { value: 'EPAL', label: 'EPAL' },
        { value: 'H1', label: 'H1 (Higieniczna)' },
        { value: 'IND', label: 'Przemysłowa' },
        { value: 'PLASTIC', label: 'Plastikowa' },
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const qty = parseInt(quantity, 10);
        if (isNaN(qty) || qty <= 0) return;

        const result = handleAddPalletTransaction({
            contractorValue,
            type: palletType,
            direction,
            quantity: direction === 'IN' ? qty : -qty,
            referenceDoc
        });

        if (result.success) {
            setFeedback({ type: 'success', message: result.message });
            setTimeout(onClose, 1200);
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[200]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="px-6 py-4 border-b dark:border-secondary-700 bg-slate-50 dark:bg-secondary-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <TruckIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Ruch Opakowań</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {feedback && <Alert type={feedback.type} message={feedback.message} />}

                    <SearchableSelect 
                        label="Kontrahent"
                        options={contractorOptions}
                        value={contractorValue}
                        onChange={setContractorValue}
                        placeholder="Wybierz dostawcę lub klienta..."
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kierunek</label>
                            <div className="flex bg-gray-100 dark:bg-secondary-900 p-1 rounded-lg">
                                <button 
                                    type="button"
                                    onClick={() => setDirection('OUT')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded ${direction === 'OUT' ? 'bg-white dark:bg-secondary-700 shadow text-orange-600' : 'text-gray-500'}`}
                                >
                                    WYDANIE
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setDirection('IN')}
                                    className={`flex-1 py-1.5 text-xs font-bold rounded ${direction === 'IN' ? 'bg-white dark:bg-secondary-700 shadow text-green-600' : 'text-gray-500'}`}
                                >
                                    PRZYJĘCIE
                                </button>
                            </div>
                        </div>
                        <Select 
                            label="Typ palety"
                            options={palletTypeOptions}
                            value={palletType}
                            onChange={(e: any) => setPalletType(e.target.value as PalletType)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input 
                            label="Ilość (szt.)"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            required
                        />
                        <Input 
                            label="Nr dokumentu (opcjonalnie)"
                            value={referenceDoc}
                            onChange={e => setReferenceDoc(e.target.value)}
                            placeholder="np. WZ 123"
                        />
                    </div>

                    <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3">
                        <Button type="button" onClick={onClose} variant="secondary">Anuluj</Button>
                        <Button type="submit" disabled={!contractorValue}>Zatwierdź Ruch</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPalletTransactionModal;
