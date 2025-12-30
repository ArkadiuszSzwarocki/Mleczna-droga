
import React from 'react';
import { PsdBatch, AdjustmentOrder } from '../types';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ClockIcon from './icons/ClockIcon';
import XCircleIcon from './icons/XCircleIcon';
import BeakerIcon from './icons/BeakerIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import AdjustmentsHorizontalIcon from './icons/AdjustmentsHorizontalIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';

interface ProductionStatusBarProps {
    batch: PsdBatch | null;
    adjustment?: AdjustmentOrder | null;
    isWeighingFinished: boolean;
}

const StatusItem: React.FC<{ 
    label: string, 
    value: string, 
    status: 'pending' | 'progress' | 'ok' | 'error',
    icon: React.ReactNode 
}> = ({ label, value, status, icon }) => {
    const colors = {
        pending: 'text-gray-400 border-gray-200 dark:border-secondary-700',
        progress: 'text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 animate-pulse',
        ok: 'text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800',
        error: 'text-red-600 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800',
    };

    return (
        <div className={`flex-1 border-r last:border-r-0 px-4 py-2 flex items-center gap-3 transition-all ${colors[status]}`}>
            <div className="flex-shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</p>
                <p className="text-sm font-bold truncate uppercase">{value}</p>
            </div>
            <div className="ml-auto">
                {status === 'ok' && <CheckCircleIcon className="h-5 w-5" />}
                {status === 'progress' && <ArrowPathIcon className="h-5 w-5 animate-spin" />}
                {status === 'error' && <XCircleIcon className="h-5 w-5" />}
                {status === 'pending' && <ClockIcon className="h-5 w-5" />}
            </div>
        </div>
    );
};

const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-11.664 0l3.181-3.183a8.25 8.25 0 00-11.664 0l3.181 3.183" />
    </svg>
);

const ProductionStatusBar: React.FC<ProductionStatusBarProps> = ({ batch, adjustment, isWeighingFinished }) => {
    if (!batch) return null;

    const nirs = batch.confirmationStatus?.nirs || 'pending';
    const sampling = batch.confirmationStatus?.sampling || 'pending';

    // 1. Status MES
    let mesStatus: 'pending' | 'progress' | 'ok' | 'error' = 'pending';
    let mesLabel = 'Oczekiwanie';
    if (!isWeighingFinished) {
        mesStatus = 'progress';
        mesLabel = 'Naważanie';
    } else if (nirs === 'ok' && sampling === 'ok') {
        mesStatus = 'ok';
        mesLabel = 'Gotowe';
    } else if (nirs === 'nok') {
        mesStatus = 'error';
        mesLabel = 'Błąd Jakości';
    } else {
        mesStatus = 'progress';
        mesLabel = 'Kontrola Lab';
    }

    // 2. Status NIRS
    let nirsStatus: 'pending' | 'progress' | 'ok' | 'error' = 'pending';
    let nirsLabel = 'Oczekuje';
    if (nirs === 'ok') {
        nirsStatus = 'ok';
        nirsLabel = 'Zatwierdzony';
    } else if (nirs === 'nok') {
        nirsStatus = 'error';
        nirsLabel = 'Odrzucony';
    } else if (isWeighingFinished) {
        nirsStatus = 'progress';
        nirsLabel = 'W trakcie badania';
    }

    // 3. Status Dosypki
    let adjStatus: 'pending' | 'progress' | 'ok' | 'error' = 'pending';
    let adjLabel = 'Brak';
    if (adjustment) {
        const pickedTotal = adjustment.materials.reduce((sum, m) => sum + m.pickedQuantityKg, 0);
        const requiredTotal = adjustment.materials.reduce((sum, m) => sum + m.quantityKg, 0);
        
        if (adjustment.status === 'completed') {
            adjStatus = 'ok';
            adjLabel = 'Wykonana';
        } else if (adjustment.status === 'processing') {
            adjStatus = 'progress';
            adjLabel = `Wiadro: ${adjustment.preparationLocation}`;
        } else if (adjustment.status === 'material_picking') {
            adjStatus = 'progress';
            adjLabel = `Naważanie: ${pickedTotal.toFixed(1)}/${requiredTotal.toFixed(0)}kg`;
        } else {
            adjStatus = 'error';
            adjLabel = 'Zaplanowana';
        }
    } else if (nirs === 'nok') {
        adjStatus = 'error';
        adjLabel = 'Wymagana!';
    }

    // 4. Status Próbki
    let sampStatus: 'pending' | 'progress' | 'ok' | 'error' = 'pending';
    let sampLabel = 'Niepobrana';
    if (sampling === 'ok') {
        sampStatus = 'ok';
        sampLabel = 'Pobrana';
    } else if (isWeighingFinished) {
        sampStatus = 'progress';
        sampLabel = 'Pobierz próbkę';
    }

    return (
        <div className="flex bg-white dark:bg-secondary-800 border-t-2 dark:border-secondary-700 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] z-30">
            <StatusItem 
                label="Status MES" 
                value={mesLabel} 
                status={mesStatus} 
                icon={<ShieldCheckIcon className="h-6 w-6" />} 
            />
            <StatusItem 
                label="Analiza NIRS" 
                value={nirsLabel} 
                status={nirsStatus} 
                icon={<BeakerIcon className="h-6 w-6" />} 
            />
            <StatusItem 
                label="Korekta / Dosypka" 
                value={adjLabel} 
                status={adjStatus} 
                icon={<AdjustmentsHorizontalIcon className="h-6 w-6" />} 
            />
            <StatusItem 
                label="Próbka Archiwalna" 
                value={sampLabel} 
                status={sampStatus} 
                icon={<ArchiveBoxIcon className="h-6 w-6" />} 
            />
        </div>
    );
};

export default ProductionStatusBar;
