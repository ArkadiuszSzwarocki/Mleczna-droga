
import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';
import { useWarehouseContext } from './contexts/WarehouseContext';
import Button from './Button';
import Input from './Input';
import Textarea from './Textarea';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import BuildingOfficeIcon from './icons/BuildingOfficeIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';

interface SupplierDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    supplier: Supplier;
}

const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({ isOpen, onClose, supplier }) => {
    const { handleUpdateSupplier, handleLookupNip } = useWarehouseContext();
    
    const [formData, setFormData] = useState<Supplier>(supplier);
    const [isFetching, setIsFetching] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

    useEffect(() => {
        setFormData(supplier);
        setFeedback(null);
    }, [supplier, isOpen]);

    const handleGusLookup = async () => {
        if (!formData.nip || formData.nip.replace(/\D/g, '').length !== 10) {
            setFeedback({ type: 'error', message: 'Wprowadź poprawny 10-cyfrowy NIP.' });
            return;
        }

        setIsFetching(true);
        setFeedback(null);
        
        try {
            const result = await handleLookupNip(formData.nip);
            if (result.success && result.data) {
                setFormData(prev => ({
                    ...prev,
                    label: result.data!.label || prev.label,
                    address: result.data!.address || prev.address,
                    city: result.data!.city || prev.city,
                    zip: result.data!.zip || prev.zip,
                    nip: result.data!.nip || prev.nip,
                }));
                setFeedback({ type: 'success', message: 'Dane pobrane pomyślnie z bazy GUS.' });
            } else {
                setFeedback({ type: 'error', message: result.message });
            }
        } catch (e) {
            setFeedback({ type: 'error', message: 'Błąd połączenia z bazą danych.' });
        } finally {
            setIsFetching(false);
        }
    };

    const handleSave = () => {
        const result = handleUpdateSupplier(supplier.value, formData);
        if (result.success) {
            setFeedback({ type: 'success', message: 'Zapisano dane kontrahenta.' });
            setTimeout(onClose, 1000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[200]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <header className="px-6 py-4 border-b dark:border-secondary-700 bg-slate-50 dark:bg-secondary-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <BuildingOfficeIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Karta Kontrahenta</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                        <XCircleIcon className="h-6 w-6" />
                    </button>
                </header>

                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {feedback && <Alert type={feedback.type} message={feedback.message} />}

                    {/* Sekcja NIP i GUS */}
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/10 border border-primary-200 dark:border-primary-800 rounded-lg">
                        <h3 className="text-xs font-bold uppercase text-primary-700 dark:text-primary-300 mb-3 tracking-widest">Weryfikacja Podatkowa</h3>
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex-grow w-full">
                                <Input 
                                    label="NIP (bez kresek)" 
                                    value={formData.nip || ''} 
                                    onChange={e => setFormData({...formData, nip: e.target.value})} 
                                    placeholder="np. 5260001222"
                                />
                            </div>
                            <Button 
                                onClick={handleGusLookup} 
                                disabled={isFetching}
                                variant="secondary"
                                className="w-full sm:w-auto h-10 border-primary-300 text-primary-700 hover:bg-primary-100"
                                leftIcon={isFetching ? <ArrowPathIcon className="h-4 w-4 animate-spin"/> : <ShieldCheckIcon className="h-4 w-4"/>}
                            >
                                Pobierz z GUS
                            </Button>
                        </div>
                    </div>

                    {/* Dane Podstawowe */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <Input 
                                label="Pełna nazwa firmy" 
                                value={formData.label} 
                                onChange={e => setFormData({...formData, label: e.target.value})} 
                            />
                        </div>
                        <Input 
                            label="Ulica i numer" 
                            value={formData.address || ''} 
                            onChange={e => setFormData({...formData, address: e.target.value})} 
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr] gap-2">
                            <Input 
                                label="Kod" 
                                value={formData.zip || ''} 
                                onChange={e => setFormData({...formData, zip: e.target.value})} 
                                placeholder="00-000"
                            />
                            <Input 
                                label="Miasto" 
                                value={formData.city || ''} 
                                onChange={e => setFormData({...formData, city: e.target.value})} 
                            />
                        </div>
                    </div>

                    {/* Kontakt */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-secondary-700">
                        <Input 
                            label="Adres E-mail" 
                            type="email" 
                            value={formData.email || ''} 
                            onChange={e => setFormData({...formData, email: e.target.value})} 
                        />
                        <Input 
                            label="Telefon" 
                            value={formData.phone || ''} 
                            onChange={e => setFormData({...formData, phone: e.target.value})} 
                        />
                        <div className="md:col-span-2">
                            <Textarea 
                                label="Notatki o dostawcy" 
                                value={formData.notes || ''} 
                                onChange={e => setFormData({...formData, notes: e.target.value})} 
                                rows={3}
                            />
                        </div>
                    </div>
                </div>

                <footer className="px-6 py-4 border-t dark:border-secondary-700 bg-slate-50 dark:bg-secondary-900/50 flex justify-end gap-3">
                    <Button onClick={onClose} variant="secondary">Anuluj</Button>
                    <Button onClick={handleSave} variant="primary" className="px-8">Zapisz Kartotekę</Button>
                </footer>
            </div>
        </div>
    );
};

export default SupplierDetailModal;
