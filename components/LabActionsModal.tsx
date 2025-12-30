import React from 'react';
import { RawMaterialLogEntry, FinishedGoodItem, View } from '../types';
import { useAppContext } from './contexts/AppContext';
import { useAuth } from './contexts/AuthContext';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import BeakerIcon from './icons/BeakerIcon';
import LockClosedIcon from './icons/LockClosedIcon';
import LockOpenIcon from './icons/LockOpenIcon';
import EditIcon from './icons/EditIcon';
import DocumentPlusIcon from './icons/DocumentPlusIcon';
import { getBlockInfo } from '../src/utils';

interface LabActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: RawMaterialLogEntry | FinishedGoodItem | null;
}

const LabActionsModal: React.FC<LabActionsModalProps> = ({ isOpen, onClose, item }) => {
    const { modalHandlers, handleSetView, handleUnblockPallet } = useAppContext();
    const { currentUser } = useAuth();
    
    if (!isOpen || !item) return null;

    const isRaw = 'palletData' in item;
    const { isBlocked } = getBlockInfo(item);

    const handleAction = (action: () => void) => {
        action();
        onClose();
    };
    
    const handleRelease = () => {
        if (currentUser) {
            handleUnblockPallet(item.id, isRaw ? 'raw' : 'fg', currentUser, "Zwolniono z panelu akcji.");
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[170]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <BeakerIcon className="h-6 w-6"/> Akcje Laboratoryjne
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>
                
                <div className="space-y-3">
                    <Button 
                        onClick={() => handleAction(() => handleSetView(View.LabAnalysisPage, { palletId: item.id, itemType: isRaw ? 'raw' : 'fg' }))} 
                        className="w-full justify-start text-base py-3" 
                        leftIcon={<BeakerIcon className="h-5 w-5"/>}
                    >
                        Przeprowadź Analizę
                    </Button>

                    {isBlocked ? (
                        <Button 
                            onClick={() => handleAction(() => modalHandlers.openUnblockReasonModal(item))} 
                            className="w-full justify-start text-base py-3" 
                            leftIcon={<LockOpenIcon className="h-5 w-5"/>}
                        >
                            Zwolnij Paletę
                        </Button>
                    ) : (
                        <Button 
                            onClick={() => handleAction(() => modalHandlers.openBlockPalletModal(item))} 
                            className="w-full justify-start text-base py-3 bg-orange-500 hover:bg-orange-600" 
                            leftIcon={<LockClosedIcon className="h-5 w-5"/>}
                        >
                            Zablokuj Paletę
                        </Button>
                    )}
                    
                    <Button 
                        onClick={() => handleAction(() => modalHandlers.openManageLabDocumentsModal(item))} 
                        variant="secondary" 
                        className="w-full justify-start" 
                        leftIcon={<DocumentPlusIcon className="h-5 w-5"/>}
                    >
                        Zarządzaj Dokumentami
                    </Button>
                </div>

                <div className="flex justify-end pt-4 mt-4 border-t dark:border-secondary-700">
                    <Button onClick={onClose} variant="secondary">Anuluj</Button>
                </div>
            </div>
        </div>
    );
};

export default LabActionsModal;