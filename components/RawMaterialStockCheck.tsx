import React, { useMemo, useEffect } from 'react';
import { Recipe, RawMaterialLogEntry, ProductionRun, PsdTask } from '../types';
import { useAppContext } from './contexts/AppContext';
import { getBlockInfo } from '../src/utils';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import Alert from './Alert';
import { ShortageDetail } from './MaterialShortageModal';

interface RawMaterialStockCheckProps {
    recipe: Recipe | null;
    plannedAmount: number; // in kg
    onSufficiencyChange: (isSufficient: boolean) => void;
    onShortageDetailsChange: (details: ShortageDetail[]) => void;
    excludeItemId?: string;
}

const RawMaterialStockCheck: React.FC<RawMaterialStockCheckProps> = ({ recipe, plannedAmount, onSufficiencyChange, onShortageDetailsChange, excludeItemId }) => {
    const { rawMaterialsLogList, productionRunsList, psdTasks, recipes } = useAppContext();

    const requiredIngredients = useMemo(() => {
        if (!recipe || plannedAmount <= 0) {
            return [];
        }

        const recipeBatchWeight = recipe.ingredients.reduce((sum, ing) => sum + ing.quantityKg, 0);
        if (recipeBatchWeight <= 0) return [];
        
        const scale = plannedAmount / recipeBatchWeight;

        return recipe.ingredients.map(ing => ({
            name: ing.productName,
            required: ing.quantityKg * scale * 1.05, // Apply 5% overage
        }));
    }, [recipe, plannedAmount]);

    const stockStatus = useMemo(() => {
        const status: {
            name: string;
            required: number;
            available: number;
            physical: number;
            reserved: number;
            isSufficient: boolean;
        }[] = [];

        if (requiredIngredients.length === 0) return status;
        
        const reservedQuantities: Record<string, number> = {};
        const allRecipes = recipes || [];

        // Reservations from AGRO runs
        (productionRunsList || []).forEach((run: ProductionRun) => {
            if (run.status === 'planned' && run.id !== excludeItemId) {
                const runRecipe = allRecipes.find((r: Recipe) => r.id === run.recipeId);
                if (runRecipe) {
                    const recipeBatchWeight = runRecipe.ingredients.reduce((sum, ing) => sum + ing.quantityKg, 0);
                    if(recipeBatchWeight > 0) {
                        const scale = run.targetBatchSizeKg / recipeBatchWeight;
                        runRecipe.ingredients.forEach(ing => {
                            const requiredWithOverage = ing.quantityKg * scale * 1.05;
                            reservedQuantities[ing.productName] = (reservedQuantities[ing.productName] || 0) + requiredWithOverage;
                        });
                    }
                }
            }
        });

        // Reservations from PSD tasks
        (psdTasks || []).forEach((task: PsdTask) => {
            if (task.status === 'planned' && task.id !== excludeItemId) {
                 const taskRecipe = allRecipes.find((r: Recipe) => r.id === task.recipeId);
                if (taskRecipe) {
                    const recipeBatchWeight = taskRecipe.ingredients.reduce((sum, ing) => sum + ing.quantityKg, 0);
                    if(recipeBatchWeight > 0) {
                        const scale = task.targetQuantity / recipeBatchWeight;
                        taskRecipe.ingredients.forEach(ing => {
                            const requiredWithOverage = ing.quantityKg * scale * 1.05;
                            reservedQuantities[ing.productName] = (reservedQuantities[ing.productName] || 0) + requiredWithOverage;
                        });
                    }
                }
            }
        });

        const availablePhysicalStock = (rawMaterialsLogList || []).reduce((acc, pallet) => {
            const { isBlocked } = getBlockInfo(pallet);
            if (!isBlocked && pallet.palletData.currentWeight > 0) {
                const productName = pallet.palletData.nazwa;
                acc[productName] = (acc[productName] || 0) + pallet.palletData.currentWeight;
            }
            return acc;
        }, {} as Record<string, number>);

        requiredIngredients.forEach(req => {
            const physicalStock = availablePhysicalStock[req.name] || 0;
            const reservedStock = reservedQuantities[req.name] || 0;
            const availableForPlanning = physicalStock - reservedStock;
            status.push({
                ...req,
                available: availableForPlanning,
                physical: physicalStock,
                reserved: reservedStock,
                isSufficient: availableForPlanning >= req.required,
            });
        });

        return status;
    }, [requiredIngredients, rawMaterialsLogList, productionRunsList, psdTasks, recipes, excludeItemId]);
    
    const isGloballySufficient = useMemo(() => stockStatus.every(item => item.isSufficient), [stockStatus]);

    useEffect(() => {
        onSufficiencyChange(isGloballySufficient);
        
        const shortages = stockStatus
            .filter(item => !item.isSufficient)
            .map(item => ({
                name: item.name,
                required: item.required,
                available: Math.max(0, item.available), // Don't show negative available stock
                missing: item.required - Math.max(0, item.available)
            }));
        onShortageDetailsChange(shortages);

    }, [isGloballySufficient, onSufficiencyChange, stockStatus, onShortageDetailsChange]);

    if (!recipe || plannedAmount <= 0) {
        return null;
    }

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Surowce</h4>
            {!isGloballySufficient && (
                 <Alert type="error" message="Brak wystarczającej ilości surowców." details="Ilość 'Dostępna do planowania' uwzględnia rezerwacje z innych zaplanowanych zleceń." />
            )}
            <div className="space-y-2 text-xs">
                {stockStatus.map(item => (
                    <div key={item.name} className={`p-2 rounded border ${item.isSufficient ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                {item.isSufficient 
                                    ? <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" title="Wystarczająca ilość"/>
                                    : <XCircleIcon className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" title="Niewystarczająca ilość"/>
                                }
                                <p className="font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                 <p className={`font-semibold ${!item.isSufficient ? 'text-red-600 dark:text-red-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                    {item.required.toFixed(2)} / {item.available.toFixed(2)}
                                </p>
                                <p className="text-gray-500 dark:text-gray-400">kg</p>
                            </div>
                        </div>
                        {(item.reserved > 0 || !item.isSufficient) && (
                            <details className="text-gray-500 dark:text-gray-400 text-[10px] mt-1 cursor-pointer">
                                <summary>Szczegóły dostępności</summary>
                                <div className="pl-4 pt-1 tabular-nums">
                                    <p>Stan fizyczny: {item.physical.toFixed(2)} kg</p>
                                    <p>Zarezerwowane: -{item.reserved.toFixed(2)} kg</p>
                                    <p className="font-bold border-t border-gray-300 dark:border-gray-600 mt-1 pt-1">Dostępne: {item.available.toFixed(2)} kg</p>
                                </div>
                            </details>
                        )}
                    </div>
                ))}
            </div>
             <p className="text-[10px] text-gray-500 dark:text-gray-400 italic">
                Zapotrzebowanie zawiera 5% naddatek. Dostępność uwzględnia rezerwacje z innych zaplanowanych zleceń.
            </p>
        </div>
    );
};

export default RawMaterialStockCheck;