
import React, { useState } from 'react';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import Alert from './Alert';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';

export interface ShortageDetail {
    name: string;
    required: number;
    available: number;
    missing: number;
}

interface MaterialShortageModalProps {
  isOpen: boolean;
  onClose: () => void; // This will be the "Cancel" action
  onConfirm: () => void; // This will be the "Continue anyway" action
  shortages: ShortageDetail[];
}

const MaterialShortageModal: React.FC<MaterialShortageModalProps> = ({ isOpen, onClose, onConfirm, shortages }) => {
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const copyToClipboard = () => {
        const text = shortages.map(s => `${s.name}:\tBrak ${s.missing.toFixed(2)} kg`).join('\n');
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handlePrint = () => {
        const printContent = document.getElementById('printable-shortage-list');
        if (printContent) {
            const newWindow = window.open('', '_blank', 'height=600,width=800');
            if (newWindow) {
                newWindow.document.write('<html><head><title>Lista Braków Surowców</title>');
                newWindow.document.write('<style>body { font-family: sans-serif; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } th { background-color: #f2f2f2; }</style>');
                newWindow.document.write('</head><body>');
                newWindow.document.write('<h1>Lista brakujących surowców do zamówienia</h1>');
                newWindow.document.write(printContent.outerHTML);
                newWindow.document.write('</body></html>');
                newWindow.document.close();
                newWindow.print();
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[1060]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                    <h2 className="text-xl font-semibold text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                        <ExclamationTriangleIcon className="h-6 w-6"/>
                        Wykryto Braki Surowców
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    <Alert type="warning" message="Planowanie z brakami" details="Poniższa lista zawiera surowce, których brakuje do zrealizowania zaplanowanej produkcji. Możesz kontynuować (zlecenie zostanie oznaczone jako mające braki i nie będzie mogło być rozpoczęte) lub anulować." />
                    
                    <div id="printable-shortage-list">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Lista materiałów do zamówienia</h3>
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700 text-sm mt-2">
                            <thead className="bg-gray-100 dark:bg-secondary-700">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">Nazwa surowca</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Wymagane (kg)</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Dostępne (kg)</th>
                                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">Brak (kg)</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-secondary-800 divide-y divide-gray-200 dark:divide-secondary-700">
                                {shortages.map(item => (
                                    <tr key={item.name}>
                                        <td className="px-3 py-2 font-medium">{item.name}</td>
                                        <td className="px-3 py-2 text-right">{item.required.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right">{item.available.toFixed(2)}</td>
                                        <td className="px-3 py-2 text-right font-bold text-red-600 dark:text-red-400">{item.missing.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="pt-4 border-t dark:border-secondary-700 flex flex-col sm:flex-row justify-between items-center gap-3 mt-4">
                    <div className="flex gap-2">
                         <Button onClick={copyToClipboard} variant="secondary" leftIcon={copied ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <ClipboardIcon className="h-5 w-5"/>}>
                            {copied ? 'Skopiowano!' : 'Kopiuj listę'}
                        </Button>
                        <Button onClick={handlePrint} variant="secondary" leftIcon={<PrintLabelIcon className="h-5 w-5"/>}>
                            Drukuj
                        </Button>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={onClose} variant="secondary">Anuluj Planowanie</Button>
                        <Button onClick={onConfirm} variant="primary">Kontynuuj Mimo Braków</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaterialShortageModal;
