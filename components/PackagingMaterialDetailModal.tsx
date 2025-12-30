
import React from 'react';
import { PackagingMaterialLogEntry } from '../types';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import { formatDate, getActionLabel } from '../src/utils';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';

interface PackagingMaterialDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: PackagingMaterialLogEntry | null;
}

const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div className="flex flex-col">
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{value}</span>
    </div>
);

const PackagingMaterialDetailModal: React.FC<PackagingMaterialDetailModalProps> = ({ isOpen, onClose, item }) => {
    if (!isOpen || !item) return null;

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[160] no-print" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="px-6 py-4 border-b dark:border-secondary-700 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                           <ArchiveBoxIcon className="h-6 w-6" />
                           Szczegóły Opakowania
                        </h2>
                        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{item.productName}</p>
                    </div>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-2 -mt-1"><XCircleIcon className="h-6 w-6"/></Button>
                </header>
                
                <div className="flex-grow overflow-y-auto p-6 space-y-4">
                     <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <DetailItem label="ID Pozycji" value={<span className="font-mono">{item.id}</span>} />
                            <DetailItem label="Aktualna Lokalizacja" value={item.currentLocation || 'Brak'} />
                            <DetailItem label="Nr Partii Dostawcy" value={item.batchNumber || 'Brak'} />
                            <DetailItem label="Dostawca" value={item.supplier || 'Brak'} />
                            <DetailItem label="Forma Opakowania" value={item.packageForm || 'Brak'} />
                        </div>
                        <div className="space-y-3">
                             <DetailItem label="Waga Początkowa" value={`${item.initialWeight.toFixed(2)} kg`} />
                             <DetailItem label="Waga Aktualna" value={`${item.currentWeight.toFixed(2)} kg`} />
                             <DetailItem label="Data Przyjęcia" value={formatDate(item.dateAdded)} />
                        </div>
                    </section>
                    <section>
                        <h3 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">Historia Operacji</h3>
                        <div className="max-h-48 overflow-y-auto border dark:border-secondary-700 rounded-md scrollbar-hide">
                            {(!item.locationHistory || item.locationHistory.length === 0) ? (
                                <p className="text-center text-xs italic text-gray-500 dark:text-gray-400 p-4">Brak zarejestrowanej historii operacji.</p>
                            ) : (
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
                                        {[...item.locationHistory].reverse().map((h, i) => (
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
                            )}
                        </div>
                    </section>
                </div>
                
                <footer className="px-6 py-3 bg-gray-50 dark:bg-secondary-900/50 border-t dark:border-secondary-700 flex justify-end">
                    <Button onClick={onClose}>Zamknij</Button>
                </footer>
            </div>
        </div>
    );
};

export default PackagingMaterialDetailModal;
