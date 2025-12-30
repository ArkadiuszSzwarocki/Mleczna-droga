
import React, { useEffect, useRef, useMemo } from 'react';
import { RawMaterialLogEntry } from '../types';
import { formatDate, getExpiryStatus, getExpiryStatusText, getBlockInfo } from '../src/utils';
import { useWarehouseContext } from './contexts/WarehouseContext';
import Alert from './Alert';
import { useDynamicScripts } from '../src/useDynamicScript';

declare var JsBarcode: any;
declare var QRCode: any;

const LABEL_SCRIPT_URLS = [
    "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js",
    "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"
];

const NewLabelPreviewModal: React.FC<{ data: RawMaterialLogEntry }> = ({ data }) => {
    const { expiryWarningDays, expiryCriticalDays } = useWarehouseContext();
    const barcodeRef = useRef<SVGSVGElement>(null);
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const { palletData } = data;
    const { areLoaded: scriptsLoaded, error: scriptError } = useDynamicScripts(LABEL_SCRIPT_URLS);

    const deliveryInfo = useMemo(() => {
        if (!data || !data.locationHistory) return null;
        const deliveryHistoryEntry = data.locationHistory.find(h => h.action === 'added_new_to_delivery_buffer');
        if (!deliveryHistoryEntry) return null;

        return {
            ref: deliveryHistoryEntry.deliveryOrderRef || 'Brak',
            date: deliveryHistoryEntry.deliveryDate ? formatDate(deliveryHistoryEntry.deliveryDate) : formatDate(data.dateAdded),
        };
    }, [data]);

    useEffect(() => {
        if (scriptsLoaded && typeof JsBarcode !== 'undefined' && barcodeRef.current && palletData?.nrPalety) {
            barcodeRef.current.innerHTML = '';
            try {
                JsBarcode(barcodeRef.current, palletData.nrPalety, {
                    format: "CODE128",
                    displayValue: false,
                    margin: 0,
                    width: 2.5,
                    height: 60,
                });
            } catch (e) {
                console.error("JsBarcode error:", e);
            }
        }
        if (scriptsLoaded && typeof QRCode !== 'undefined' && qrCodeRef.current && palletData?.nrPalety) {
            qrCodeRef.current.innerHTML = '';
            const qrData = JSON.stringify({ nrPalety: palletData.nrPalety }).replace(/"/g, '""');
            try {
                new QRCode(qrCodeRef.current, {
                    text: qrData,
                    width: 128,
                    height: 128,
                    correctLevel: QRCode.CorrectLevel.H
                });
            } catch (e) {
                console.error("QRCode error:", e);
            }
        }
    }, [palletData?.nrPalety, scriptsLoaded]);


    if (!palletData) return null;

    const expiryStatus = getExpiryStatus(palletData, expiryWarningDays, expiryCriticalDays);
    const expiryWarningText = expiryStatus !== 'default' ? getExpiryStatusText(expiryStatus) : null;

    let statusElement = null;
    
    if (expiryWarningText) {
        statusElement = (
            <div className="bg-black text-white text-center font-bold p-2 my-2 text-md">
                {expiryWarningText}
            </div>
        );
    }
    
    return (
        <div className="p-1 border-2 border-black bg-white text-black font-sans w-[380px] mx-auto text-sm rounded-lg">
            {expiryStatus === 'expired' && (
                <div className="p-2">
                    <Alert 
                        type="error" 
                        message="UWAGA: PALETA PRZETERMINOWANA!" 
                        details={`Data ważności (${formatDate(palletData.dataPrzydatnosci)}) minęła.`}
                    />
                </div>
            )}
            <div className="p-2">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-md">SUROWIEC</h3>
                    {palletData.deliveryPosition && (
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg shadow-sm">
                            {palletData.deliveryPosition}
                        </div>
                    )}
                </div>
                
                <p className="font-bold text-center text-2xl my-2 leading-tight h-16 flex items-center justify-center">{palletData.nazwa}</p>
                
                <div className="flex justify-center my-2 min-h-[60px]">
                    {scriptsLoaded ? <svg ref={barcodeRef}></svg> : <span className="text-xs">Ładowanie...</span>}
                </div>
                <p className="font-mono text-center text-2xl -mt-2 mb-3">{palletData.nrPalety}</p>
                
                <div className="border border-black p-2 my-2 text-md">
                    <div className="grid grid-cols-2 gap-x-2">
                        <span className="font-semibold">Nr Partii:</span><span>{palletData.batchNumber || 'Brak'}</span>
                        <span className="font-semibold">Data Prod.:</span><span>{formatDate(palletData.dataProdukcji)}</span>
                        <span className="font-semibold">Data Ważn.:</span><span className="font-bold">{formatDate(palletData.dataPrzydatnosci)}</span>
                        <span className="font-semibold">Opakowanie:</span><span>{palletData.packageForm || 'Brak'}</span>
                    </div>
                </div>

                <p className="font-bold text-center text-3xl my-3">Waga: {palletData.currentWeight.toFixed(2)} kg</p>

                {statusElement}
                
                {palletData.labAnalysisNotes && (
                    <div className="border-2 border-black p-2 mt-2 bg-slate-100">
                        <p className="font-bold text-center text-xs uppercase mb-1">Uwagi Laboratorium</p>
                        <p className="text-center font-semibold text-sm leading-tight italic">
                            {palletData.labAnalysisNotes}
                        </p>
                    </div>
                )}

                {deliveryInfo ? (
                <div className="border border-black p-2 my-2 text-md">
                    <div className="grid grid-cols-2 gap-x-2">
                        <span className="font-semibold">Nr WZ / Zam.:</span><span>{deliveryInfo.ref}</span>
                        <span className="font-semibold">Data Dostawy:</span><span>{deliveryInfo.date}</span>
                    </div>
                </div>
                ) : null}

                <div className="flex justify-center mt-4">
                    <div ref={qrCodeRef} className="p-1 bg-white flex-shrink-0 min-w-[130px] min-h-[130px] flex items-center justify-center">
                       {!scriptsLoaded && <span className="text-xs">Ładowanie...</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewLabelPreviewModal;
