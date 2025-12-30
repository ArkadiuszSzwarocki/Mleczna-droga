import React, { useState, useMemo } from 'react';
// FIX: Corrected import path for constants.ts to be relative
import { ALL_MANAGEABLE_WAREHOUSES } from '../constants';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import ClipboardDocumentCheckIcon from './icons/ClipboardDocumentCheckIcon';
import Checkbox from './Checkbox';
// FIX: Corrected import path for WarehouseContext to be relative.
import { useWarehouseContext } from './contexts/WarehouseContext';

interface StartInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StartInventoryModal: React.FC<StartInventoryModalProps> = ({ isOpen, onClose }) => {
    const { handleStartInventorySession } = useWarehouseContext();
    const [name, setName] = useState('');
    const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    const inventoryLocations = useMemo(() => 
        ALL_MANAGEABLE_WAREHOUSES.filter(wh => wh.id !== 'all'),
        []
    );

    const handleLocationToggle = (locationId: string, isChecked: boolean) => {
        setSelectedLocations(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.add(locationId);
            } else {
                newSet.delete(locationId);
            }
            return newSet;
        });
    };

    const handleSubmit = () => {
        setError(null);
        if (!name.trim()) {
            setError("Nazwa/opis inwentaryzacji jest wymagany.");
            return;
        }
        if (selectedLocations.size === 0) {
            setError("Wybierz co najmniej jedną lokalizację do inwentaryzacji.");
            return;
        }

        const result = handleStartInventorySession(name, Array.from(selectedLocations));
        if (result.success) {
            onClose();
        } else {
            setError(result.message);
        }
    };
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <ClipboardDocumentCheckIcon className="h-6 w-6"/>
                        Rozpocznij Nową Inwentaryzację
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {error && <Alert type="error" message={error} />}

                    <Input 
                        label="Nazwa / Opis Inwentaryzacji"
                        id="inventory-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Np. Inwentaryzacja miesięczna MS01"
                        required
                        autoFocus
                    />

                    <div>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Wybierz lokalizacje do sprawdzenia:</p>
                        <div className="max-h-64 overflow-y-auto border dark:border-secondary-700 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 dark:bg-secondary-900">
                            {inventoryLocations.map(loc => (
                                <Checkbox 
                                    key={loc.id}
                                    id={`loc-${loc.id}`}
                                    label={loc.label}
                                    checked={selectedLocations.has(loc.id)}
                                    onChange={(e) => handleLocationToggle(loc.id, e.target.checked)}
                                />
                            ))}
                        </div>
                    </div>
                    <Alert type="info" message="Uwaga" details="Rozpoczęcie inwentaryzacji zablokuje możliwość przesuwania palet w wybranych lokalizacjach aż do jej zakończenia." />
                </div>
                
                <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3 mt-4">
                    <Button onClick={onClose} variant="secondary">Anuluj</Button>
                    <Button onClick={handleSubmit}>Rozpocznij</Button>
                </div>
            </div>
        </div>
    );
};

export default StartInventoryModal;