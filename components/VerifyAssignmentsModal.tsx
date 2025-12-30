import React, { useState, useEffect, useMemo } from 'react';
import { ProductionRun, Recipe } from '../types';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import ClockIcon from './icons/ClockIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface VerifyAssignmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  runsToVerify: ProductionRun[];
}

type VerificationStatus = 'pending' | 'checking' | 'ok' | 'nok';
interface VerificationStep {
    id: string;
    runName: string;
    recipeName: string;
    status: VerificationStatus;
    message: string;
}

const StatusIcon: React.FC<{ status: VerificationStatus }> = ({ status }) => {
    switch (status) {
        case 'pending':
            return <ClockIcon className="h-6 w-6 text-gray-400" />;
        case 'checking':
            return <ArrowPathIcon className="h-6 w-6 text-blue-500 animate-spin" />;
        case 'ok':
            return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
        case 'nok':
            return <XCircleIcon className="h-6 w-6 text-red-500" />;
        default:
            return null;
    }
};


const VerifyAssignmentsModal: React.FC<VerifyAssignmentsModalProps> = ({ isOpen, onClose, runsToVerify }) => {
    const { recipes, stationRawMaterialMapping } = useAppContext();
    const [steps, setSteps] = useState<VerificationStep[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        if (isOpen && runsToVerify) {
            const initialSteps = runsToVerify.map(run => ({
                id: run.id,
                runName: run.id,
                recipeName: run.recipeName,
                status: 'pending' as VerificationStatus,
                message: 'Oczekuje na weryfikację...'
            }));
            setSteps(initialSteps);
            setCurrentIndex(0); // Start processing
            setIsFinished(false);
        }
    }, [isOpen, runsToVerify]);

    useEffect(() => {
        if (!isOpen || currentIndex < 0 || currentIndex >= steps.length) {
            if(steps.length > 0 && currentIndex >= steps.length) {
                setIsFinished(true);
            }
            return;
        }

        // 1. Mark current step as 'checking'
        setSteps(prev => prev.map((step, index) => 
            index === currentIndex ? { ...step, status: 'checking', message: 'Sprawdzanie...' } : step
        ));

        // 2. Simulate async check with a timeout for UX
        const timer = setTimeout(() => {
            const currentRun = runsToVerify[currentIndex];
            const recipe = (recipes || []).find((r: Recipe) => r.id === currentRun.recipeId);
            
            let result: { status: 'ok' | 'nok', message: string };

            if (!recipe) {
                result = { status: 'nok', message: 'Błąd: Nie znaleziono receptury.' };
            } else {
                const unassignedIngredients = recipe.ingredients.filter(ing => 
                    !Object.values(stationRawMaterialMapping).includes(ing.productName)
                );

                if (unassignedIngredients.length > 0) {
                    result = { status: 'nok', message: `Błąd: Surowiec "${unassignedIngredients[0].productName}" nie jest przypisany do żadnej stacji.` };
                } else {
                    result = { status: 'ok', message: 'Wszystkie surowce przypisane poprawnie.' };
                }
            }
            
            // 3. Update step with result
            setSteps(prev => prev.map((step, index) => 
                index === currentIndex ? { ...step, status: result.status, message: result.message } : step
            ));

            // 4. Move to next step
            setCurrentIndex(prevIndex => prevIndex + 1);

        }, 800); // Animation delay

        return () => clearTimeout(timer);

    }, [currentIndex, isOpen, steps.length, runsToVerify, recipes, stationRawMaterialMapping]);

    const errorCount = useMemo(() => steps.filter(s => s.status === 'nok').length, [steps]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <CheckCircleIcon className="h-6 w-6"/>
                        Weryfikacja Przypisania Surowców do Stacji
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                    {steps.map(step => (
                        <div key={step.id} className="p-3 border dark:border-secondary-700 rounded-lg flex items-center gap-4">
                            <div className="flex-shrink-0">
                                <StatusIcon status={step.status} />
                            </div>
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-800 dark:text-gray-200">{step.recipeName}</p>
                                <p className={`text-sm ${
                                    step.status === 'nok' ? 'text-red-600 dark:text-red-400' : 
                                    (step.status === 'ok' ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400')
                                }`}>
                                    {step.message}
                                </p>
                            </div>
                        </div>
                    ))}
                    {steps.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">Brak zleceń do weryfikacji.</p>}
                </div>
                
                <div className="pt-4 border-t dark:border-secondary-700 mt-4">
                    {isFinished && (
                        <div className="text-center mb-4 animate-fadeIn">
                            {errorCount > 0 ? (
                                <p className="font-bold text-red-600 dark:text-red-400">Weryfikacja zakończona. Znaleziono {errorCount} błędów.</p>
                            ) : (
                                <p className="font-bold text-green-600 dark:text-green-400">Weryfikacja zakończona pomyślnie. Brak błędów.</p>
                            )}
                        </div>
                    )}
                    <div className="flex justify-end">
                        <Button onClick={onClose} variant="primary">Zamknij</Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyAssignmentsModal;