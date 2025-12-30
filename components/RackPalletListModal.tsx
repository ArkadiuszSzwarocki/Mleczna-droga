
import React, { useState } from 'react';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import { formatDate, getBlockInfo, getExpiryStatus, getExpiryStatusClass } from '../src/utils';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ClipboardIcon from './icons/ClipboardIcon';

const RackPalletListModal: React.FC<any> = ({ isOpen, onClose, pallets, rackName, onPalletClick, onGenerateLabelForPallet, expiringPalletsDetails, expiryWarningDays, expiryCriticalDays }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]">
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                    <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-300">Lista palet: {rackName}</h3>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>
                <div className="overflow-y-auto pr-2">
                    {(pallets || []).length > 0 ? (
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr>
                                    <th className="text-left p-2">Lokalizacja</th>
                                    <th className="text-left p-2">Produkt</th>
                                    <th className="text-left p-2">ID Palety</th>
                                    <th className="text-center p-2">Status</th>
                                    <th className="text-left p-2">Waga</th>
                                    <th className="text-left p-2">Ważność</th>
                                </tr>
                            </thead>
                            <tbody>
                            {(pallets || []).map((p: any) => {
                                if (!p || !p.palletData) {
                                    console.warn("RackPalletListModal: Skipping pallet in list rendering due to missing data.", p);
                                    return null;
                                }
                                const { isBlocked, type, reason } = getBlockInfo(p);
                                const status = getExpiryStatus(p.palletData, expiryWarningDays, expiryCriticalDays);
                                const statusClass = getExpiryStatusClass(status);
                                return (
                                <tr key={p.id} onClick={() => onPalletClick(p)} className={`cursor-pointer hover:bg-gray-100 dark:hover:bg-secondary-700 ${isBlocked ? 'bg-red-50 dark:bg-red-900/40' : ''}`}>
                                    <td className="p-2 font-mono">{p.currentLocation}</td>
                                    <td className="p-2">{p.palletData.nazwa}</td>
                                    <td className="p-2 font-mono">
                                        <div className="flex items-center gap-2 group">
                                            <span>{p.palletData.nrPalety}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(p.palletData.nrPalety);
                                                    setCopiedId(p.palletData.nrPalety);
                                                    setTimeout(() => setCopiedId(null), 2000);
                                                }}
                                                title={copiedId === p.palletData.nrPalety ? "Skopiowano!" : "Kopiuj ID"}
                                                className="p-1 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                            >
                                                {copiedId === p.palletData.nrPalety ? (
                                                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                                ) : (
                                                    <ClipboardIcon className="h-4 w-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="p-2">
                                        {isBlocked ? (
                                            <div className="flex items-center justify-center" title={reason}>
                                                <span className="flex items-center justify-center h-6 min-w-[1.5rem] px-2 rounded-full bg-red-500 text-white text-xs font-bold border-2 border-white dark:border-secondary-800 shadow">
                                                    {type}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center text-green-700 dark:text-green-400" title="Dostępna">
                                                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-green-500 text-white text-xs font-bold border-2 border-white dark:border-secondary-800 shadow">
                                                    <CheckCircleIcon className="h-4 w-4" />
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2">{p.palletData.currentWeight} kg</td>
                                    <td className={`p-2 ${statusClass}`}>{formatDate(p.palletData.dataPrzydatnosci)}</td>
                                </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    ) : <p className="italic text-gray-500 dark:text-gray-400">Brak palet w tej lokalizacji.</p>}
                </div>
            </div>
        </div>
    );
};

export default RackPalletListModal;
