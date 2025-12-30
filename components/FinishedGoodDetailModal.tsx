
import React, { useState, useMemo, useEffect } from 'react';
import Alert from './Alert';
import { FinishedGoodItem, User, View, Document, Permission } from '../types';
import { useAuth } from './contexts/AuthContext';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { formatDate, getBlockInfo, getExpiryStatus, getExpiryStatusClass, getFinishedGoodStatusLabel, getActionLabel } from '../src/utils';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';
import LockClosedIcon from './icons/LockClosedIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import LockOpenIcon from './icons/LockOpenIcon';
import { useUIContext } from './contexts/UIContext';
import BeakerIcon from './icons/BeakerIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import CalendarDaysIcon from './icons/CalendarDaysIcon';
import Squares2X2Icon from './icons/Squares2X2Icon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import ConfirmationModal from './ConfirmationModal';
import { VIRTUAL_LOCATION_ARCHIVED } from '../constants';
import ArrowPathIcon from './icons/ArrowPathIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';

interface FinishedGoodDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FinishedGoodItem | null;
  onGenerateLabel: (item: FinishedGoodItem) => void;
  onUpdateStatus: (itemId: string, newStatus: FinishedGoodItem['status']) => void;
}

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex flex-col">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</span>
    </div>
);

const FinishedGoodDetailModal: React.FC<FinishedGoodDetailModalProps> = ({ isOpen, onClose, item, onGenerateLabel, onUpdateStatus }) => {
    const { expiryWarningDays, expiryCriticalDays, handleArchiveItem, handleRestoreItem } = useWarehouseContext();
    const { currentUser, checkPermission } = useAuth();
    const { modalHandlers, handleSetView, showToast } = useUIContext();
    const [copied, setCopied] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    
    useEffect(() => {
        if (!isOpen) {
            setShowArchiveConfirm(false);
            setShowRestoreConfirm(false);
            setCopied(false);
        }
    }, [isOpen, item?.id]);

    const documents = useMemo(() => {
        if (!item) return [];
        return (item.documents || []);
    }, [item]);
    
    const allLabNotesText = useMemo(() => {
        if (!item) return '';
        const notes: string[] = [];
        if (item.labAnalysisNotes) {
            notes.push(`Notatki główne:\n${item.labAnalysisNotes}`);
        }
        const historyNotes = (item.locationHistory || [])
            .filter(h => h.notes && (h.action.includes('lab') || h.action.includes('block') || h.action.includes('note') || h.action === 'produced'))
            .map(h => `[${formatDate(h.movedAt, true)} / ${h.movedBy} / ${getActionLabel(h.action)}]:\n${h.notes}`);
        notes.push(...historyNotes);
        return [...new Set(notes)].join('\n\n---\n\n');
    }, [item]);

    if (!isOpen || !item) return null;

    const { isBlocked, reason: blockReason } = getBlockInfo(item);
    const expiryStatus = getExpiryStatus({ dataPrzydatnosci: item.expiryDate } as any, expiryWarningDays, expiryCriticalDays);
    const isExpired = expiryStatus === 'expired';
    const expiryClass = getExpiryStatusClass(expiryStatus);
    const canManageLock = checkPermission(Permission.MANAGE_PALLET_LOCK);
    const canExtendExpiry = checkPermission(Permission.EXTEND_EXPIRY_DATE);
    const isArchived = item.currentLocation === VIRTUAL_LOCATION_ARCHIVED;
    
    const quantityKg = item.quantityKg ?? 0;
    const grossWeightKg = item.grossWeightKg ?? 0;

    const onArchive = () => {
        const result = handleArchiveItem(item.id, 'fg');
        showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            onClose();
        }
    };

    const onRestore = () => {
        const result = handleRestoreItem(item.id, 'fg');
        showToast(result.message, result.success ? 'success' : 'error');
        if (result.success) {
            onClose();
        }
    };
    
    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[160] no-print" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="px-6 py-4 border-b dark:border-secondary-700 flex justify-between items-start">
                    <div className="overflow-hidden pr-2">
                        <h2 className="text-xl font-bold text-primary-700 dark:text-primary-300 truncate">{item.productName}</h2>
                        <div className="group flex items-center gap-2">
                           <p className="text-xl sm:text-2xl md:text-4xl font-mono text-gray-800 dark:text-gray-200 break-all">{item.displayId || item.id}</p>
                           <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(item.displayId || item.id);
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
                        <Alert type="warning" message="Ten wyrób gotowy znajduje się w archiwum." details="Został on oznaczony jako wydany lub manualnie zarchiwizowany przez administratora." />
                    )}

                     <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 border border-slate-200 dark:border-secondary-700 rounded-lg">
                            <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Szczegóły Palety</h3>
                             <div className="space-y-3">
                                <DetailItem label="Aktualna Lokalizacja" value={item.currentLocation || 'Brak'} />
                                <DetailItem label="Waga Netto / Brutto" value={`${quantityKg.toFixed(2)} kg / ${grossWeightKg.toFixed(2)} kg`} />
                                <DetailItem label="Typ Palety" value={item.palletType} />
                            </div>
                        </div>
                        <div className="p-4 border border-slate-200 dark:border-secondary-700 rounded-lg">
                             <h3 className="font-semibold mb-3 text-gray-700 dark:text-gray-300">Status i Daty</h3>
                            <div className="space-y-3">
                                 <DetailItem label="Status" value={
                                    <span className={`font-semibold ${isBlocked ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                        {getFinishedGoodStatusLabel(item.status)} {isBlocked && `(${blockReason})`}
                                    </span>
                                }/>
                                <DetailItem label="Data Produkcji" value={formatDate(item.productionDate, true)} />
                                <DetailItem label="Data Ważności" value={<span className={expiryClass}>{formatDate(item.expiryDate)}</span>} />
                            </div>
                        </div>
                    </section>

                    {item.analysisResults && item.analysisResults.length > 0 && (
                        <section className="p-4 border border-slate-200 dark:border-secondary-700 rounded-lg bg-slate-50 dark:bg-secondary-900/50">
                            <h3 className="font-semibold mb-3 text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                                Parametry Jakościowe
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {item.analysisResults.map((res, ri) => (
                                    <div key={ri} className="p-2 bg-white dark:bg-secondary-800 rounded border dark:border-secondary-600 flex justify-between items-center">
                                        <span className="text-xs text-gray-500 font-bold uppercase">{res.name}</span>
                                        <span className="font-mono font-black text-primary-600">{res.value} {res.unit}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {item.batchSplit && item.batchSplit.length > 0 && (
                         <section className="p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <h3 className="font-semibold mb-3 text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                <Squares2X2Icon className="h-5 w-5" /> Struktura Partii (Agregacja)
                            </h3>
                            <div className="text-sm">
                                <p className="mb-2 text-gray-600 dark:text-gray-400">Ta paleta została skompletowana z wielu partii produkcyjnych:</p>
                                <ul className="space-y-1">
                                    {item.batchSplit.map((split, index) => (
                                        <li key={index} className="flex justify-between items-center p-2 bg-white dark:bg-secondary-800 rounded border border-slate-200 dark:border-secondary-600">
                                            <span className="font-mono text-gray-800 dark:text-gray-200">Partia ID: ...{split.batchId.slice(-6)}</span>
                                            <span className="font-bold text-primary-700 dark:text-primary-400">{split.weight.toFixed(2)} kg</span>
                                        </li>
                                    ))}
                                </ul>
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
                                        handleSetView(View.LabAnalysisPage, { palletId: item.id, itemType: 'fg' });
                                    }} variant="secondary" leftIcon={<BeakerIcon className="h-4 w-4"/>}>
                                        Analiza Lab.
                                    </Button>
                                )}
                                <Button onClick={() => modalHandlers.openDocumentListModal(`Dokumenty dla ${item.displayId || item.id}`, documents)} variant="secondary" leftIcon={<DocumentTextIcon className="h-4 w-4" />} disabled={documents.length === 0}>
                                    Pokaż Dokumenty ({documents.length})
                                </Button>
                                {allLabNotesText && (
                                    <Button onClick={() => modalHandlers.openTextDisplayModal(`Notatki dla ${item.displayId}`, allLabNotesText)} variant="secondary" leftIcon={<ClipboardListIcon className="h-4 w-4" />}>
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
                                    {[...(item.locationHistory || [])].reverse().map((h, i) => (
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
                                onClick={() => { modalHandlers.openUnblockReasonModal(item); onClose(); }}
                                variant="secondary"
                                className="bg-green-100 text-green-800"
                                leftIcon={<LockOpenIcon className="h-5 w-5"/>}
                                disabled={isExpired}
                                title={isExpired ? "Nie można zwolnić przeterminowanej palety. Przedłuż termin." : "Zwolnij paletę"}
                            >
                                Zwolnij
                            </Button>
                        )}
                        {canManageLock && !isBlocked && !isArchived && <Button onClick={() => { modalHandlers.openBlockPalletModal(item); onClose(); }} variant="secondary" className="bg-red-100 text-red-800" leftIcon={<LockClosedIcon className="h-5 w-5"/>}>Zablokuj</Button>}
                        {canExtendExpiry && isExpired && (
                             <Button
                                onClick={() => { modalHandlers.openExtendExpiryDateModal(item); onClose(); }}
                                variant="secondary"
                                className="bg-yellow-100 text-yellow-800"
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
                        <Button onClick={() => onGenerateLabel(item)} variant="secondary" leftIcon={<PrintLabelIcon className="h-5 w-5"/>}>Drukuj Etykietę</Button>
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
                    message={`Czy na pewno chcesz przenieść wyrób gotowy ${item.displayId || item.id} do archiwum? Akcja ta jest zarejestrowana jako manualna decyzja administratora.`}
                    confirmButtonText="Tak, archiwizuj"
                />
            )}
            {showRestoreConfirm && (
                <ConfirmationModal 
                    isOpen={true} 
                    onClose={() => setShowRestoreConfirm(false)} 
                    onConfirm={onRestore}
                    title="Potwierdź przywrócenie"
                    message={`Czy na pewno chcesz przywrócić wyrób gotowy ${item.displayId || item.id} z archiwum do magazynu głównego (MGW01)?`}
                    confirmButtonText="Tak, przywróć"
                />
            )}
        </div>
    );
};

export default FinishedGoodDetailModal;
