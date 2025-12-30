import React, { useState, useMemo, useEffect } from 'react';
import Alert from './Alert';
import { RawMaterialLogEntry, User, View, Document, Permission } from '../types';
import { formatDate, getBlockInfo, getExpiryStatus, getExpiryStatusClass, getActionLabel } from '../src/utils';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';
import LockClosedIcon from './icons/LockClosedIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useUIContext } from './contexts/UIContext';
import ClipboardIcon from './icons/ClipboardIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import { useAuth } from './contexts/AuthContext';
import LockOpenIcon from './icons/LockOpenIcon';
import BeakerIcon from './icons/BeakerIcon';
import CalendarDaysIcon from './icons/CalendarDaysIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import ConfirmationModal from './ConfirmationModal';
import { VIRTUAL_LOCATION_ARCHIVED } from '../constants';
import ArrowPathIcon from './icons/ArrowPathIcon';
// FIX: Added missing import for ShieldCheckIcon to resolve the 'Cannot find name' error on line 160.
import ShieldCheckIcon from './icons/ShieldCheckIcon';

interface PalletDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  pallet: RawMaterialLogEntry | null;
  onGenerateLabel: (pallet: RawMaterialLogEntry) => void;
}

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex flex-col">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</span>
    </div>
);

const PalletDetailModal: React.FC<PalletDetailModalProps> = ({ isOpen, onClose, pallet, onGenerateLabel }) => {
    const { expiryWarningDays, expiryCriticalDays, handleArchiveItem, handleRestoreItem } = useWarehouseContext();
    const { modalHandlers, handleSetView, showToast } = useUIContext();
    const { currentUser, checkPermission } = useAuth();
    const [copied, setCopied] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setShowArchiveConfirm(false);
            setShowRestoreConfirm(false);
            setCopied(false);
        }
    }, [isOpen, pallet?.id]);

    const documents = useMemo(() => {
        if (!pallet) return [];
        return (pallet.palletData.documents || []);
    }, [pallet]);
    
    const allLabNotesText = useMemo(() => {
        if (!pallet) return '';
        const notes: string[] = [];
        if (pallet.palletData.labAnalysisNotes) {
            notes.push(`Notatki główne:\n${pallet.palletData.labAnalysisNotes}`);
        }
        const historyNotes = pallet.locationHistory
            .filter(h => h.notes && (h.action.includes('lab') || h.action.includes('block') || h.action.includes('note')))
            .map(h => `[${formatDate(h.movedAt, true)} / ${h.movedBy} / ${getActionLabel(h.action)}]:\n${h.notes}`);
        notes.push(...historyNotes);
        return [...new Set(notes)].join('\n\n---\n\n');
    }, [pallet]);

    if (!isOpen || !pallet) return null;

    const { palletData } = pallet;
    const { isBlocked, reason: blockReason } = getBlockInfo(pallet);
    const today = new Date().toISOString().split('T')[0];
    const expiryStatus = getExpiryStatus(palletData, expiryWarningDays, expiryCriticalDays);
    const isExpired = palletData.dataPrzydatnosci < today;
    const expiryClass = getExpiryStatusClass(expiryStatus);
    const canManageLock = checkPermission(Permission.MANAGE_PALLET_LOCK);
    const canExtendExpiry = checkPermission(Permission.EXTEND_EXPIRY_DATE);
    const isArchived = pallet.currentLocation === VIRTUAL_LOCATION_ARCHIVED;

    const onArchive = () => {
        const result = handleArchiveItem(pallet.id, 'raw');
        showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            onClose();
        }
    };

    const onRestore = () => {
        const result = handleRestoreItem(pallet.id, 'raw');
        showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            onClose();
        }
    };
    
    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[160] no-print" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="px-6 py-4 border-b dark:border-secondary-700 flex justify-between items-start">
                    <div className="overflow-hidden pr-2">
                        <h2 className="text-xl font-bold text-primary-700 dark:text-primary-300 truncate">{palletData.nazwa}</h2>
                         <div className="group flex items-center gap-2">
                            <p className="text-xl sm:text-2xl md:text-4xl font-mono text-gray-800 dark:text-gray-200 break-all">{palletData.nrPalety}</p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(palletData.nrPalety);
                                    setCopied(true);
                                    setTimeout(() => setCopied(false), 2000);
                                }}
                                title={copied ? "Skopiowano!" : "Kopiuj ID"}
                                className="p-1 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0"
                            >
                                {copied ? <CheckCircleIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />}
                            </button>
                        </div>
                    </div>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-2 -mt-1 flex-shrink-0"><XCircleIcon className="h-6 w-6"/></Button>
                </header>
                
                <div className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    {isArchived && (
                        <Alert type="warning" message="Ta pozycja znajduje się w archiwum." details="Jest ona wyłączona z obrotu magazynowego i produkcji. Możesz ją przywrócić tylko jeśli nastąpiła pomyłka." />
                    )}

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border border-slate-200 dark:border-secondary-700 rounded-lg">
                            <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Szczegóły Palety</h3>
                            <div className="space-y-3">
                                <DetailItem label="Aktualna Lokalizacja" value={pallet.currentLocation || 'Brak'} />
                                <DetailItem label="Waga Początkowa / Aktualna" value={`${palletData.initialWeight.toFixed(2)} kg / ${palletData.currentWeight.toFixed(2)} kg`} />
                                <DetailItem label="Nr Partii Dostawcy" value={palletData.batchNumber || 'Brak'} />
                                <DetailItem label="Forma Opakowania" value={palletData.packageForm || 'Brak'} />
                            </div>
                        </div>
                        <div className="p-4 border border-slate-200 dark:border-secondary-700 rounded-lg">
                             <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Status i Daty</h3>
                            <div className="space-y-3">
                                <DetailItem label="Status" value={
                                    isBlocked ? (
                                        <span className="flex items-center text-red-600 dark:text-red-400 font-bold"><LockClosedIcon className="h-4 w-4 mr-1"/> Zablokowana ({blockReason})</span>
                                    ) : (
                                        <span className="flex items-center text-green-600 dark:text-green-400 font-bold"><CheckCircleIcon className="h-4 w-4 mr-1"/> Dostępna</span>
                                    )
                                }/>
                                <DetailItem label="Data Produkcji" value={formatDate(palletData.dataProdukcji, true)} />
                                <DetailItem label="Data Ważności" value={<span className={expiryClass}>{formatDate(palletData.dataPrzydatnosci)}</span>} />
                            </div>
                        </div>
                    </section>

                    {palletData.analysisResults && palletData.analysisResults.length > 0 && (
                        <section className="p-4 border border-slate-200 dark:border-secondary-700 rounded-lg bg-slate-50 dark:bg-secondary-900/50">
                            <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                                Parametry Jakościowe (Wyniki Analiz)
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {palletData.analysisResults.map((res, ri) => (
                                    <div key={ri} className="p-2 bg-white dark:bg-secondary-800 rounded border dark:border-secondary-600 flex justify-between items-center">
                                        <span className="text-xs text-gray-500 font-bold uppercase">{res.name}</span>
                                        <span className="font-mono font-black text-primary-600">{res.value} {res.unit}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                     {(documents.length > 0 || canManageLock) && (
                        <section>
                            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2"><BeakerIcon className="h-5 w-5" /> Akcje i Dokumenty Lab.</h3>
                            <div className="flex items-center gap-4 flex-wrap">
                                {canManageLock && (
                                    <Button onClick={() => {
                                        onClose();
                                        handleSetView(View.LabAnalysisPage, { palletId: pallet.id, itemType: 'raw' });
                                    }} variant="secondary" leftIcon={<BeakerIcon className="h-4 w-4"/>}>
                                        Analiza Lab.
                                    </Button>
                                )}
                                <Button onClick={() => modalHandlers.openDocumentListModal(`Dokumenty dla ${palletData.nrPalety}`, documents)} variant="secondary" leftIcon={<DocumentTextIcon className="h-4 w-4" />} disabled={documents.length === 0}>
                                    Pokaż Dokumenty ({documents.length})
                                </Button>
                                {allLabNotesText && (
                                    <Button onClick={() => modalHandlers.openTextDisplayModal(`Notatki dla ${palletData.nrPalety}`, allLabNotesText)} variant="secondary" leftIcon={<ClipboardListIcon className="h-4 w-4" />}>
                                        Pokaż Uwagi Lab.
                                    </Button>
                                )}
                            </div>
                        </section>
                    )}

                    <section>
                        <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Historia Operacji</h3>
                         <div className="max-h-48 overflow-y-auto border dark:border-secondary-700 rounded-md scrollbar-hide">
                            <table className="min-w-full text-xs">
                                <thead className="bg-gray-100 dark:bg-secondary-700 sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left">Data</th>
                                        <th className="p-2 text-left">Operacja</th>
                                        <th className="p-2 text-left">Z Lokalizacji</th>
                                        <th className="p-2 text-left">Do Lokalizacji</th>
                                        <th className="p-2 text-left">Użytkownik</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y dark:divide-secondary-700">
                                    {[...pallet.locationHistory].reverse().map((h, i) => (
                                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-secondary-700/50">
                                            <td className="p-2 whitespace-nowrap">{formatDate(h.movedAt, true)}</td>
                                            <td className="p-2">{getActionLabel(h.action)}</td>
                                            <td className="p-2 font-mono">{h.previousLocation || '---'}</td>
                                            <td className="p-2 font-mono">{h.targetLocation}</td>
                                            <td className="p-2">{h.movedBy}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
                
                <footer className="px-6 py-3 bg-gray-50 dark:bg-secondary-900/50 border-t dark:border-secondary-700 flex flex-wrap justify-between items-center gap-3">
                     <div className="flex items-center gap-2">
                        {canManageLock && isBlocked && (
                            <Button
                                onClick={() => { modalHandlers.openUnblockReasonModal(pallet); onClose(); }}
                                variant="secondary"
                                className="bg-green-100 text-green-800 border-green-300"
                                leftIcon={<LockOpenIcon className="h-5 w-5"/>}
                                disabled={isExpired}
                                title={isExpired ? "Nie można zwolnić przeterminowanej palety. Najpierw przedłuż termin." : "Zwolnij paletę"}
                            >
                                Zwolnij
                            </Button>
                        )}
                        {canManageLock && !isBlocked && !isArchived && (
                            <Button 
                                onClick={() => { modalHandlers.openBlockPalletModal(pallet); onClose(); }} 
                                variant="secondary" 
                                className="bg-red-100 text-red-800 border-red-300" 
                                leftIcon={<LockClosedIcon className="h-5 w-5"/>}
                            >
                                Zablokuj
                            </Button>
                        )}
                        {canExtendExpiry && isExpired && (
                             <Button
                                onClick={() => { modalHandlers.openExtendExpiryDateModal(pallet); onClose(); }}
                                variant="secondary"
                                className="bg-yellow-100 text-yellow-800 border-yellow-300"
                                leftIcon={<CalendarDaysIcon className="h-5 w-5"/>}
                                title="Przedłuż termin ważności, aby móc odblokować"
                            >
                                Przedłuż Termin
                            </Button>
                        )}
                        {currentUser?.role === 'admin' && (
                            isArchived ? (
                                <Button
                                    onClick={() => setShowRestoreConfirm(true)}
                                    variant="primary"
                                    className="bg-green-600 hover:bg-green-700"
                                    leftIcon={<ArrowPathIcon className="h-5 w-5"/>}
                                >
                                    Przywróć z Archiwum
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setShowArchiveConfirm(true)}
                                    variant="danger"
                                    className="bg-red-600 hover:bg-red-700"
                                    leftIcon={<ArchiveBoxIcon className="h-5 w-5"/>}
                                >
                                    Archiwizuj
                                </Button>
                            )
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button onClick={() => onGenerateLabel(pallet)} variant="secondary" leftIcon={<PrintLabelIcon className="h-5 w-5"/>}>Drukuj Etykietę</Button>
                        <Button onClick={onClose}>Zamknij</Button>
                    </div>
                </footer>
            </div>
            {showArchiveConfirm && (
                <ConfirmationModal 
                    isOpen={true} 
                    onClose={() => setShowArchiveConfirm(false)} 
                    onConfirm={onArchive}
                    title="Potwierdź archiwizację"
                    message={`Czy na pewno chcesz przenieść paletę ${palletData.nrPalety} do archiwum? Akcja ta jest zarejestrowana jako manualna decyzja administratora.`}
                    confirmButtonText="Tak, archiwizuj"
                />
            )}
            {showRestoreConfirm && (
                <ConfirmationModal 
                    isOpen={true} 
                    onClose={() => setShowRestoreConfirm(false)} 
                    onConfirm={onRestore}
                    title="Potwierdź przywrócenie"
                    message={`Czy na pewno chcesz przywrócić paletę ${palletData.nrPalety} z archiwum do magazynu głównego (MS01)?`}
                    confirmButtonText="Tak, przywróć"
                />
            )}
        </div>
    );
};

export default PalletDetailModal;
