
import React, { useState, useEffect, useCallback } from 'react';
import { useAppContext } from './contexts/AppContext';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext';
import { Permission, PrinterDef } from '../types';
import Button from './Button';
import Input from './Input';
import Alert from './Alert';
import CogIcon from './icons/CogIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import ShieldCheckIcon from './icons/ShieldCheckIcon';
import PrintLabelIcon from './icons/PrintLabelIcon';
import TrashIcon from './icons/TrashIcon';
import PlusIcon from './icons/PlusIcon';
import ClockIcon from './icons/ClockIcon';
import ShareIcon from './icons/ShareIcon';
import { DEFAULT_SETTINGS, API_BASE_URL } from '../constants';
import { formatDate } from '../src/utils';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { logger } from '../utils/logger';

interface SettingsState {
    printServer: string;
    gatewayServer: string;
    notificationServer: string;
    expiryWarning: string;
    expiryCritical: string;
    sessionTimeout: string;
    promptTimeout: string;
}

interface DbConfigState {
    host: string;
    port: string;
    user: string;
    pass: string;
    name: string;
}

const SettingsPage: React.FC = () => {
    const { 
        printServerUrl, setPrintServerUrl, 
        gatewayServerUrl, setGatewayServerUrl,
        notificationServerUrl, setNotificationServerUrl,
        printers, setPrinters,
        showToast
    } = useUIContext();
    
    const { 
        expiryWarningDays, setExpiryWarningDays,
        expiryCriticalDays, setExpiryCriticalDays,
        rawMaterialsLogList, finishedGoodsList, deliveries
    } = useWarehouseContext();

    const { productionRunsList, users } = useAppContext();
    const { psdTasks } = useAppContext();
    
    const { 
        checkPermission, currentUser,
        sessionTimeoutMinutes, setSessionTimeoutMinutes,
        promptTimeoutMinutes, setPromptTimeoutMinutes,
    } = useAuth();
    
    const canEdit = checkPermission(Permission.MANAGE_SYSTEM_SETTINGS);

    const [formState, setFormState] = useState<SettingsState>({
        printServer: printServerUrl,
        gatewayServer: gatewayServerUrl,
        notificationServer: notificationServerUrl,
        expiryWarning: String(expiryWarningDays ?? DEFAULT_SETTINGS.EXPIRY_WARNING_DAYS),
        expiryCritical: String(expiryCriticalDays ?? DEFAULT_SETTINGS.EXPIRY_CRITICAL_DAYS),
        sessionTimeout: String(sessionTimeoutMinutes ?? DEFAULT_SETTINGS.SESSION_TIMEOUT_MINUTES),
        promptTimeout: String(promptTimeoutMinutes ?? DEFAULT_SETTINGS.PROMPT_TIMEOUT_MINUTES),
    });

    const [dbForm, setDbForm] = useState<DbConfigState>({
        host: '',
        port: '3307',
        user: 'root',
        pass: '',
        name: 'mleczna_droga'
    });
    
    const [newPrinterName, setNewPrinterName] = useState('');
    const [newPrinterIp, setNewPrinterIp] = useState('');

    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [dbStatus, setDbStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

    // Test połączenia z bazą przez API
    const testDbConnection = useCallback(async () => {
        setDbStatus('testing');
        try {
            const response = await fetch(`${API_BASE_URL}/health`);
            const data = await response.json();
            if (response.ok && data.database === 'connected') {
                setDbStatus('success');
                // Jeśli połączenie działa, możemy zaktualizować pola (ale tylko jeśli są puste)
                if (!dbForm.host) {
                    setDbForm(prev => ({ ...prev, host: data.host || '' }));
                }
            } else {
                setDbStatus('error');
            }
        } catch (error) {
            setDbStatus('error');
        }
    }, [dbForm.host]);

    useEffect(() => {
        testDbConnection();
    }, []);

    const handleSaveDbConfig = async () => {
        setDbStatus('testing');
        try {
            const response = await fetch(`${API_BASE_URL}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    host: dbForm.host,
                    port: dbForm.port,
                    user: dbForm.user,
                    password: dbForm.pass,
                    database: dbForm.name
                })
            });
            const result = await response.json();
            if (result.success) {
                showToast('Konfiguracja bazy danych zaktualizowana i zapisana w .env', 'success');
                testDbConnection();
            } else {
                showToast(result.message, 'error');
                setDbStatus('error');
            }
        } catch (err) {
            showToast('Błąd komunikacji z serwerem backend.', 'error');
            setDbStatus('error');
        }
    };

    const handleSave = () => {
        setPrintServerUrl(formState.printServer);
        setGatewayServerUrl(formState.gatewayServer);
        setNotificationServerUrl(formState.notificationServer);
        setExpiryWarningDays(Number(formState.expiryWarning));
        setExpiryCriticalDays(Number(formState.expiryCritical));
        setSessionTimeoutMinutes(Number(formState.sessionTimeout));
        setPromptTimeoutMinutes(Number(formState.promptTimeout));
        setFeedback({ type: 'success', message: 'Ustawienia zostały zapisane.' });
        logger.log('info', 'Zaktualizowano ustawienia systemowe', 'Settings', currentUser?.username);
    };

    const handleAddPrinter = () => {
        if (!newPrinterName.trim() || !newPrinterIp.trim()) return;
        const newPrinter: PrinterDef = { id: `prn-${Date.now()}`, name: newPrinterName.trim(), ip: newPrinterIp.trim() };
        setPrinters(prev => [...prev, newPrinter]);
        setNewPrinterName('');
        setNewPrinterIp('');
    };

    const handleDeletePrinter = (id: string) => {
        setPrinters(prev => prev.filter(p => p.id !== id));
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg max-w-4xl mx-auto h-full overflow-y-auto scrollbar-hide">
            <header className="flex items-center mb-8 border-b pb-4 dark:border-secondary-600">
                <CogIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">Ustawienia Systemu</h2>
            </header>
            
            <div className="space-y-8">
                {/* MARIA DB / QNAP CONFIGURATION */}
                <section className="p-6 border rounded-xl bg-blue-50 dark:bg-primary-900/10 border-blue-200 dark:border-primary-800 shadow-sm">
                    <div className="flex justify-between items-center mb-6 border-b border-blue-200 dark:border-primary-800 pb-2">
                        <div className="flex items-center gap-2">
                             <ShieldCheckIcon className="h-6 w-6 text-primary-600" />
                             <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Konfiguracja Bazy Danych SQL (QNAP)</h3>
                        </div>
                        <div className={`flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                            dbStatus === 'success' ? 'bg-green-100 text-green-700' :
                            dbStatus === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                            {dbStatus === 'testing' ? 'Testowanie...' : dbStatus === 'success' ? 'Połączono' : 'Rozłączono'}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Adres IP / Host QNAP" value={dbForm.host} onChange={e => setDbForm({...dbForm, host: e.target.value})} disabled={!canEdit} placeholder="192.168.1.XXX" />
                        <Input label="Port MariaDB" value={dbForm.port} onChange={e => setDbForm({...dbForm, port: e.target.value})} disabled={!canEdit} placeholder="3307" />
                        <Input label="Użytkownik Bazy" value={dbForm.user} onChange={e => setDbForm({...dbForm, user: e.target.value})} disabled={!canEdit} />
                        <Input label="Hasło Bazy" type="password" value={dbForm.pass} onChange={e => setDbForm({...dbForm, pass: e.target.value})} disabled={!canEdit} />
                        <Input label="Nazwa Bazy Danych" value={dbForm.name} onChange={e => setDbForm({...dbForm, name: e.target.value})} disabled={!canEdit} />
                        
                        <div className="md:col-span-2 flex justify-end gap-3 mt-2">
                            <Button variant="secondary" onClick={testDbConnection} leftIcon={<ArrowPathIcon className={`h-4 w-4 ${dbStatus === 'testing' ? 'animate-spin' : ''}`} />}>
                                Testuj Połączenie
                            </Button>
                            <Button onClick={handleSaveDbConfig} disabled={!canEdit || !dbForm.host}>
                                Zapisz do .env i Połącz
                            </Button>
                        </div>
                    </div>
                    <p className="mt-4 text-[10px] text-gray-500 italic">Uwaga: Zmiana parametrów bazy danych spowoduje przeładowanie puli połączeń na serwerze API.</p>
                </section>

                {/* Gateway Monitor Section */}
                <section className="p-6 border rounded-xl bg-slate-50 dark:bg-secondary-900 dark:border-secondary-700 shadow-sm">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-secondary-700">
                        <div className="flex items-center gap-2">
                             <ShareIcon className="h-6 w-6 text-primary-500" />
                             <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Brama Danych Zarządu</h3>
                        </div>
                    </div>
                    <Input label="Adres serwera bramy" value={formState.gatewayServer} onChange={e => setFormState({...formState, gatewayServer: e.target.value})} disabled={!canEdit} placeholder="http://localhost:3002" />
                </section>

                {/* Parameters Section */}
                <section className="p-6 border rounded-xl bg-slate-50 dark:bg-secondary-900 dark:border-secondary-700 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 border-b dark:border-secondary-700 pb-2 flex items-center gap-2">
                        <ClockIcon className="h-6 w-6 text-blue-500" />
                        Parametry Systemowe
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Alert: Krótki termin (dni)" type="number" value={formState.expiryWarning} onChange={e => setFormState({...formState, expiryWarning: e.target.value})} disabled={!canEdit} />
                        <Input label="Alert: Termin krytyczny (dni)" type="number" value={formState.expiryCritical} onChange={e => setFormState({...formState, expiryCritical: e.target.value})} disabled={!canEdit} />
                        <Input label="Timeout sesji (minuty)" type="number" value={formState.sessionTimeout} onChange={e => setFormState({...formState, sessionTimeout: e.target.value})} disabled={!canEdit} />
                    </div>
                </section>

                {/* Printers Section */}
                <section className="p-6 border rounded-xl bg-slate-50 dark:bg-secondary-900 dark:border-secondary-700 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 border-b dark:border-secondary-700 pb-2">Drukarki Sieciowe</h3>
                    <div className="overflow-hidden border dark:border-secondary-700 rounded-lg bg-white dark:bg-secondary-800">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-secondary-700">
                            <thead className="bg-gray-50 dark:bg-secondary-700">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Lokalizacja</th>
                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">Adres IP</th>
                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Akcje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-secondary-700">
                                {printers.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-secondary-700">
                                        <td className="px-4 py-2 text-sm font-bold text-gray-800 dark:text-gray-200">{p.name}</td>
                                        <td className="px-4 py-2 text-sm font-mono text-gray-600 dark:text-gray-400">{p.ip}</td>
                                        <td className="px-4 py-2 text-right">
                                            {canEdit && (
                                                <Button onClick={() => handleDeletePrinter(p.id)} variant="secondary" className="p-1.5 text-red-500 hover:bg-red-50">
                                                    <TrashIcon className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
            
            {canEdit && (
                <div className="mt-12 flex justify-end gap-4 border-t pt-8">
                    <Button onClick={handleSave} variant="primary" className="px-12 py-3 text-lg font-bold shadow-xl">Zapisz Ustawienia Systemowe</Button>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
