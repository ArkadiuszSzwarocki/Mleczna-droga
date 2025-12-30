
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { DEFAULT_SETTINGS } from '../constants';
import { normalizePrintServerUrl, formatDate } from '../src/utils';
import Select from './Select';
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
    
    const [newPrinterName, setNewPrinterName] = useState('');
    const [newPrinterIp, setNewPrinterIp] = useState('');

    const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [printServerStatus, setPrintServerStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [gatewayStatus, setGatewayStatus] = useState<'idle' | 'testing' | 'success' | 'error' | 'no_data'>('idle');
    const [gatewayInfo, setGatewayInfo] = useState<{ lastSync: string | null; uptime: number } | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);

    const testPrintServerConnection = useCallback(async (urlToTestRaw: string) => {
        if (!urlToTestRaw) return;
        setPrintServerStatus('testing');
        const urlToTest = normalizePrintServerUrl(urlToTestRaw);
        try {
            const response = await fetch(`${urlToTest}/status`, { method: 'GET', mode: 'cors', signal: AbortSignal.timeout(3000) });
            setPrintServerStatus(response.ok ? 'success' : 'error');
        } catch (error) {
            setPrintServerStatus('error');
        }
    }, []);

    const testGatewayConnection = useCallback(async (urlToTestRaw: string) => {
        if (!urlToTestRaw) return;
        setGatewayStatus('testing');
        const urlToTest = urlToTestRaw.replace(/\/$/, '');
        try {
            const response = await fetch(`${urlToTest}/status`, {
                method: 'GET',
                mode: 'cors',
                cache: 'no-store',
                signal: AbortSignal.timeout(3000)
            });
            if (response.ok) {
                const data = await response.json();
                setGatewayInfo({ lastSync: data.lastSync, uptime: data.uptime });
                setGatewayStatus(data.dataReady ? 'success' : 'no_data');
            } else {
                setGatewayStatus('error');
            }
        } catch (e) {
            setGatewayStatus('error');
            setGatewayInfo(null);
        }
    }, []);

    const forceSyncToGateway = async () => {
        setIsSyncing(true);
        const url = formState.gatewayServer.replace(/\/$/, '');
        try {
            const response = await fetch(`${url}/api/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productionRuns: productionRunsList,
                    psdTasks: psdTasks,
                    rawMaterials: rawMaterialsLogList,
                    finishedGoods: finishedGoodsList,
                    deliveries: deliveries.filter(d => d.status !== 'COMPLETED'),
                    usersCount: users.length,
                    activeUser: currentUser?.username,
                    systemTime: new Date().toISOString()
                })
            });
            if (response.ok) {
                showToast('Dane przesłane do bramy zarządu.', 'success');
                testGatewayConnection(formState.gatewayServer);
            } else {
                showToast('Brama odrzuciła połączenie.', 'error');
            }
        } catch (err) {
            showToast('Brama danych nie odpowiada pod wskazanym adresem.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        testPrintServerConnection(formState.printServer);
        testGatewayConnection(formState.gatewayServer);
    }, [formState.printServer, formState.gatewayServer, testPrintServerConnection, testGatewayConnection]);

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
                {/* Gateway Monitor Section */}
                <section className="p-6 border rounded-xl bg-slate-50 dark:bg-secondary-900 dark:border-secondary-700 shadow-sm">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-secondary-700">
                        <div className="flex items-center gap-2">
                             <ShareIcon className="h-6 w-6 text-primary-500" />
                             <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Brama Danych Zarządu</h3>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={forceSyncToGateway} variant="secondary" className="text-xs h-8 bg-blue-50 text-blue-700" disabled={isSyncing || gatewayStatus === 'error'}>
                                <ArrowPathIcon className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                                Synchronizuj teraz
                            </Button>
                            <Button onClick={() => testGatewayConnection(formState.gatewayServer)} variant="secondary" className="text-xs h-8">
                                <ArrowPathIcon className={`h-4 w-4 mr-1 ${gatewayStatus === 'testing' ? 'animate-spin' : ''}`} />
                                Odśwież status
                            </Button>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                            <Input 
                                label="Adres serwera bramy (HTTP + Port)" 
                                value={formState.gatewayServer} 
                                onChange={e => setFormState({...formState, gatewayServer: e.target.value})} 
                                disabled={!canEdit}
                                placeholder="http://localhost:3002"
                            />
                            <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg border dark:border-secondary-700 shadow-sm flex items-center justify-between h-11">
                                <div>
                                    {gatewayStatus === 'success' ? (
                                        <div className="flex items-center text-green-600 font-bold gap-2 text-xs">
                                            <CheckCircleIcon className="h-4 w-4" /> BRAMA AKTYWNA
                                        </div>
                                    ) : gatewayStatus === 'no_data' ? (
                                        <div className="flex items-center text-blue-600 font-bold gap-2 text-xs">
                                            <ArrowPathIcon className="h-4 w-4 animate-spin" /> CZEKAM NA DANE
                                        </div>
                                    ) : gatewayStatus === 'error' ? (
                                        <div className="flex items-center text-red-600 font-bold gap-2 text-xs">
                                            <XCircleIcon className="h-4 w-4" /> SERWER OFFLINE
                                        </div>
                                    ) : (
                                        <div className="text-gray-400 text-xs uppercase font-bold tracking-widest">Sprawdzanie...</div>
                                    )}
                                </div>
                                {gatewayInfo?.lastSync && (
                                    <div className="text-[10px] text-gray-500 font-bold">
                                        SYNC: {formatDate(gatewayInfo.lastSync, true, false)}
                                    </div>
                                )}
                            </div>
                        </div>

                        {gatewayStatus === 'no_data' && (
                            <div className="animate-pulse">
                                <Alert type="info" message="Wymagana synchronizacja" details="Serwer bramy (Proxy.js) działa, ale nie posiada danych. Kliknij przycisk 'Synchronizuj teraz', aby zasilić pulpit zarządu danymi." />
                            </div>
                        )}

                        {gatewayStatus === 'error' && (
                            <div className="mt-4">
                                <Alert type="warning" message="Brama danych nie została wykryta" details={`Upewnij się, że serwer Proxy.js jest uruchomiony pod adresem ${formState.gatewayServer}`} />
                            </div>
                        )}
                    </div>
                </section>

                {/* Print Server Section */}
                <section className="p-6 border rounded-xl bg-slate-50 dark:bg-secondary-900 dark:border-secondary-700 shadow-sm">
                    <div className="flex justify-between items-center mb-6 border-b dark:border-secondary-700 pb-2">
                        <div className="flex items-center gap-2">
                             <PrintLabelIcon className="h-6 w-6 text-primary-500" />
                             <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Serwer Wydruku (Bridge)</h3>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                        <Input 
                            label="Adres Mostu HTTPS" 
                            value={formState.printServer} 
                            onChange={e => setFormState({...formState, printServer: e.target.value})} 
                            disabled={!canEdit}
                        />
                        <div className={`h-11 flex items-center px-4 rounded-lg border font-bold text-sm ${
                            printServerStatus === 'success' ? 'bg-green-50 text-green-700 border-green-200' :
                            printServerStatus === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-gray-100 text-gray-400 border-gray-200'
                        }`}>
                            {printServerStatus === 'success' ? <CheckCircleIcon className="h-5 w-5 mr-2" /> : <ShieldCheckIcon className="h-5 w-5 mr-2" />}
                            STATUS: {printServerStatus === 'success' ? 'POŁĄCZONO' : printServerStatus === 'error' ? 'BŁĄD MOSTU' : 'OCZEKIWANIE'}
                        </div>
                    </div>
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
                        <Input label="Timeout monitu blokady (minuty)" type="number" value={formState.promptTimeout} onChange={e => setFormState({...formState, promptTimeout: e.target.value})} disabled={!canEdit} />
                    </div>
                </section>

                {/* Printers Section */}
                <section className="p-6 border rounded-xl bg-slate-50 dark:bg-secondary-900 dark:border-secondary-700 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 border-b dark:border-secondary-700 pb-2">Drukarki Sieciowe</h3>
                    
                    <div className="space-y-4">
                        {canEdit && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end p-4 bg-white dark:bg-secondary-800 rounded-lg border dark:border-secondary-700">
                                <Input label="Nazwa" value={newPrinterName} onChange={e => setNewPrinterName(e.target.value)} placeholder="np. Biuro" />
                                <Input label="Adres IP" value={newPrinterIp} onChange={e => setNewPrinterIp(e.target.value)} placeholder="192.168.1.xxx" />
                                <Button onClick={handleAddPrinter} disabled={!newPrinterName || !newPrinterIp} leftIcon={<PlusIcon className="h-5 w-5"/>}>Dodaj</Button>
                            </div>
                        )}

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
                    </div>
                </section>
            </div>
            
            {canEdit && (
                <div className="mt-12 flex justify-end gap-4 border-t pt-8">
                    <Button onClick={() => window.location.reload()} variant="secondary" className="px-8">Cofnij</Button>
                    <Button onClick={handleSave} variant="primary" className="px-12 py-3 text-lg font-bold shadow-xl">Zapisz ustawienia</Button>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;
