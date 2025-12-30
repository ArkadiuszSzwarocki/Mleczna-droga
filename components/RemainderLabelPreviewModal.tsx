import React, { useEffect, useRef } from 'react';
import { FinishedGoodItem } from '../types';
import { formatDate } from '../src/utils';
import { useDynamicScripts } from '../src/useDynamicScript';

declare var JsBarcode: any;
declare var QRCode: any;

const LABEL_SCRIPT_URLS = [
    "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js",
    "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"
];

const RemainderLabelPreviewModal: React.FC<{ data: FinishedGoodItem }> = ({ data }) => {
    if (!data) return null;
    
    const barcodeRef = useRef<SVGSVGElement>(null);
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const palletId = data.finishedGoodPalletId || data.id;
    const { areLoaded: scriptsLoaded } = useDynamicScripts(LABEL_SCRIPT_URLS);

    useEffect(() => {
        const qrData = JSON.stringify(data.sourceComposition?.map(c => ({ p: c.productName, w: c.weight.toFixed(3), s: c.sourcePalletId })) || []);

        if (scriptsLoaded && typeof JsBarcode !== 'undefined' && barcodeRef.current && palletId) {
            barcodeRef.current.innerHTML = '';
            try {
                JsBarcode(barcodeRef.current, palletId, { format: "CODE128", displayValue: false, margin: 0, width: 2, height: 50 });
            } catch (e) { console.error("JsBarcode error:", e); }
        }
        if (scriptsLoaded && typeof QRCode !== 'undefined' && qrCodeRef.current && palletId) {
            qrCodeRef.current.innerHTML = '';
            try {
                new QRCode(qrCodeRef.current, { text: qrData, width: 100, height: 100, correctLevel: QRCode.CorrectLevel.M });
            } catch(e) { console.error("QRCode error:", e); }
        }
    }, [palletId, data.sourceComposition, scriptsLoaded]);

    return (
        <div className="p-1 border-2 border-black bg-white text-black font-sans w-[380px] mx-auto text-sm">
            <div className="p-2">
                <h3 className="font-bold text-center text-md">RESZTKA PRODUKCYJNA</h3>
                <p className="font-bold text-center text-xl my-1 leading-tight">{data.productName}</p>
                
                <div className="flex justify-center my-2 min-h-[50px]">
                    {scriptsLoaded ? <svg ref={barcodeRef}></svg> : <span className="text-xs">Ładowanie...</span>}
                </div>
                <p className="font-mono text-center text-xl mb-2">{palletId}</p>

                <p className="font-bold text-center text-2xl">Waga Netto: {data.quantityKg.toFixed(2)} kg</p>
                
                <div className="p-2 my-2 text-md">
                    <div className="grid grid-cols-2 gap-x-4">
                        <span className="font-semibold">Data Zwrotu:</span><span>{formatDate(data.productionDate, true)}</span>
                        <span className="font-semibold">Data Ważności:</span><span className="font-bold">{formatDate(data.expiryDate)}</span>
                    </div>
                </div>

                {data.sourceComposition && data.sourceComposition.length > 0 && (
                    <div className="border border-black p-1 my-2 text-[9px] leading-tight">
                        <p className="font-bold text-center">SKŁAD SUROWCOWY (szacunkowy)</p>
                        <div className="mt-1 max-h-24 overflow-y-auto">
                            {data.sourceComposition.map((comp, index) => (
                                <div key={index} className="grid grid-cols-[1fr_auto_auto] gap-x-2">
                                    <span className="truncate">{comp.productName}</span>
                                    <span className="font-mono text-right">{comp.weight.toFixed(3)} kg</span>
                                    <span className="font-mono text-gray-500 truncate">(z {comp.sourcePalletId})</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="flex justify-center mt-2">
                    <div ref={qrCodeRef} className="p-1 bg-white min-w-[102px] min-h-[102px] flex items-center justify-center">
                       {!scriptsLoaded && <span className="text-xs">Ładowanie...</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RemainderLabelPreviewModal;
