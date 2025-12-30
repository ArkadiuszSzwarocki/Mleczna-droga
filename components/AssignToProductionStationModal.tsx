
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from './contexts/AppContext';
import { RawMaterialLogEntry } from '../types';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import Alert from './Alert';
import { formatDate, getBlockInfo } from '../src/utils';

interface AssignToProductionStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  stationId: string | null;
}

const AssignToProductionStationModal: React.FC<AssignToProductionStationModalProps> = ({ isOpen, onClose, stationId }) => {
    const { rawMaterialsLogList, handleAssignPalletToProductionStation, stationRawMaterialMapping } = useAppContext();
    const [selectedPalletId, setSelectedPalletId] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            setSelectedPalletId(null);
            setFeedback(null);
        }
    }, [isOpen]);

    // Pobieramy surowiec, który MUSI być na tej stacji
    const requiredMaterial = stationId ? stationRawMaterialMapping[stationId] : undefined;
    const requiredForm = stationId?.startsWith('BB') ? 'big_bag' : 'bags';
    
    const availablePallets = useMemo(() => {
        if (!stationId || !requiredMaterial) return [];
        
        return (rawMaterialsLogList || [])
            .filter(p => {
                const { isBlocked } = getBlockInfo(p);
                const location = p.currentLocation;
                
                // Ignorujemy palety zablokowane i te, które już są na jakiejś stacji produkcyjnej
                if (!location || isBlocked || location.startsWith('BB') || location.startsWith('MZ')) return false;

                // KLUCZOWY FILTR: Nazwa produktu musi zgadzać się z konfiguracją stacji
                return p.palletData.nazwa === requiredMaterial && p.palletData.currentWeight > 0;
            })
            .sort((a, b) => {
                // FEFO - najpierw te z najkrótszą datą ważności
                return new Date(a.palletData.dataPrzydatnosci).getTime() - new Date(b.palletData.dataPrzydatnosci).getTime();
            });
    }, [rawMaterialsLogList, requiredMaterial, stationId]);

    const handleSubmit = () => {
        if (!selectedPalletId || !stationId) {
            setFeedback({ type: 'error', message: 'Wybierz paletę do przypisania.' });
            return;
        }
        
        const result = handleAssignPalletToProductionStation(selectedPalletId, stationId);
        
        if (result.success) {
            onClose();
        } else {
            setFeedback({ type: 'error', message: result.message });
        }
    };

    if (!isOpen || !stationId) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[160]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <CheckCircleIcon className="h-6 w-6 text-primary-600"/>
                        Zasyp Stacji {stationId}
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    {feedback && <Alert type={feedback.type} message={feedback.message} />}
                    <Alert 
                        type="info" 
                        message={`Wymagany surowiec: ${requiredMaterial}`} 
                        details={`Stacja akceptuje wyłącznie ${requiredForm === 'big_bag' ? 'Big-Bagi' : 'małe worki'} produktu "${requiredMaterial}".`} 
                    />

                    {availablePallets.length > 0 ? (
                        <div className="space-y-2">
                            {availablePallets.map(pallet => {
                                return (
                                    <label key={pallet.id} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${selectedPalletId === pallet.id ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400 dark:bg-blue-900/40' : 'bg-white dark:bg-secondary-700 border-slate-200 dark:border-secondary-600 hover:border-blue-300'}`}>
                                        <input
                                            type="radio"
                                            name="pallet-selection"
                                            value={pallet.id}
                                            checked={selectedPalletId === pallet.id}
                                            onChange={(e) => setSelectedPalletId(e.target.value)}
                                            className="h-5 w-5 text-primary-600 border-gray-300 focus:ring-primary-500"
                                        />
                                        <div className="ml-3 text-sm flex-grow grid grid-cols-1 sm:grid-cols-4 gap-2 items-center">
                                            <div>
                                                <p className="font-mono font-bold text-gray-800 dark:text-gray-200">{pallet.palletData.nrPalety}</p>
                                                <p className="text-[10px] text-gray-500 uppercase">{pallet.palletData.packageForm}</p>
                                            </div>
                                            <p className="sm:text-center font-medium text-gray-700 dark:text-gray-300">Lok: <span className="font-mono">{pallet.currentLocation}</span></p>
                                            <p className="sm:text-center text-gray-600 dark:text-gray-400">Ważność: {formatDate(pallet.palletData.dataPrzydatnosci)}</p>
                                            <p className="sm:text-right font-extrabold text-primary-700 dark:text-primary-300">{pallet.palletData.currentWeight.toFixed(0)} kg</p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="py-8 text-center bg-slate-50 dark:bg-secondary-900 rounded-lg border-2 border-dashed border-slate-200 dark:border-secondary-700">
                             <XCircleIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                             <p className="text-gray-500 dark:text-gray-400">Brak dostępnych palet surowca <strong>{requiredMaterial}</strong> w magazynach.</p>
                             <p className="text-xs text-gray-400 mt-1">Upewnij się, że surowiec jest w magazynie i nie jest zablokowany przez Lab.</p>
                        </div>
                    )}
                </div>

                <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3 mt-4">
                    <Button onClick={onClose} variant="secondary">Anuluj</Button>
                    <Button onClick={handleSubmit} disabled={!selectedPalletId}>Potwierdź Zasyp Stacji</Button>
                </div>
            </div>
        </div>
    );
};

export default AssignToProductionStationModal;
