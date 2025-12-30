
import React, { useRef, useEffect, useState } from 'react';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import Alert from './Alert';
import ViewfinderCircleIcon from './icons/ViewfinderCircleIcon';
import { OcrScannerModalProps } from '../types';
import { RawMaterialLogEntry } from '../types';

const OcrScannerModal: React.FC<any> = ({ isOpen, onClose, onScan, rawMaterialsLogList }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      if (isOpen && videoRef.current) {
        setError(null);
        setIsScanning(false);

        // Check for mediaDevices support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError("Twoja przeglądarka nie wspiera dostępu do kamery.");
            return;
        }

        try {
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(playError => {
            console.error("Error playing video stream:", playError);
            setError("Nie można uruchomić podglądu z kamery.");
          });
        } catch (err: any) {
          console.error("Error accessing camera:", err);
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              setError("Odmówiono dostępu do kamery. Sprawdź uprawnienia w ustawieniach przeglądarki.");
          } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
              setError("Nie znaleziono odpowiedniej kamery w Twoim urządzeniu.");
          } else {
              setError(`Nie można uzyskać dostępu do kamery. Błąd: ${err.name}`);
          }
        }
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;
  
  const handleSimulateScan = () => {
    setIsScanning(true);
    setError(null);

    setTimeout(() => {
      const availablePallets = (rawMaterialsLogList || []).filter((p: any) => p.currentLocation !== null);
      if (availablePallets.length === 0) {
        setError("Brak dostępnych palet surowców w magazynie do zasymulowania skanu.");
        setIsScanning(false);
        return;
      }
      
      const randomPallet = availablePallets[Math.floor(Math.random() * availablePallets.length)];
      onScan(randomPallet.id);
      // The parent component (ScanPage) is now responsible for closing the modal via the onScan callback.
    }, 1500); // Simulate 1.5 second scan time
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-[150] no-print"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 text-white rounded-lg shadow-2xl p-4 w-full max-w-lg flex flex-col transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center pb-2 border-b border-slate-600 mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
                <ViewfinderCircleIcon className="h-6 w-6 text-sky-400"/>
                Skaner Tekstu (OCR)
            </h2>
            <Button onClick={onClose} variant="secondary" className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        {error && <Alert type="error" message="Błąd Kamery" details={error} />}

        <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
            <video ref={videoRef} playsInline autoPlay className="w-full h-full object-cover" />
            {!error && <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-1/4 border-4 border-dashed border-sky-400 rounded-lg opacity-70" />
            </div>}
            
            {isScanning && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-4 border-t-sky-400 border-white rounded-full animate-spin"></div>
                    <p className="text-sky-300 font-semibold">Analizowanie obrazu...</p>
                </div>
            )}
            
            {!error && <p className="absolute bottom-2 left-2 text-xs bg-black/50 p-1 rounded">Ustaw etykietę w ramce</p>}
        </div>

        <div className="mt-4 text-center">
            <Button onClick={handleSimulateScan} className="w-full" disabled={isScanning || !!error}>
                {isScanning ? 'Skanowanie...' : 'Zasymuluj Skan'}
            </Button>
        </div>
      </div>
    </div>
  );
};

export default OcrScannerModal;
