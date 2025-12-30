
import React, { useState } from 'react';
import { ProductionEvent, ProductionEventType } from '../types';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import { formatDate } from '../src/utils';
import TrashIcon from './icons/TrashIcon';
import ClipboardListIcon from './icons/ClipboardListIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import ClockIcon from './icons/ClockIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import WrenchScrewdriverIcon from './icons/WrenchScrewdriverIcon';
import InfoIcon from './icons/InfoIcon';

interface ProductionEventLogProps {
    events: ProductionEvent[];
    onAddEvent: (event: Omit<ProductionEvent, 'id' | 'timestamp' | 'user'>) => void;
    onDeleteEvent: (eventId: string) => void;
    isReadOnly?: boolean;
}

const EVENT_TYPES: { value: ProductionEventType, label: string, icon: React.ReactNode, color: string }[] = [
    { value: 'problem', label: 'Problem', icon: <ExclamationTriangleIcon className="h-4 w-4" />, color: 'text-orange-600 bg-orange-100 border-orange-200' },
    { value: 'downtime', label: 'Postój', icon: <ClockIcon className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100 border-blue-200' },
    { value: 'shift_change', label: 'Zmiana zmiany', icon: <ArrowPathIcon className="h-4 w-4" />, color: 'text-indigo-600 bg-indigo-100 border-indigo-200' },
    { value: 'transition', label: 'Przejście', icon: <ClipboardListIcon className="h-4 w-4" />, color: 'text-teal-600 bg-teal-100 border-teal-200' },
    { value: 'breakdown', label: 'Awaria', icon: <WrenchScrewdriverIcon className="h-4 w-4" />, color: 'text-red-600 bg-red-100 border-red-200' },
    { value: 'other', label: 'Inne', icon: <InfoIcon className="h-4 w-4" />, color: 'text-gray-600 bg-gray-100 border-gray-200' },
];

const ProductionEventLog: React.FC<ProductionEventLogProps> = ({ events, onAddEvent, onDeleteEvent, isReadOnly }) => {
    const [newDescription, setNewDescription] = useState('');
    const [newType, setNewType] = useState<ProductionEventType>('other');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDescription.trim()) return;
        onAddEvent({ type: newType, description: newDescription.trim() });
        setNewDescription('');
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-secondary-800 rounded-xl shadow-sm border dark:border-secondary-700 overflow-hidden">
            <header className="px-4 py-3 border-b dark:border-secondary-700 bg-slate-50 dark:bg-secondary-900/50 flex items-center justify-between">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <ClipboardListIcon className="h-5 w-5 text-primary-500" />
                    Raport z Przebiegu Produkcji
                </h3>
            </header>

            {!isReadOnly && (
                <form onSubmit={handleAdd} className="p-4 border-b dark:border-secondary-700 bg-slate-50/30 dark:bg-transparent">
                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                        <div className="w-full sm:w-48">
                            <Select 
                                label="Typ zdarzenia" 
                                id="event-type"
                                options={EVENT_TYPES.map(t => ({ value: t.value, label: t.label }))}
                                value={newType}
                                onChange={(e) => setNewType(e.target.value as ProductionEventType)}
                            />
                        </div>
                        <div className="flex-grow w-full">
                            <Input 
                                label="Opis problemu / zdarzenia" 
                                id="event-desc"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Wpisz punkt po punkcie..."
                            />
                        </div>
                        <Button type="submit" disabled={!newDescription.trim()} className="h-10 px-6">
                            Dodaj Wpis
                        </Button>
                    </div>
                </form>
            )}

            <div className="flex-grow overflow-y-auto p-4 scrollbar-hide">
                {(events || []).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-10">
                        <ClipboardListIcon className="h-12 w-12 opacity-20 mb-2" />
                        <p className="text-sm italic">Brak wpisów w raporcie.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {[...(events || [])].reverse().map((event) => {
                            const typeConfig = EVENT_TYPES.find(t => t.value === event.type) || EVENT_TYPES[5];
                            return (
                                <div key={event.id} className="relative pl-6 border-l-2 border-slate-200 dark:border-secondary-700 pb-2">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-secondary-800 border-2 border-primary-500"></div>
                                    <div className="flex justify-between items-start gap-4 group">
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 ${typeConfig.color}`}>
                                                    {typeConfig.icon}
                                                    {typeConfig.label}
                                                </span>
                                                <span className="text-[10px] text-gray-500 font-mono">{formatDate(event.timestamp, true)}</span>
                                                <span className="text-[10px] text-gray-400 font-semibold">przez {event.user}</span>
                                            </div>
                                            <p className="text-sm text-gray-800 dark:text-gray-200">{event.description}</p>
                                        </div>
                                        {!isReadOnly && (
                                            <button 
                                                onClick={() => onDeleteEvent(event.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-1"
                                                title="Usuń wpis"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionEventLog;
