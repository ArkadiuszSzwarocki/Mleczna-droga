
import React, { useState, useEffect } from 'react';
import { logger, LogEntry } from '../utils/logger';
import { formatDate } from '../src/utils';
import Button from './Button';
import Alert from './Alert';
import ListBulletIcon from './icons/ListBulletIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import TrashIcon from './icons/TrashIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import InformationCircleIcon from './icons/InformationCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import UserIcon from './icons/UserIcon';
import ClockIcon from './icons/ClockIcon';

const LogLevelIndicator: React.FC<{ level: LogEntry['level'] }> = ({ level }) => {
    switch (level) {
        case 'error':
            return <div className="flex-shrink-0"><XCircleIcon className="h-5 w-5 text-red-500" /></div>;
        case 'critical':
            return <div className="flex-shrink-0"><XCircleIcon className="h-6 w-6 text-red-700 animate-pulse" /></div>;
        case 'warn':
            return <div className="flex-shrink-0"><ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" /></div>;
        case 'info':
            return <div className="flex-shrink-0"><InformationCircleIcon className="h-5 w-5 text-blue-500" /></div>;
        default:
            return null;
    }
};

const AppLogsView: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const fetchLogs = () => {
        setLogs(logger.getLogs());
    };

    useEffect(() => {
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleClearLogs = () => {
        logger.clearLogs();
        fetchLogs();
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
            <header className="flex-shrink-0 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b dark:border-secondary-600 pb-3 gap-3">
                <div className="flex items-center">
                    <ListBulletIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Diagnostyka i Logi</h2>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={fetchLogs} variant="secondary" leftIcon={<ArrowPathIcon className="h-5 w-5"/>}>
                        Odśwież
                    </Button>
                    <Button onClick={handleClearLogs} variant="danger" leftIcon={<TrashIcon className="h-5 w-5"/>}>
                        Wyczyść
                    </Button>
                </div>
            </header>

            <Alert type="info" message="Monitoring Systemu" details="Zdarzenia techniczne, błędy sieciowe oraz akcje użytkowników rejestrowane w czasie rzeczywistym." />

            <div className="flex-grow overflow-auto scrollbar-hide mt-4">
                {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <ListBulletIcon className="h-24 w-24 text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Brak zarejestrowanych zdarzeń</h3>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {logs.map((log, index) => (
                            <div key={`${log.timestamp}-${index}`} className={`p-3 border-l-4 rounded-r-lg shadow-sm transition-all ${
                                log.level === 'error' || log.level === 'critical' ? 'bg-red-50 dark:bg-red-900/10 border-red-500' : 
                                log.level === 'warn' ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-500' :
                                'bg-white dark:bg-secondary-700 border-primary-500'
                            }`}>
                                <div className="flex items-start gap-3">
                                    <LogLevelIndicator level={log.level} />
                                    <div className="flex-grow min-w-0">
                                        <div className="flex justify-between items-baseline flex-wrap gap-x-4">
                                            <p className={`font-bold ${log.level === 'error' || log.level === 'critical' ? 'text-red-700 dark:text-red-400' : 'text-gray-800 dark:text-gray-100'} break-words`}>
                                                {log.message}
                                            </p>
                                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono whitespace-nowrap bg-slate-100 dark:bg-secondary-900 px-1.5 py-0.5 rounded border dark:border-secondary-600">
                                                {formatDate(log.timestamp, true, true)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <UserIcon className="h-3 w-3" />
                                                <span className="font-bold uppercase tracking-tight text-gray-700 dark:text-gray-300">{log.user}</span>
                                            </div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-2 py-0.5 border rounded border-gray-200 dark:border-secondary-600">
                                                {log.context}
                                            </div>
                                            {log.latency && (
                                                <div className="flex items-center gap-1 text-[10px] font-mono text-orange-500 font-bold">
                                                    <ClockIcon className="h-3 w-3" /> {log.latency}ms
                                                </div>
                                            )}
                                            {log.errorCode && (
                                                <div className="text-[10px] font-mono text-red-600 font-bold">
                                                    CODE: {log.errorCode}
                                                </div>
                                            )}
                                        </div>
                                        {log.error && (
                                            <details className="mt-2 text-xs">
                                                <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:underline">Szczegóły stosu błędów</summary>
                                                <pre className="mt-1 p-2 bg-gray-900 text-red-400 rounded-md whitespace-pre-wrap break-all font-mono text-[10px] max-h-40 overflow-auto border border-red-900/50">
                                                    {log.error.stack}
                                                </pre>
                                            </details>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AppLogsView;
