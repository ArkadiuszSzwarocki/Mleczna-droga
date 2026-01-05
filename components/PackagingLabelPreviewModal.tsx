import React, { useEffect, useRef } from 'react';
import { RawMaterialLogEntry } from '../types';
import { formatDate } from '../src/utils';
import { useDynamicScripts } from '../src/useDynamicScript';

declare var JsBarcode: any;
declare var QRCode: any;

const LABEL_SCRIPT_URLS = [
    "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js",
    "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"
];

const PackagingLabelPreviewModal: React.FC<{ data: RawMaterialLogEntry }> = ({ data }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const { palletData } = data;
    const { areLoaded: scriptsLoaded, error: scriptError } = useDynamicScripts(LABEL_SCRIPT_URLS);

    useEffect(() => {
        const displayId = data.id || palletData?.nrPalety;
        if (scriptsLoaded && typeof JsBarcode !== 'undefined' && barcodeRef.current && displayId) {
            try {
                JsBarcode(barcodeRef.current, displayId, { format: "CODE128", displayValue: false, margin: 0, width: 2, height: 50 });
            } catch (e) { console.error("JsBarcode error:", e); }
        }
        if (scriptsLoaded && typeof QRCode !== 'undefined' && qrCodeRef.current && displayId) {
            qrCodeRef.current.innerHTML = '';
            try {
                new QRCode(qrCodeRef.current, { text: JSON.stringify({ id: displayId }), width: 100, height: 100, correctLevel: QRCode.CorrectLevel.H });
            } catch (e) { console.error("QRCode error:", e); }
        }
    }, [palletData, scriptsLoaded]);

    if (!palletData) return null;

    const ilosc = palletData.unitsPerPallet || 'N/A';
    const jednostka = palletData.packageForm === 'packaging_pcs' ? 'szt.' : 'worków';

    const deliveryHistoryEntry = data.locationHistory.find(h => h.action === 'added_new_to_delivery_buffer');
    const deliveryOrderRef = deliveryHistoryEntry?.deliveryOrderRef || 'Brak';
    const deliveryDate = deliveryHistoryEntry?.deliveryDate ? formatDate(deliveryHistoryEntry.deliveryDate) : formatDate(data.dateAdded);

    return (
        <div className="p-2 border-2 border-black bg-white text-black font-sans w-[350px] mx-auto text-sm rounded-lg">
            <h3 className="font-bold text-center text-md">OPAKOWANIE</h3>
            <p className="font-bold text-center text-xl my-2 truncate">{palletData.nazwa}</p>
            
            <div className="flex justify-center my-3 min-h-[50px]">
                 {scriptsLoaded ? <svg ref={barcodeRef}></svg> : <span className="text-xs">Ładowanie...</span>}
            </div>
            <p className="font-mono text-center -mt-2 mb-3">{data.id || palletData.nrPalety}</p>
            
            <p className="font-bold text-center text-2xl my-4">Ilość: {ilosc} {jednostka}</p>
            
             <div className="border border-black p-2 my-2 text-md">
                <div className="grid grid-cols-2 gap-x-2">
                    <span className="font-semibold">Nr WZ / Zam.:</span><span>{deliveryOrderRef}</span>
                    <span className="font-semibold">Data Dostawy:</span><span>{deliveryDate}</span>
                </div>
            </div>

            <div className="flex justify-center mt-4">
                <div ref={qrCodeRef} className="p-1 bg-white min-w-[102px] min-h-[102px] flex items-center justify-center">
                    {!scriptsLoaded && <span className="text-xs">Ładowanie...</span>}
                </div>
            </div>
        </div>
    );
};

export default PackagingLabelPreviewModal;