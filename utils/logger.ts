
export interface LogEntry {
    timestamp: string;
    level: 'error' | 'info' | 'warn' | 'critical';
    message: string;
    context?: string;
    user?: string;
    latency?: number;
    errorCode?: string | number;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

const logs: LogEntry[] = [];
const MAX_LOGS = 500;

export const logger = {
    log: (level: 'info' | 'warn' | 'critical', message: string, context?: string, user?: string, latency?: number) => {
        const logEntry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context: context || 'System',
            user: user || 'Automatyczny',
            latency
        };
        
        console.log(`[${new Date().toLocaleTimeString()}] [${level.toUpperCase()}] ${message}`);
        logs.unshift(logEntry);
        if (logs.length > MAX_LOGS) logs.pop();
    },

    logError: (error: Error | string, context?: string, user?: string, errorCode?: string | number) => {
        const errObj = typeof error === 'string' ? new Error(error) : error;
        const logEntry: LogEntry = {
            timestamp: new Date().toISOString(),
            level: 'error',
            message: errObj.message,
            context: context || 'Błąd Aplikacji',
            user: user || 'Użytkownik',
            errorCode,
            error: {
                name: errObj.name,
                message: errObj.message,
                stack: errObj.stack,
            },
        };

        console.error(`[${new Date().toLocaleTimeString()}] [ERROR] ${context}:`, errObj);
        logs.unshift(logEntry);
        if (logs.length > MAX_LOGS) logs.pop();
    },

    getLogs: (): LogEntry[] => [...logs],

    clearLogs: () => {
        logs.length = 0;
    },
};
