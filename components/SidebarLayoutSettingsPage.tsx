
import React, { useState, useEffect } from 'react';
import ViewColumnsIcon from './icons/ViewColumnsIcon';
import { getNavItemsDefinition } from '../src/navigation';
import Checkbox from './Checkbox';
import Button from './Button';
import Alert from './Alert';

const SidebarLayoutSettingsPage: React.FC = () => {
    // This state simulates saving preferences. In a full implementation, 
    // the Sidebar component would read this state to filter items.
    const [hiddenGroups, setHiddenGroups] = useState<string[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'info', message: string } | null>(null);

    useEffect(() => {
        // Load definition (passing dummy function as callback isn't needed for structure)
        const defs = getNavItemsDefinition(() => {});
        setItems(defs);
    }, []);

    const handleToggleGroup = (groupKey: string, isChecked: boolean) => {
        setHiddenGroups(prev => {
            if (!isChecked) {
                return [...prev, groupKey];
            } else {
                return prev.filter(k => k !== groupKey);
            }
        });
        setFeedback({ type: 'info', message: 'Zmiany zapisane. Odśwież stronę, aby zobaczyć efekt w menu.' });
    };

    const handleReset = () => {
        setHiddenGroups([]);
        setFeedback({ type: 'success', message: 'Przywrócono domyślny układ menu.' });
    };

    return (
        <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full">
            <header className="flex items-center mb-6 border-b dark:border-secondary-600 pb-3">
                <ViewColumnsIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                <div>
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Konfiguracja Menu Bocznego</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Dostosuj widoczność sekcji w pasku nawigacyjnym.</p>
                </div>
            </header>
            
            {feedback && <div className="mb-4"><Alert type={feedback.type as any} message={feedback.message} /></div>}

            <div className="max-w-2xl">
                <div className="bg-slate-50 dark:bg-secondary-900 p-4 rounded-lg border dark:border-secondary-700 mb-6">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">Widoczność Sekcji</h3>
                    <div className="space-y-3">
                        {items.filter(item => item.isGroup).map(group => (
                            <div key={group.key} className="flex items-center justify-between p-3 bg-white dark:bg-secondary-800 rounded shadow-sm border dark:border-secondary-700">
                                <div className="flex items-center gap-3">
                                    <div className="text-gray-500 dark:text-gray-400">{group.icon}</div>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{group.label}</span>
                                </div>
                                <Checkbox 
                                    label={hiddenGroups.includes(group.key) ? "Ukryta" : "Widoczna"} 
                                    id={`toggle-${group.key}`}
                                    checked={!hiddenGroups.includes(group.key)}
                                    onChange={(e) => handleToggleGroup(group.key, e.target.checked)}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end">
                    <Button onClick={handleReset} variant="secondary">Przywróć Domyślne</Button>
                </div>
            </div>
        </div>
    );
};

export default SidebarLayoutSettingsPage;
