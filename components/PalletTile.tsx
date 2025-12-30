import React from 'react';
import { RawMaterialLogEntry, FinishedGoodItem, PackagingMaterialLogEntry } from '../types';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { useUIContext } from './contexts/UIContext';
import { formatDate, getBlockInfo, getExpiryStatus, getExpiryStatusClass, getActionLabel } from '../src/utils';
import CheckCircleIcon from './icons/CheckCircleIcon';
import LockClosedIcon from './icons/LockClosedIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';

interface PalletTileProps {
    item: RawMaterialLogEntry | FinishedGoodItem | PackagingMaterialLogEntry;
    onClick: () => void;
}

const PalletTile: React.FC<PalletTileProps> = ({ item, onClick }) => {
    const { expiryWarningDays, expiryCriticalDays } = useWarehouseContext();
    const { modalHandlers } = useUIContext();

    const isRaw = 'palletData' in item;
    const isFg = 'quantityKg' in item;
    const { isBlocked, reason } = getBlockInfo(item);
    
    const displayId = isRaw ? (item as RawMaterialLogEntry).palletData.nrPalety : (isFg ? ((item as FinishedGoodItem).displayId || (item as FinishedGoodItem).id) : (item as PackagingMaterialLogEntry).id);
    const productName = isRaw ? (item as RawMaterialLogEntry).palletData.nazwa : (isFg ? (item as FinishedGoodItem).productName : (item as PackagingMaterialLogEntry).productName);
    const expiryDate = isRaw ? (item as RawMaterialLogEntry).palletData.dataPrzydatnosci : (isFg ? (item as FinishedGoodItem).expiryDate : undefined);
    
    // FIX: Safe weight extraction to avoid toFixed on undefined
    const weight = isRaw 
        ? (item as RawMaterialLogEntry).palletData.currentWeight 
        : (isFg ? (item as FinishedGoodItem).quantityKg : (item as PackagingMaterialLogEntry).currentWeight) || 0;
    
    const palletDataForStatusCheck = isRaw ? (item as RawMaterialLogEntry).palletData : { dataPrzydatnosci: expiryDate };
    const expiryStatus = expiryDate ? getExpiryStatus(palletDataForStatusCheck as any, expiryWarningDays, expiryCriticalDays) : 'default';
    
    const hasDocuments = (isRaw ? (item as RawMaterialLogEntry).palletData.documents : (isFg ? (item as FinishedGoodItem).documents : []))?.length > 0;
    
    const allLabNotesText = React.useMemo(() => {
        const notes: string[] = [];
        const labNotes = isRaw ? (item as RawMaterialLogEntry).palletData.labAnalysisNotes : (isFg ? (item as FinishedGoodItem).labAnalysisNotes : undefined);
        if (labNotes) notes.push(`Notatki główne:\n${labNotes}`);
        const historyNotes = (item.locationHistory || [])
            .filter(h => h.notes && (h.action.includes('lab') || h.action.includes('block') || h.action.includes('note')))
            .map(h => `[${formatDate(h.movedAt, true)} / ${h.movedBy} / ${getActionLabel(h.action)}]:\n${h.notes}`);
        notes.push(...historyNotes);
        return [...new Set(notes)].join('\n\n---\n\n');
    }, [item, isRaw, isFg]);

    const hasNotes = allLabNotesText.trim().length > 0;

    let barColor = 'bg-primary-500';
    if (isBlocked) barColor = 'bg-red-500';
    else if (expiryStatus === 'critical' || expiryStatus === 'expired') barColor = 'bg-orange-500';
    else if (expiryStatus === 'warning') barColor = 'bg-yellow-500';

    return (
        <button
            onClick={onClick}
            className="w-full text-left bg-white dark:bg-secondary-800 rounded-lg shadow-md flex items-stretch h-full transition-transform transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-primary-500 ring-offset-2 dark:ring-offset-secondary-900"
        >
            <div className={`w-1.5 ${barColor} rounded-l-lg flex-shrink-0`}></div>
            
            <div className="flex-1 p-3 flex flex-col justify-between min-h-[90px]">
                <div>
                     <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-700 dark:text-gray-200 text-sm font-mono truncate" title={displayId}>{displayId}</p>
                        {hasNotes && (
                            <button
                                onClick={(e) => { e.stopPropagation(); modalHandlers.openTextDisplayModal(`Notatki dla ${displayId}`, allLabNotesText); }}
                                className="text-gray-400 hover:text-primary-500"
                                title="Zobacz notatki"
                            >
                                <ClipboardListIcon className="h-4 w-4" />
                            </button>
                        )}
                        {hasDocuments && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const docs = (isRaw ? (item as RawMaterialLogEntry).palletData.documents : (isFg ? (item as FinishedGoodItem).documents : [])) || [];
                                    modalHandlers.openDocumentListModal(`Dokumenty dla ${displayId}`, docs);
                                }}
                                className="text-gray-400 hover:text-primary-500"
                                title="Zobacz dokumenty"
                            >
                                <DocumentTextIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-tight" title={productName}>{productName}</p>
                </div>
                
                <div className="mt-2">
                    {expiryDate && (
                        <div className="flex justify-end items-baseline gap-1 text-xs">
                            <span className="text-gray-500 dark:text-gray-400">Ważność:</span>
                            <span className={`font-semibold ${getExpiryStatusClass(expiryStatus)}`}>{formatDate(expiryDate)}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-end mt-1">
                        <p className="text-lg sm:text-xl font-extrabold text-primary-700 dark:text-primary-300">{weight.toFixed(0)} kg</p>
                        {isBlocked ? <LockClosedIcon className="h-5 w-5 text-red-500" title={reason || ''}/> : <CheckCircleIcon className="h-5 w-5 text-green-500"/>}
                    </div>
                </div>
            </div>
        </button>
    );
};

export default PalletTile;