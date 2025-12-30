
import React, { useState, useEffect } from 'react';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import Checkbox from './Checkbox';
import AdjustmentsHorizontalIcon from './icons/AdjustmentsHorizontalIcon';

export interface WidgetDefinition {
    id: string;
    label: string;
    description?: string;
}

interface CustomizeDashboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableWidgets: WidgetDefinition[];
    hiddenWidgetIds: string[];
    onSave: (hiddenIds: string[]) => void;
}

const CustomizeDashboardModal: React.FC<CustomizeDashboardModalProps> = ({ 
    isOpen, 
    onClose, 
    availableWidgets, 
    hiddenWidgetIds, 
    onSave 
}) => {
    const [localHiddenIds, setLocalHiddenIds] = useState<Set<string>>(new Set(hiddenWidgetIds));

    useEffect(() => {
        if (isOpen) {
            setLocalHiddenIds(new Set(hiddenWidgetIds));
        }
    }, [isOpen, hiddenWidgetIds]);

    const handleToggle = (id: string, isChecked: boolean) => {
        setLocalHiddenIds(prev => {
            const newSet = new Set(prev);
            if (isChecked) {
                newSet.delete(id); // If checked, remove from hidden (make visible)
            } else {
                newSet.add(id); // If unchecked, add to hidden
            }
            return newSet;
        });
    };

    const handleSave = () => {
        onSave(Array.from(localHiddenIds));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[200]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-2 border-b dark:border-secondary-700">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <AdjustmentsHorizontalIcon className="h-6 w-6"/>
                        Personalizuj Pulpit
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Wybierz elementy, które chcesz widzieć na swoim pulpicie. Odznaczone elementy zostaną ukryte.
                </p>

                <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                    {availableWidgets.map(widget => (
                        <div key={widget.id} className="p-3 border dark:border-secondary-700 rounded-lg hover:bg-slate-50 dark:hover:bg-secondary-700 transition-colors">
                            <Checkbox
                                id={`toggle-${widget.id}`}
                                label={widget.label}
                                checked={!localHiddenIds.has(widget.id)}
                                onChange={(e) => handleToggle(widget.id, e.target.checked)}
                            />
                            {widget.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
                                    {widget.description}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3 mt-4">
                    <Button onClick={onClose} variant="secondary">Anuluj</Button>
                    <Button onClick={handleSave} variant="primary">Zapisz Widok</Button>
                </div>
            </div>
        </div>
    );
};

export default CustomizeDashboardModal;
