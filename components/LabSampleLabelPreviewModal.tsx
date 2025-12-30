import React, { useEffect, useRef } from 'react';
import { formatDate } from '../src/utils';
import { useDynamicScripts } from '../src/useDynamicScript';

declare var QRCode: any;

const LABEL_SCRIPT_URLS = ["https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"];

interface LabSampleLabelData {
    taskName: string;
    taskId: string;
    sampleBagNumber: string;
    batchNumber: number;
    collectedAt: string;
    collectedBy: string;
    archiveLocation?: string;
}

const LabSampleLabelPreviewModal: React.FC<{ data: LabSampleLabelData }> = ({ data }) => {
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const { areLoaded: scriptsLoaded } = useDynamicScripts(LABEL_SCRIPT_URLS);

    useEffect(() => {
        if (scriptsLoaded && qrCodeRef.current && data?.sampleBagNumber && typeof QRCode !== 'undefined') {
            qrCodeRef.current.innerHTML = ""; // Clear previous QR
            new QRCode(qrCodeRef.current, {
                text: data.sampleBagNumber,
                width: 100,
                height: 100,
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    }, [data, scriptsLoaded]);
    
    if (!data) return null;

    return (
        <div className="p-2 border-2 border-black bg-white text-black font-sans w-[350px] mx-auto text-[10px] leading-tight">
            <h3 className="font-bold text-center text-md mb-1">PRÓBKA LABORATORYJNA</h3>
            
            <div className="grid grid-cols-[110px_1fr] gap-x-2 border-t border-b border-black py-1">
                <span>DATA:</span><span className="font-bold">{formatDate(data.collectedAt, true)}</span>
                <span className="truncate">NAZWA ZLECENIA:</span><span className="font-bold truncate">{data.taskName}</span>
                <span className="truncate">NR ZLEC. PROD.:</span><span className="font-mono">{data.taskId}</span>
                <span>NR PARTII:</span><span className="font-bold text-lg">{data.batchNumber}</span>
                <span>POBRAŁ:</span><span className="font-bold">{data.collectedBy}</span>
            </div>
            
            <div className="flex justify-between items-center mt-2">
                <div ref={qrCodeRef} className="p-1 bg-white min-w-[102px] min-h-[102px] flex items-center justify-center">
                    {!scriptsLoaded && <span className="text-xs">Ładowanie...</span>}
                </div>
                 <div className="text-center">
                    <p className="font-bold text-lg">NR WORKA:</p>
                    <p className="font-mono font-bold text-3xl tracking-wider">{data.sampleBagNumber}</p>
                    {data.archiveLocation && (
                        <>
                            <p className="font-bold text-md mt-2">ARCHIWUM:</p>
                            <p className="font-mono font-bold text-xl tracking-wider">{data.archiveLocation}</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LabSampleLabelPreviewModal;