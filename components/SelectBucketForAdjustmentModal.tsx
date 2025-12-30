import React, { useState, useMemo, useEffect, useRef } from 'react';
import { AdjustmentOrder } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import QrCodeIcon from './icons/QrCodeIcon';
import { useRecipeAdjustmentContext } from './contexts/RecipeAdjustmentContext';
import { useUIContext } from './contexts/UIContext';
import { View } from '../types';

interface SelectBucketForAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: any[];
}

const SelectBucketForAdjustmentModal: React.FC<SelectBucketForAdjustmentModalProps> = ({
    isOpen,
    onClose,
    orders,
}) => {
    const { handleUpdateAdjustmentOrder } = useRecipeAdjustmentContext();
    const { handleSetView } = useUIContext();
    
    const [selectedBucketId, setSelectedBucketId] = useState<string | null>(null);
    const [scannedInput, setScannedInput] = useState<string>('');
    const [assignBucketId, setAssignBucketId] = useState('');
    const [error, setError] = useState<string | null>(null);
    const scanInputRef = useRef<HTMLInputElement | null>(null);
    const assignInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedBucketId(null);
            setScannedInput('');
            setAssignBucketId('');
            setError(null);
            setTimeout(() => {
                if (assignInputRef.current) {
                    assignInputRef.current.focus();
                }
            }, 100);
        }
    }, [isOpen]);

    useEffect(() => {
        if (selectedBucketId && scanInputRef.current) {
            scanInputRef.current.focus();
        }
    }, [selectedBucketId]);

    const bucketsInUse = useMemo(() => {
        const bucketMap = new Map<string, { orderIds: string[], status: string }>();
        (orders || []).forEach(order => {
            if (order.preparationLocation) {
                if (!bucketMap.has(order.preparationLocation)) {
                    bucketMap.set(order.preparationLocation, { orderIds: [], status: order.status });
                }
                const bucketInfo = bucketMap.get(order.preparationLocation)!;
                bucketInfo.orderIds.push(order.id);
                if (order.status === 'processing') {
                    bucketInfo.status = 'processing';
                }
            }
        });
        return Array.from(bucketMap.entries()).map(([bucketId, data]) => ({ bucketId, ...data }));
    }, [orders]);

    const handleNavigationAndFiltering = (bucketId: string) => {
        localStorage.setItem('temp_selectedBucketId', bucketId);
        handleSetView(View.ManageAdjustments);
        onClose();
    };
    
    const handleAssignAndNavigate = async () => {
        if (!assignBucketId.trim()) {
            setError("Numer wiadra jest wymagany.");
            return;
        }
        const bucketId = assignBucketId.trim().toUpperCase();

        const plannedOrders = (orders || []).filter(o => o.status === 'planned');
        if (plannedOrders.length === 0) {
            setError("Nie znaleziono zaplanowanych zleceń do przypisania.");
            return;
        }

        let success = true;
        for (const order of plannedOrders) {
            const result = handleUpdateAdjustmentOrder(order.id, { status: 'material_picking', preparationLocation: bucketId });
            if (!result.success) {
                success = false;
                setError(`Nie udało się zaktualizować zlecenia ${order.id}: ${result.message}`);
                break;
            }
        }

        if (success) {
            handleNavigationAndFiltering(bucketId);
        }
    };

    const handleBucketSelect = (bucketId: string) => {
        setSelectedBucketId(bucketId);
        setError(null);
        setScannedInput('');
    };

    const handleVerificationSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (scannedInput.trim().toUpperCase() === selectedBucketId?.toUpperCase()) {
            handleNavigationAndFiltering(selectedBucketId!);
        } else {
            setError(`Nieprawidłowe wiadro. Oczekiwano: ${selectedBucketId}, zeskanowano: ${scannedInput.trim()}.`);
            setScannedInput('');
            scanInputRef.current?.focus();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300">Wybierz Pojemnik</h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                {error && <Alert type="error" message={error} />}

                {selectedBucketId ? (
                    <div>
                        <p className="text-sm mb-2">Potwierdź, skanując ponownie pojemnik <strong className="font-mono">{selectedBucketId}</strong>.</p>
                        <form onSubmit={handleVerificationSubmit}>
                            <Input
                                ref={scanInputRef}
                                label="Zeskanuj, aby potwierdzić"
                                id="bucket-verify"
                                value={scannedInput}
                                onChange={e => setScannedInput(e.target.value)}
                                icon={<QrCodeIcon className="h-5 w-5 text-gray-400" />}
                                autoFocus
                            />
                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="button" variant="secondary" onClick={() => setSelectedBucketId(null)}>Wróć</Button>
                                <Button type="submit">Przejdź do Kompletacji</Button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div>
                        {bucketsInUse.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Wybierz wiadro w użyciu:</h3>
                                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                                {bucketsInUse.map(bucket => (
                                    <button
                                        key={bucket.bucketId}
                                        onClick={() => handleBucketSelect(bucket.bucketId)}
                                        className="w-full text-left p-2 border dark:border-secondary-600 rounded-md hover:bg-slate-50 dark:hover:bg-secondary-700"
                                    >
                                        <p className="font-semibold font-mono">{bucket.bucketId}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {bucket.orderIds.length} zleceń, status: {bucket.status}
                                        </p>
                                    </button>
                                ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="relative my-4">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-300 dark:border-secondary-600" /></div>
                            <div className="relative flex justify-center"><span className="px-2 bg-white dark:bg-secondary-800 text-sm text-gray-500 dark:text-gray-400">Lub</span></div>
                        </div>

                        <div>
                            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Przypisz nowe wiadro do wszystkich zaplanowanych zleceň:</h3>
                            <form onSubmit={(e) => { e.preventDefault(); handleAssignAndNavigate(); }} className="flex items-end gap-2 mt-2">
                                <Input
                                    ref={assignInputRef}
                                    label=""
                                    id="new-bucket-id"
                                    value={assignBucketId}
                                    onChange={e => setAssignBucketId(e.target.value)}
                                    placeholder="Wprowadź ID nowego wiadra"
                                />
                                <Button type="submit">Przypisz</Button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SelectBucketForAdjustmentModal;