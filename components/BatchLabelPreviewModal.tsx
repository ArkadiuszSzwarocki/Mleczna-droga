import React, { useEffect, useRef } from 'react';
import { formatDate } from '../src/utils';
import { useDynamicScripts } from '../src/useDynamicScript';

declare var JsBarcode: any;
declare var QRCode: any;

interface BatchLabelPreviewModalProps {
  data: {
    productName: string;
    displayId: string;
    weight: number;
    productionDate: string;
    expiryDate: string;
    psdTaskId: string;
    psdBatchNumber: number;
  };
}

const LABEL_SCRIPT_URLS = [
    "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js",
    "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"
];

const BatchLabelPreviewModal: React.FC<BatchLabelPreviewModalProps> = ({ data }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const palletId = data.displayId;
    const { areLoaded: scriptsLoaded, error: scriptError } = useDynamicScripts(LABEL_SCRIPT_URLS);

    useEffect(() => {
        if (scriptsLoaded && typeof JsBarcode !== 'undefined' && barcodeRef.current && palletId) {
            try {
                JsBarcode(barcodeRef.current, palletId, {
                    format: "CODE128",
                    displayValue: false,
                    margin: 0,
                    width: 2.5,
                    height: 60,
                });
            } catch(e) { console.error("JsBarcode error:", e); }
        }
        if (scriptsLoaded && typeof QRCode !== 'undefined' && qrCodeRef.current && palletId) {
            qrCodeRef.current.innerHTML = '';
            const qrData = JSON.stringify({ finishedGoodPalletId: palletId });
            try {
                new QRCode(qrCodeRef.current, {
                    text: qrData,
                    width: 128,
                    height: 128,
                    correctLevel: QRCode.CorrectLevel.H
                });
            } catch(e) { console.error("QRCode error:", e); }
        }
    }, [palletId, scriptsLoaded]);

  if (!data) return null;
  const grossWeight = data.weight + 25; // Assume EUR pallet

  return (
    <div className="p-1 border-2 border-black bg-white text-black font-sans w-[380px] mx-auto text-sm">
        <div className="p-2">
            <h3 className="font-bold text-center text-md">WYRÓB GOTOWY (PSD)</h3>
            <p className="font-bold text-center text-2xl my-2 leading-tight h-16 flex items-center justify-center">{data.productName}</p>
            
            <div className="flex justify-center my-2 min-h-[60px]">
                {scriptsLoaded ? <svg ref={barcodeRef}></svg> : <span className="text-xs">Ładowanie...</span>}
            </div>
            <p className="font-mono text-center text-2xl mb-4">{palletId}</p>
            
            <p className="font-bold text-center text-2xl">Waga Netto: {data.weight.toFixed(2)} kg</p>
            <p className="text-center text-md">Waga Brutto: ~{grossWeight.toFixed(2)} kg</p>

            <div className="p-2 my-2 text-md">
                <div className="grid grid-cols-2 gap-x-4">
                    <span className="font-semibold">Data Produkcji:</span><span>{formatDate(data.productionDate, true)}</span>
                    <span className="font-semibold">Data Ważności:</span><span className="font-bold">{formatDate(data.expiryDate)}</span>
                    <span className="font-semibold">Nr Partii:</span><span className="font-bold">{data.psdBatchNumber}</span>
                </div>
            </div>
            
            <div className="flex justify-center mt-4">
                <div ref={qrCodeRef} className="p-1 bg-white min-w-[130px] min-h-[130px] flex items-center justify-center">
                    {!scriptsLoaded && <span className="text-xs">Ładowanie...</span>}
                </div>
            </div>

            <p className="text-center text-xs mt-2">ID Zlecenia: <span className="font-mono">{data.psdTaskId}</span></p>
            <p className="text-center text-xs mt-1">
                {formatDate(data.productionDate, true)}
            </p>
        </div>
    </div>
  );
};

export default BatchLabelPreviewModal;