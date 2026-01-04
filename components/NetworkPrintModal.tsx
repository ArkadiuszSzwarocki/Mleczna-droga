
import React, { useState, lazy, Suspense } from 'react';
import Button from './Button';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';
import { normalizePrintServerUrl, formatDate } from '../src/utils';
import { useUIContext } from './contexts/UIContext';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import Input from './Input';
import { PrinterDef } from '../types';

// Import podglądów
import NewLabelPreviewModal from './NewLabelPreviewModal';
import FinishedGoodLabelPreviewModal from './FinishedGoodLabelPreviewModal';
import PackagingLabelPreviewModal from './PackagingLabelPreviewModal';
import RemainderLabelPreviewModal from './RemainderLabelPreviewModal';
import BatchLabelPreviewModal from './BatchLabelPreviewModal';
import LabSampleLabelPreviewModal from './LabSampleLabelPreviewModal';
import MonthLabelPreviewModal from './MonthLabelPreviewModal';

const LoginQrPreview = lazy(() => import('./LoginQrCodeModal'));

interface NetworkPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  labelPayload: {
    type: string;
    data: any;
    context?: string;
    onSuccess?: () => void;
  } | null;
}

export const NetworkPrintModal: React.FC<NetworkPrintModalProps> = ({
  isOpen,
  onClose,
  labelPayload,
}) => {
    const { printServerUrl, printers } = useUIContext();
    const [isPrinting, setIsPrinting] = useState(false);
    // Ustawienie domyślnej liczby kopii na 1
    const [copies, setCopies] = useState(1);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string, details?: React.ReactNode } | null>(null);

    const { type, data, context, onSuccess } = labelPayload || {};
    const itemsToPrint = Array.isArray(data) ? data : (data ? [data] : []);

    // Funkcja generująca ZPL po stronie klienta z obsługą liczby kopii
    const generateZPL = (itemData: any, labelType: string, printQty: number): string => {
        if (labelType === 'login_qr') {
            const qrData = typeof itemData.qrData === 'string' ? itemData.qrData : JSON.stringify(itemData.qrData);
            return `^XA^CI28^FO50,50^BQN,2,6^FDQA,${qrData}^FS^FO50,300^A0N,30,30^FDLogin: ${itemData.username}^FS^PQ${printQty}^XZ`;
        }

        let p = itemData;
        const isPackaging = !!itemData.productName && !itemData.palletData && !itemData.quantityKg;
        
        if (itemData.palletData) {
            p = itemData.palletData;
        }

        const idPalety = p.nrPalety || p.id || p.displayId || p.finishedGoodPalletId || 'Brak ID';
        const nazwa = p.nazwa || p.productName || 'Brak Nazwy';
        const partia = p.batchNumber || p.batchId || '---';
        const uwagi = p.labAnalysisNotes || p.labNotes || '';
        
        let dProdRaw = p.dataProdukcji || p.productionDate || '---';
        const dProd = dProdRaw.includes('T') ? formatDate(dProdRaw) : dProdRaw;
        
        let dWaznRaw = p.dataPrzydatnosci || p.expiryDate || '---';
        const dWazn = dWaznRaw.includes('T') ? formatDate(dWaznRaw) : dWaznRaw;

        const wagaValue = p.currentWeight || p.quantityKg || p.producedWeight || 0;
        const waga = Number(wagaValue).toFixed(0);

        let naglowek = 'JEDNOSTKA';
        if (labelType.includes('raw') || (labelType.includes('batch') && !isPackaging)) naglowek = 'SUROWIEC';
        else if (labelType.includes('finished')) naglowek = 'WYRÓB GOTOWY';
        else if (isPackaging || labelType.includes('packaging')) naglowek = 'OPAKOWANIE';

        return `^XA^CI28
^FO30,30^GB740,540,4^FS
^FO60,60^A0N,30,30^FD${naglowek}^FS
^FO60,100^A0N,40,40^FD${nazwa.substring(0, 28)}^FS
^FO60,160^BY2,3^BCN,100,Y,N,N^FD${idPalety}^FS
^FO60,300^A0N,25,25^FDPARTIA: ${partia}^FS
^FO60,340^A0N,25,25^FDPRODUKCJA: ${dProd}^FS
^FO60,380^A0N,25,25^FDWAZNOSC:   ${dWazn}^FS
${uwagi ? `^FO60,420^A0N,20,20^FB680,2,0,L^FDNOTATKI: ${uwagi.replace(/\n/g, ' ').substring(0, 60)}^FS` : ''}
^FO60,480^A0N,55,55^FDWAGA NETTO: ${waga} kg^FS
^PQ${printQty}
^XZ`;
    };

    const handlePrintClick = async (printer: PrinterDef) => {
        if (!type || itemsToPrint.length === 0) {
            setFeedback({ type: 'error', message: 'Błąd: Brak danych do wydruku.' });
            return;
        }

        setIsPrinting(true);
        setFeedback(null);

        const serverUrl = normalizePrintServerUrl(printServerUrl);
        const printPromises: Promise<any>[] = [];

        try {
            itemsToPrint.forEach((itemData: any, itemIdx: number) => {
                const zplContent = generateZPL(itemData, type, copies);
                printPromises.push(new Promise((resolve, reject) => {
                    setTimeout(async () => {
                        try {
                            const response = await fetch(`${serverUrl}/drukuj-zpl`, {
                                method: 'POST',
                                mode: 'cors',
                                credentials: 'omit',
                                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                                body: JSON.stringify({ ip: printer.ip, drukarka: printer.name, dane: zplContent, typ: 'raw_zpl' }),
                            });
                            if (!response.ok) reject(new Error(`Błąd serwera: ${response.status}`));
                            else resolve(await response.json());
                        } catch (e: any) { reject(e); }
                    }, itemIdx * 300); 
                }));
            });

            const results = await Promise.allSettled(printPromises);
            const failed = results.filter(r => r.status === 'rejected');

            if (failed.length === 0) {
                setFeedback({ type: 'success', message: `Wysłano ${itemsToPrint.length} etykiet do: ${printer.name}.` });
                onSuccess?.();
                setTimeout(onClose, 1500);
            } else {
                setFeedback({ type: 'error', message: 'Błąd połączenia z drukarką.' });
            }
        } catch (error: any) {
            setFeedback({ type: 'error', message: 'Błąd połączenia z serwerem druku.' });
        } finally {
            setIsPrinting(false);
        }
    };

    const renderPreviewItem = (itemData: any, idx: number) => {
        const key = `preview-${idx}`;
        if (type === 'login_qr') return <Suspense fallback={<div>...</div>}><LoginQrPreview qrData={itemData.qrData} username={itemData.username} /></Suspense>;

        // Rozpoznawanie typu wewnątrz wsadu (heterogeneous batch)
        let effectiveType = type;
        if (type === 'raw_material_batch') {
            const isPkg = !!itemData.productName && !itemData.palletData && !itemData.quantityKg;
            if (isPkg) effectiveType = 'packaging';
        }

        switch (effectiveType) {
            case 'raw_material':
            case 'raw_material_batch':
                return <NewLabelPreviewModal key={key} data={itemData} />;
            case 'finished_good':
            case 'finished_good_batch':
                if (context === 'remainder_return') return <RemainderLabelPreviewModal key={key} data={itemData} />;
                return <FinishedGoodLabelPreviewModal key={key} data={itemData} context={context} />;
            case 'packaging':
                // Adapter dla NewLabelPreviewModal jeśli struktura to PackagingMaterialLogEntry
                const previewData = itemData.palletData ? itemData : {
                    id: itemData.id,
                    palletData: {
                        nrPalety: itemData.id,
                        nazwa: itemData.productName,
                        currentWeight: itemData.currentWeight,
                        dataProdukcji: itemData.dateAdded,
                        dataPrzydatnosci: '---',
                        packageForm: itemData.packageForm || 'Opakowanie',
                        unitsPerPallet: itemData.currentWeight
                    },
                    locationHistory: itemData.locationHistory || []
                };
                return <PackagingLabelPreviewModal key={key} data={previewData as any} />;
            case 'lab_sample':
                return <LabSampleLabelPreviewModal key={key} data={itemData} />;
            case 'psd_batch_label':
                return <BatchLabelPreviewModal key={key} data={itemData} />;
            default:
                return <div key={key} className="p-4 italic text-xs text-gray-400">Podgląd niedostępny</div>;
        }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-2 sm:p-4 z-[300]" onClick={onClose}>
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col border dark:border-secondary-600" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center p-4 sm:p-6 border-b dark:border-secondary-700 shrink-0">
            <h2 className="text-xl font-bold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <PrintLabelIcon className="h-6 w-6"/> Centrala Wydruku
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-primary-500 transition-colors"><XCircleIcon className="h-7 w-7"/></button>
          </div>
          <div className="flex-grow overflow-hidden flex flex-col md:flex-row">
              <div className="flex-grow bg-slate-100 dark:bg-secondary-900 p-4 overflow-y-auto scrollbar-hide border-b md:border-b-0 md:border-r dark:border-secondary-700">
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Podgląd etykiet ({itemsToPrint.length})</h3>
                  <div className="flex flex-col items-center gap-6 pb-8">
                      {itemsToPrint.map((item: any, idx: number) => (
                          <div key={idx} className="shadow-2xl bg-white rounded-lg overflow-hidden shrink-0">
                              {renderPreviewItem(item, idx)}
                          </div>
                      ))}
                  </div>
              </div>
              <div className="w-full md:w-80 p-4 sm:p-6 flex flex-col shrink-0 bg-white dark:bg-secondary-800">
                  <div className="mb-6 pb-6 border-b dark:border-secondary-700">
                    <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Opcje wydruku</h3>
                    <Input label="Liczba kopii na jednostkę" id="copies-input" type="number" min="1" max="10" value={String(copies)} onChange={e => setCopies(parseInt(e.target.value, 10) || 1)} />
                  </div>
                  <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Wybierz Drukarkę</h3>
                  {feedback && <div className="mb-6"><Alert type={feedback.type} message={feedback.message} details={feedback.details} /></div>}
                  <div className="space-y-3 overflow-y-auto max-h-[40vh] pr-1">
                      {printers.map(p => (
                          <Button key={p.id} onClick={() => handlePrintClick(p)} disabled={isPrinting || !printServerUrl} className="w-full justify-start h-16 text-sm px-6 font-bold" leftIcon={<PrintLabelIcon className="h-6 w-6" />}>
                              <div className="flex flex-col items-start">
                                  <span>{p.name}</span>
                                  <span className="text-[10px] opacity-60 font-mono">{p.ip}</span>
                              </div>
                          </Button>
                      ))}
                  </div>
              </div>
          </div>
        </div>
      </div>
    );
};

export default NetworkPrintModal;
