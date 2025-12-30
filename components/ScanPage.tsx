
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// FIX: Corrected import path for WarehouseContext to be relative.
import { useWarehouseContext } from './contexts/WarehouseContext';
// FIX: Correct import path for types.ts to be relative
import { RawMaterialLogEntry, FinishedGoodItem, PackagingMaterialLogEntry } from '../types';
import { formatDate, normalizeLocationId } from '../src/utils';
import Alert from './Alert';
import Button from './Button';
import Input from './Input';
import QrCodeIcon from './icons/QrCodeIcon';
import CameraIcon from './icons/CameraIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import { logger } from '../utils/logger';

type ScanMode = 'pallet' | 'location';
type ScannedItem = { item: RawMaterialLogEntry | FinishedGoodItem | PackagingMaterialLogEntry, type: 'raw' | 'fg' | 'pkg' };

const ScanPage: React.FC = () => {
    const { findPalletByUniversalId, validatePalletMove, handleUniversalMove } = useWarehouseContext();
    const videoRef = useRef<HTMLVideoElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [scanMode, setScanMode] = useState<ScanMode>('pallet');
    const [scannedItem, setScannedItem] = useState<ScannedItem | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [isCameraVisible, setIsCameraVisible] = useState(false);

    useEffect(() => {
        let stream: MediaStream | null = null;
        const videoElement = videoRef.current;

        const startCamera = async () => {
            if (isCameraVisible && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                    if (videoElement) {
                        videoElement.srcObject = stream;
                    }
                    setCameraError(null);
                } catch (err) {
                    console.error("Camera error:", err);
                    logger.logError(err as Error, 'ScanPage:startCamera');
                    setCameraError("Brak dostępu do kamery. Sprawdź uprawnienia.");
                    setIsCameraVisible(false); // Turn off visibility on error
                }
            } else if (isCameraVisible) {
                setCameraError("Brak wsparcia dla kamery w przeglądarce.");
                setIsCameraVisible(false);
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (videoElement) {
                videoElement.srcObject = null;
            }
        };
    }, [isCameraVisible]);

    const resetScan = useCallback(() => {
        setScanMode('pallet');
        setScannedItem(null);
        setInputValue('');
        setFeedback(null);
        setIsLoading(false);
        inputRef.current?.focus();
    }, []);

    const handleSuccess = (message: string) => {
        setFeedback({ type: 'success', message });
        setTimeout(() => {
            resetScan();
        }, 2000);
    };

    const handleError = (message: string) => {
        setFeedback({ type: 'error', message });
    };

    const handlePalletScanned = useCallback((id: string) => {
        setIsLoading(true);
        setFeedback(null);
        const result = findPalletByUniversalId(id);
        if (result) {
            setScannedItem(result as ScannedItem);
            setScanMode('location');
            setInputValue('');
            setFeedback({ type: 'info', message: `Zeskanowano pozycję: ${id}. Teraz zeskanuj lokalizację docelową.` });
            inputRef.current?.focus();
        } else {
            handleError(`Nie znaleziono pozycji o ID: ${id}`);
            setInputValue('');
        }
        setIsLoading(false);
    }, [findPalletByUniversalId]);

    const handleLocationScanned = useCallback(async (locationId: string) => {
        if (!scannedItem) return;

        setIsLoading(true);
        setFeedback(null);
        
        const normalizedLocationId = normalizeLocationId(locationId);

        await new Promise(resolve => setTimeout(resolve, 300));

        // FIX: Cast scannedItem.item to satisfy TS requirements; context validation should handle runtime checks.
        const validation = validatePalletMove(scannedItem.item as RawMaterialLogEntry | FinishedGoodItem, normalizedLocationId);

        if (validation.isValid) {
            // FIX: Removed incorrect type cast on scannedItem.type to allow 'pkg' to be processed.
            const moveResult = handleUniversalMove(scannedItem.item.id, scannedItem.type, normalizedLocationId);
            if (moveResult.success) {
                handleSuccess(moveResult.message);
            } else {
                handleError(moveResult.message);
            }
        } else {
            handleError(validation.message);
            setInputValue('');
        }
        setIsLoading(false);

    }, [scannedItem, validatePalletMove, handleUniversalMove]);


    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const value = inputValue.trim();
        if (!value) return;

        if (scanMode === 'pallet') {
            handlePalletScanned(value);
        } else {
            handleLocationScanned(value);
        }
    };
    
    const instructions = scanMode === 'pallet' 
        ? "Zeskanuj kod QR palety / opakowania"
        : "Zeskanuj kod QR lokalizacji docelowej";

    const inputLabel = scanMode === 'pallet' 
        ? "ID Pozycji"
        : "ID Lokalizacji";
    
    const scannedItemInfo = useMemo(() => {
        if (!scannedItem) return null;
        const { item, type } = scannedItem;
        if (type === 'raw') {
            const raw = item as RawMaterialLogEntry;
            return { name: raw.palletData.nazwa, id: raw.palletData.nrPalety };
        }
        if (type === 'fg') {
            const fg = item as FinishedGoodItem;
            return { name: fg.productName, id: fg.displayId || fg.id };
        }
        if (type === 'pkg') {
            const pkg = item as PackagingMaterialLogEntry;
            return { name: pkg.productName, id: pkg.id };
        }
        return null;
    }, [scannedItem]);
    
    const formAndInfo = (
        <div className="space-y-4">
            <form onSubmit={handleManualSubmit}>
                <Input
                    ref={inputRef}
                    label={inputLabel}
                    id="manual-scan-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    icon={<QrCodeIcon className="h-5 w-5 text-gray-400" />}
                    disabled={isLoading}
                    autoComplete="off"
                    autoFocus
                    className="text-lg py-3"
                    uppercase={scanMode === 'location'}
                />
                 <Button type="submit" className="w-full justify-center text-lg py-3 mt-3" disabled={isLoading || !inputValue}>
                    {isLoading ? 'Przetwarzanie...' : 'Zatwierdź'}
                </Button>
            </form>

             {feedback && <div className="mt-4"><Alert type={feedback.type} message={feedback.message} /></div>}

            {scannedItem && scannedItemInfo && (
                <div 
                    key={scannedItemInfo.id}
                    className="bg-primary-900/50 border-2 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.2)] p-3 rounded-lg mt-4 animate-fadeIn text-sm transition-all duration-500"
                >
                    <div className="flex justify-between items-start">
                       <div>
                            <p className="font-bold text-primary-300">Zeskanowana Pozycja</p>
                            <p><span className="font-semibold">Produkt:</span> {scannedItemInfo.name}</p>
                            <p><span className="font-semibold">ID:</span> <span className="font-mono">{scannedItemInfo.id}</span></p>
                       </div>
                       <Button onClick={resetScan} variant="secondary" className="p-1.5 text-xs">
                            <ArrowPathIcon className="h-4 w-4 mr-1"/> Anuluj
                       </Button>
                    </div>
                </div>
            )}
        </div>
    );


    return (
        <div className="p-4 md:p-6 bg-secondary-900 text-white h-full flex flex-col items-center justify-center">
            <div className="w-full max-w-md">
                <header className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-primary-300 flex items-center justify-center gap-3">
                        <QrCodeIcon className="h-8 w-8" />
                        Skaner Magazynowy
                    </h2>
                    <p className="text-slate-400 mt-1">{instructions}</p>
                </header>

                {isCameraVisible && (
                    <div className="mb-6 animate-fadeIn">
                        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg border-2 border-secondary-700">
                            <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-3/4 max-w-[200px] h-16 border-2 border-dashed border-sky-400 rounded-lg opacity-70" />
                            </div>
                        </div>
                        <Button variant="secondary" className="w-full text-xs mt-2" onClick={() => setIsCameraVisible(false)}>
                            Wyłącz kamerę
                        </Button>
                    </div>
                )}
                
                {formAndInfo}

                {!isCameraVisible && (
                    <div className="mt-6 text-center">
                        <Button variant="secondary" onClick={() => setIsCameraVisible(true)}>
                            <CameraIcon className="w-5 h-5 mr-2"/>
                            Włącz kamerę
                        </Button>
                    </div>
                )}

                {cameraError && (
                     <div className="mt-4"><Alert type="error" message="Błąd kamery" details={cameraError} /></div>
                )}
            </div>
        </div>
    );
};

export default ScanPage;
