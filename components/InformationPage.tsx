
import React, { useState, useMemo } from 'react';
import InformationCircleIcon from './icons/InformationCircleIcon';
import SparklesIcon from './icons/SparklesIcon';
import Button from './Button';
import Input from './Input';
import Textarea from './Textarea';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import { View } from '../types';
import { CHANGELOG_DATA } from '../constants';
import PencilIcon from './icons/PencilIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';

interface SystemInfoData {
    systemName: string;
    description: string;
    email: string;
    phone: string;
    hours: string;
    footerText: string;
}

const DEFAULT_SYSTEM_INFO: SystemInfoData = {
    systemName: 'Mleczna Droga MES',
    description: 'Zintegrowany system zarządzania produkcją i magazynem, zaprojektowany w celu optymalizacji przepływu surowców, kontroli jakości oraz wydajności linii produkcyjnych AGRO i PSD.',
    email: 'support@mlecznadroga.pl',
    phone: '+48 123 456 789',
    hours: 'Pn-Pt 8:00 - 16:00',
    footerText: 'Mleczna Droga System. Wszelkie prawa zastrzeżone.'
};

const InfoCard: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="bg-slate-50 dark:bg-secondary-900 p-3 rounded-lg border dark:border-secondary-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold">{label}</p>
        <p className="text-lg font-medium text-gray-800 dark:text-gray-200">{value}</p>
    </div>
);

const InformationPage: React.FC = () => {
    const { handleSetView } = useUIContext();
    const { currentUser } = useAuth();
    
    // State for persistent data
    const [systemInfo, setSystemInfo] = useState<SystemInfoData>(DEFAULT_SYSTEM_INFO);
    
    // Local state for editing
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<SystemInfoData>(systemInfo);

    const latestVersion = CHANGELOG_DATA[0];
    const storageUsage = "0.00 KB"; // localStorage nie jest używany

    const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'boss';

    const handleStartEdit = () => {
        setEditForm(systemInfo);
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditForm(systemInfo);
    };

    const handleSave = () => {
        setSystemInfo(editForm);
        setIsEditing(false);
    };

    const handleChange = (field: keyof SystemInfoData, value: string) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col overflow-y-auto">
             <header className="flex justify-between items-start mb-6 border-b dark:border-secondary-600 pb-3">
                <div className="flex items-center">
                    <InformationCircleIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">O Systemie</h2>
                </div>
                {canEdit && !isEditing && (
                    <Button onClick={handleStartEdit} variant="secondary" leftIcon={<PencilIcon className="h-4 w-4"/>}>
                        Edytuj Treść
                    </Button>
                )}
                {isEditing && (
                    <div className="flex gap-2">
                        <Button onClick={handleCancelEdit} variant="secondary" leftIcon={<XCircleIcon className="h-4 w-4"/>}>
                            Anuluj
                        </Button>
                        <Button onClick={handleSave} variant="primary" leftIcon={<CheckCircleIcon className="h-4 w-4"/>}>
                            Zapisz
                        </Button>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl">
                <section className="space-y-6">
                    <div>
                        {isEditing ? (
                            <div className="space-y-3 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                                <Input 
                                    label="Nazwa Systemu" 
                                    value={editForm.systemName} 
                                    onChange={e => handleChange('systemName', e.target.value)} 
                                />
                                <Textarea 
                                    label="Opis Główny" 
                                    value={editForm.description} 
                                    onChange={e => handleChange('description', e.target.value)} 
                                    rows={4}
                                />
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{systemInfo.systemName}</h3>
                                <p className="text-gray-600 dark:text-gray-400 mt-2">
                                    {systemInfo.description}
                                </p>
                            </>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <InfoCard label="Wersja" value={latestVersion?.version || '1.0.0'} />
                        <InfoCard label="Data Kompilacji" value={latestVersion?.date || 'N/A'} />
                        <InfoCard label="Status Sieci" value={navigator.onLine ? 'Online' : 'Offline'} />
                        <InfoCard label="Pamięć Lokalna" value={storageUsage} />
                    </div>

                    <div className="pt-4 border-t dark:border-secondary-700">
                         <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Kontakt Techniczny</h4>
                         {isEditing ? (
                            <div className="grid grid-cols-1 gap-3 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/10">
                                <Input 
                                    label="Adres Email" 
                                    value={editForm.email} 
                                    onChange={e => handleChange('email', e.target.value)} 
                                />
                                <Input 
                                    label="Telefon" 
                                    value={editForm.phone} 
                                    onChange={e => handleChange('phone', e.target.value)} 
                                />
                                <Input 
                                    label="Godziny pracy" 
                                    value={editForm.hours} 
                                    onChange={e => handleChange('hours', e.target.value)} 
                                />
                            </div>
                         ) : (
                             <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2 bg-slate-50 dark:bg-secondary-900 p-4 rounded-lg">
                                 <li className="flex justify-between">
                                    <span className="font-medium">Email:</span> 
                                    <span>{systemInfo.email}</span>
                                 </li>
                                 <li className="flex justify-between">
                                    <span className="font-medium">Tel:</span> 
                                    <span>{systemInfo.phone}</span>
                                 </li>
                                 <li className="flex justify-between">
                                    <span className="font-medium">Godziny:</span> 
                                    <span>{systemInfo.hours}</span>
                                 </li>
                             </ul>
                         )}
                    </div>
                </section>

                <section className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-secondary-900 dark:to-secondary-800 rounded-xl border-2 border-dashed border-blue-200 dark:border-secondary-600">
                    <SparklesIcon className="h-16 w-16 text-blue-400 mb-4" />
                    <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">Marka i Tożsamość</h3>
                    <p className="text-center text-sm text-blue-800 dark:text-blue-200 mb-6">
                        Zobacz koncepcję wizualną i logotyp systemu Mleczna Droga.
                    </p>
                    <Button onClick={() => handleSetView(View.LogoShowcase)} leftIcon={<SparklesIcon className="h-5 w-5" />}>
                        Zobacz Wizję Logo
                    </Button>
                </section>
            </div>

            <footer className="mt-auto pt-6 text-center text-xs text-gray-400 dark:text-gray-600 border-t dark:border-secondary-700">
                {isEditing ? (
                    <div className="max-w-md mx-auto">
                        <Input 
                            label="Tekst stopki" 
                            value={editForm.footerText} 
                            onChange={e => handleChange('footerText', e.target.value)} 
                        />
                    </div>
                ) : (
                    <span>&copy; {new Date().getFullYear()} {systemInfo.footerText}</span>
                )}
            </footer>
        </div>
    );
};

export default InformationPage;
