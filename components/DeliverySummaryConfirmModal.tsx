
import React, { useMemo } from 'react';
import { Delivery, RawMaterialLogEntry } from '../types';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import TruckIcon from './icons/TruckIcon';
import { formatDate } from '../src/utils';
import InformationCircleIcon from './icons/InformationCircleIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';
import { useUIContext } from './contexts/UIContext';
import { useWarehouseContext } from './contexts/WarehouseContext';
import ClockIcon from './icons/ClockIcon';

interface DeliverySummaryConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  delivery: Delivery | null;
}

const DeliverySummaryConfirmModal: React.FC<DeliverySummaryConfirmModalProps> = ({ isOpen, onClose, onConfirm, delivery }) => {
    const { modalHandlers, showToast } = useUIContext();
    const { rawMaterialsLogList } = useWarehouseContext();

    if (!isOpen || !delivery) return null;

    const getButtonText = () => {
        if (delivery.status === 'REGISTRATION') {
            return delivery.requiresLab ? 'Zatwierdź i Przekaż do Laboratorium' : 'Zakończ Przyjęcie i Drukuj Etykiety';
        }
        if (delivery.status === 'PENDING_LAB') return 'Zatwierdź i Przekaż do Magazynu';
        if (delivery.status === 'PENDING_WAREHOUSE') return 'Zatwierdź i Drukuj Etykiety';
        return 'Zatwierdź Podsumowanie';
    };

    const getStatusLabel = () => {
        switch(delivery.status) {
            case 'REGISTRATION': return 'Rejestracja';
            case 'PENDING_LAB': return 'Oczekuje na Laboratorium';
            case 'PENDING_WAREHOUSE': return 'Przekazywanie do Magazynu';
            case 'COMPLETED': return 'Zakończona';
            case 'ARCHIVED': return 'Zarchiwizowana';
            default: return delivery.status;
        }
    };

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const stats = useMemo(() => {
        const totalWeight = delivery.items.reduce((sum, item) => sum + (item.netWeight || 0), 0);
        return { totalWeight };
    }, [delivery.items]);

    const handlePrintSinglePallet = (item: any) => {
        // Próbujemy znaleźć wygenerowaną już paletę w magazynie dla tego przedmiotu
        const existingPallet = rawMaterialsLogList.find(p => 
            p.palletData.batchNumber === item.batchNumber && 
            p.palletData.nazwa === item.productName &&
            p.locationHistory.some(h => h.deliveryOrderRef === delivery.orderRef)
        );

        if (existingPallet) {
            modalHandlers.openNetworkPrintModal({
                type: 'raw_material',
                data: existingPallet,
                context: 'reprint'
            });
        } else {
            // Jeśli nie znaleziono palety (np. przed finalnym zapisem), tworzymy tymczasowy obiekt do wydruku
            const tempPallet = {
                id: item.id,
                palletData: {
                    nrPalety: item.id,
                    nazwa: item.productName,
                    batchNumber: item.batchNumber,
                    currentWeight: item.netWeight || 0,
                    dataProdukcji: item.productionDate,
                    dataPrzydatnosci: item.expiryDate,
                    packageForm: item.packageForm,
                    labAnalysisNotes: item.labNotes,
                    deliveryPosition: item.position
                },
                locationHistory: [{
                    deliveryOrderRef: delivery.orderRef,
                    deliveryDate: delivery.deliveryDate,
                    action: 'added_new_to_delivery_buffer'
                }]
            };
            modalHandlers.openNetworkPrintModal({
                type: 'raw_material',
                data: tempPallet,
                context: 'preview'
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[250]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-fadeIn" onClick={e => e.stopPropagation()}>
                
                <header className="px-6 py-4 border-b dark:border-secondary-700 bg-slate-50 dark:bg-secondary-900/50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                            <TruckIcon className="h-6 w-6 text-primary-600 dark:text-primary-400"/>
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tighter text-primary-700 dark:text-primary-300">Szczegóły i Podsumowanie Dostawy</h2>
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Status: {getStatusLabel()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><XCircleIcon className="h-7 w-7"/></button>
                </header>

                <div className="flex-grow overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-secondary-900 rounded-xl border-2 border-slate-200 dark:border-secondary-700 shadow-inner">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase">Nr Zam./WZ</p>
                            <p className="font-mono font-bold text-primary-600">{delivery.orderRef}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase">Dostawca</p>
                            <p className="font-bold text-gray-800 dark:text-gray-200">{delivery.supplier}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase">Data dostawy</p>
                            <p className="font-bold text-gray-800 dark:text-gray-200">{formatDate(delivery.deliveryDate)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase">Magazyn Docelowy</p>
                            <p className="font-bold text-gray-800 dark:text-gray-200">{delivery.destinationWarehouse}</p>
                        </div>
                    </div>

                    <div className="border dark:border-secondary-700 rounded-xl overflow-hidden shadow-sm">
                        <table className="min-w-full text-xs text-left">
                            <thead className="bg-gray-100 dark:bg-secondary-700 text-gray-500 dark:text-gray-300 uppercase font-black tracking-widest">
                                <tr>
                                    <th className="px-4 py-3 w-12">#</th>
                                    <th className="px-4 py-3">Produkt / Partia</th>
                                    <th className="px-4 py-3">Forma</th>
                                    <th className="px-4 py-3">Produkcja / Ważność</th>
                                    <th className="px-4 py-3">Wyniki Badań</th>
                                    <th className="px-4 py-3 text-right">Ilość</th>
                                    <th className="px-4 py-3 text-center">Druk</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-secondary-700 bg-white dark:bg-secondary-800">
                                {delivery.items.map((item, index) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-secondary-700/50 transition-colors">
                                        <td className="px-4 py-3 font-bold text-gray-400">{(index + 1).toString().padStart(2, '0')}</td>
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-gray-800 dark:text-gray-200">{item.productName}</p>
                                            <p className="font-mono text-[10px] text-primary-600 dark:text-primary-400 uppercase font-bold">Partia: {item.batchNumber}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase w-fit ${item.packageForm === 'big_bag' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {item.packageForm === 'packaging' ? 'Opakowanie' : item.packageForm === 'bags' ? 'Worki' : item.packageForm?.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-600 dark:text-gray-400">P: {formatDate(item.productionDate)}</p>
                                            <p className="font-bold text-gray-800 dark:text-gray-200">W: {formatDate(item.expiryDate)}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            {item.analysisResults && item.analysisResults.length > 0 ? (
                                                <span className="text-green-600 font-bold">Zarejestrowano ({item.analysisResults.length})</span>
                                            ) : (
                                                <span className="text-gray-300 italic">Brak badań</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm font-black text-primary-700 dark:text-primary-300">{item.netWeight?.toFixed(2)}</span>
                                            <span className="ml-1 text-[10px] font-bold text-gray-400 uppercase">{item.unit || 'KG'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button 
                                                onClick={() => handlePrintSinglePallet(item)}
                                                className="p-2 bg-slate-100 hover:bg-primary-100 text-gray-500 hover:text-primary-600 rounded-lg transition-colors shadow-sm"
                                                title="Drukuj etykietę dla tej palety"
                                            >
                                                <PrintLabelIcon className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 dark:bg-secondary-900 font-black">
                                <tr>
                                    <td colSpan={5} className="px-4 py-4 text-right uppercase tracking-widest text-gray-500">Suma dostawy:</td>
                                    <td className="px-4 py-4 text-right text-lg text-primary-700 dark:text-primary-300">
                                        {stats.totalWeight.toFixed(2)} <span className="text-xs uppercase">kg</span>
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* HISTORIA ZDARZEŃ DOSTAWY */}
                    <section className="bg-slate-50 dark:bg-secondary-900/40 p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-secondary-700">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <ClockIcon className="h-4 w-4" /> Historia i Logi Dostawy
                        </h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                            {(!delivery.eventLog || delivery.eventLog.length === 0) ? (
                                <p className="text-xs italic text-gray-400 text-center py-4">Brak zarejestrowanych zdarzeń w historii.</p>
                            ) : (
                                [...delivery.eventLog].reverse().map((event, idx) => (
                                    <div key={idx} className="flex gap-3 text-xs bg-white dark:bg-secondary-800 p-2 rounded border border-black/5 shadow-sm">
                                        <div className="flex-shrink-0 font-mono text-gray-400 font-bold w-32 border-r pr-2">
                                            {formatDate(event.timestamp, true)}
                                        </div>
                                        <div className="flex-grow">
                                            <p className="font-black text-primary-600 uppercase tracking-tighter">{event.action}</p>
                                            <p className="text-gray-700 dark:text-gray-300">{event.details}</p>
                                            <p className="text-[10px] text-gray-400 font-bold mt-1">Użytkownik: {event.user}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
                
                <footer className="px-6 py-4 border-t dark:border-secondary-700 bg-slate-50 dark:bg-secondary-900/50 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
                        <InformationCircleIcon className="h-4 w-4 text-blue-500" />
                        <span>Pozycje: {delivery.items.length} | Weryfikacja etapu</span>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button onClick={onClose} variant="secondary" className="flex-1 sm:flex-none h-12 px-8 font-black uppercase tracking-tighter">Zamknij</Button>
                        <Button onClick={handleConfirm} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 h-12 px-10 font-black uppercase tracking-tighter shadow-xl shadow-green-500/20">{getButtonText()}</Button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default DeliverySummaryConfirmModal;
