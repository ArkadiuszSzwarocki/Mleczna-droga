import React, { useState, useEffect, useRef } from 'react';
import { AdjustmentOrder } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import QrCodeIcon from './icons/QrCodeIcon';
import BeakerIcon from './icons/BeakerIcon';
import ArrowRightIcon from './icons/ArrowRightIcon';


interface ConsumeAdjustmentBucketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bucketId: string, orderId: string) => { success: boolean; message: string };
  order: AdjustmentOrder | null;
}

const ConsumeAdjustmentBucketModal: React.FC<ConsumeAdjustmentBucketModalProps> = ({ isOpen, onClose, onConfirm, order }) => {
  const [step, setStep] = useState(1); // 1 for micro-weigh, 2 for bucket
  const [microWeighId, setMicroWeighId] = useState('');
  const [bucketId, setBucketId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const microWeighInputRef = useRef<HTMLInputElement>(null);
  const bucketInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setMicroWeighId('');
      setBucketId('');
      setError(null);
      setTimeout(() => microWeighInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && step === 2) {
      setTimeout(() => bucketInputRef.current?.focus(), 100);
    } else if (isOpen && step === 1) {
      setTimeout(() => microWeighInputRef.current?.focus(), 100);
    }
  }, [isOpen, step]);


  if (!isOpen || !order) return null;

  const handleMicroWeighSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (microWeighId.trim().toUpperCase() === 'MWG01') {
      setStep(2);
    } else {
      setError('Nieprawidłowy skan. Zeskanuj kod QR mikrowagi (oczekiwano: MWG01).');
      setMicroWeighId('');
    }
  };

  const handleBucketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const scannedId = bucketId.trim();
    if (!scannedId) {
      setError('ID pojemnika (wiadra) jest wymagane.');
      return;
    }
    
    if (scannedId !== order.preparationLocation) {
      setError(`Zeskanowano nieprawidłowy pojemnik. Oczekiwano: ${order.preparationLocation}.`);
      setBucketId('');
      return;
    }

    const result = onConfirm(scannedId, order.id);
    if (result.success) {
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[1050]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
            <BeakerIcon className="h-6 w-6" />
            Zużyj Dosypkę z Wiadra
          </h2>
          <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5" /></Button>
        </div>

        {error && <Alert type="error" message={error} />}

        {step === 1 && (
            <form onSubmit={handleMicroWeighSubmit} className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Krok 1 z 2: Zeskanuj kod QR mikrowagi, do której dodajesz zawartość.
                </p>
                <Input
                    ref={microWeighInputRef}
                    label="ID Mikrowagi"
                    id="microweigh-id"
                    value={microWeighId}
                    onChange={e => setMicroWeighId(e.target.value)}
                    required
                    autoFocus
                    icon={<QrCodeIcon className="h-5 w-5 text-gray-400" />}
                    placeholder="MWG01"
                    uppercase
                />
                <div className="flex justify-end pt-2">
                    <Button type="submit" rightIcon={<ArrowRightIcon className="h-5 w-5 ml-2" />}>Dalej</Button>
                </div>
            </form>
        )}
        
        {step === 2 && (
            <form onSubmit={handleBucketSubmit} className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Krok 2 z 2: Potwierdzono mikrowagę <strong>MWG01</strong>. Zeskanuj wiadro <strong className="font-mono">{order.preparationLocation}</strong>.
                </p>
                <Input
                    ref={bucketInputRef}
                    label="ID Wiadra"
                    id="bucket-id-consume"
                    value={bucketId}
                    onChange={e => setBucketId(e.target.value)}
                    required
                    autoFocus
                    icon={<QrCodeIcon className="h-5 w-5 text-gray-400" />}
                    placeholder={order.preparationLocation || "np. 01, 123"}
                />
                <div className="flex justify-between items-center pt-2">
                    <Button type="button" variant="secondary" onClick={() => setStep(1)}>Wróć</Button>
                    <Button type="submit">Zatwierdź Zużycie</Button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default ConsumeAdjustmentBucketModal;