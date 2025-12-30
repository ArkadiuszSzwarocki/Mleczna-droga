import React, { useState, useMemo } from 'react';
import { Recipe, RawMaterialLogEntry, ProductionRun, PsdTask } from '../../types';
import SearchableSelect from '../SearchableSelect';
import BeakerIcon from '../icons/BeakerIcon';
import { getBlockInfo } from '../../src/utils';
import ExclamationTriangleIcon from '../icons/ExclamationTriangleIcon';
import Alert from '../Alert';
import { useAppContext } from '../contexts/AppContext';
import { useUIContext } from '../contexts/UIContext';

interface CalculationResult {
    maxBatches: number;
    maxTonnes: number;
    limitingIngredient: {
        name: string;
        neededForNextBatch: number;
    } | null;
    ingredientDetails: {
        name: string;
        requiredPerBatch: number;
        availableStock: number;
        possibleBatches: number;
    }[];
}


const RecipeProductionCalculator: React.FC = () => {
    const { recipes, rawMaterialsLogList, productionRunsList, psdTasks } = useAppContext();
    const { modalHandlers } = useUIContext();
    const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

    const recipeOptions = useMemo(() => 
        (recipes || []).map((r: Recipe) => ({ value: r.id, label: r.name })),
    [recipes]);

    const calculationResult = useMemo((): CalculationResult | null => {
        if (!selectedRecipeId || !recipes || !rawMaterialsLogList) return null;

        const selectedRecipe = (recipes as Recipe[]).find(r => r.id === selectedRecipeId);
        if (!selectedRecipe || selectedRecipe.ingredients.length === 0) return null;

        // 1. Calculate TOTAL reservations from all planned runs/tasks
        const reservedQuantities: Record<string, number> = {};
        const allRecipes = recipes || [];
        
        (productionRunsList || []).forEach((run: ProductionRun) => {
            if (run.status === 'planned') {
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

        (psdTasks || []).forEach((task: PsdTask) => {
            if (task.status === 'planned') {
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

        // 2. Calculate available stock for planning (Physical - Reserved)
        const availableForPlanningStock = (rawMaterialsLogList as RawMaterialLogEntry[]).reduce((acc, pallet) => {
            const { isBlocked } = getBlockInfo(pallet);
            if (!isBlocked) {
                const productName = pallet.palletData.nazwa;
                acc[productName] = (acc[productName] || 0) + pallet.palletData.currentWeight;
            }
            return acc;
        }, {} as Record<string, number>);
        
        Object.keys(availableForPlanningStock).forEach(productName => {
            availableForPlanningStock[productName] -= (reservedQuantities[productName] || 0);
        });

        // 3. Use this available stock for calculation
        const recipeBatchWeight = selectedRecipe.ingredients.reduce((sum, ing) => sum + ing.quantityKg, 0);

        const ingredientDetails = selectedRecipe.ingredients.map(ingredient => {
            const stock = availableForPlanningStock[ingredient.productName] || 0;
            const possibleBatches = ingredient.quantityKg > 0 ? stock / (ingredient.quantityKg * 1.05) : Infinity; // Use 5% overage for calculation
            return {
                name: ingredient.productName,
                requiredPerBatch: ingredient.quantityKg,
                availableStock: stock,
                possibleBatches: possibleBatches,
            };
        });

        const maxBatches = Math.max(0, Math.min(...ingredientDetails.map(d => d.possibleBatches)));
        const maxKilos = maxBatches * recipeBatchWeight;
        const maxTonnes = maxKilos / 1000;

        let limitingIngredient: CalculationResult['limitingIngredient'] = null;
        if (maxBatches !== Infinity && isFinite(maxBatches)) {
            const limitingDetail = ingredientDetails.find(d => d.possibleBatches === maxBatches);
            if (limitingDetail) {
                 const alreadyProducedKilos = (maxBatches - Math.floor(maxBatches)) * limitingDetail.requiredPerBatch * 1.05;
                 const neededForNextBatch = (limitingDetail.requiredPerBatch * 1.05) - alreadyProducedKilos;
                limitingIngredient = {
                    name: limitingDetail.name,
                    neededForNextBatch,
                };
            }
        }

        return { maxBatches, maxTonnes, limitingIngredient, ingredientDetails };
    }, [selectedRecipeId, recipes, rawMaterialsLogList, productionRunsList, psdTasks]);
    
    const handleRecipeSelect = (val: string) => {
        if (val) {
            modalHandlers.showPinPrompt(() => setSelectedRecipeId(val));
        } else {
            setSelectedRecipeId(null);
        }
    };

    return (
        <div className="p-4 bg-white dark:bg-secondary-800 rounded-lg shadow-md h-full flex flex-col">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <BeakerIcon className="h-6 w-6 text-primary-500" />
                Kalkulator Produkcji
            </h3>
            <div className="mb-4">
                <SearchableSelect
                    label="Wybierz recepturę do obliczeń"
                    id="recipe-calculator-select"
                    options={recipeOptions}
                    value={selectedRecipeId || ''}
                    onChange={handleRecipeSelect}
                />
            </div>

            {calculationResult ? (
                <div className="space-y-4 flex-grow">
                    <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/40 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-200">Możliwa produkcja</p>
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-300">{calculationResult.maxTonnes.toFixed(2)} t</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">({Math.floor(calculationResult.maxBatches)} pełnych wsadów)</p>
                    </div>

                    {calculationResult.limitingIngredient && (
                        <Alert
                            type="warning"
                            message={`Ograniczający surowiec: ${calculationResult.limitingIngredient.name}`}
                            details={`Brakuje ${calculationResult.limitingIngredient.neededForNextBatch.toFixed(2)} kg do ukończenia następnego wsadu (uwzględniając 5% naddatek).`}
                        />
                    )}

                    <div className="space-y-2 text-xs">
                        <h4 className="font-semibold text-gray-600 dark:text-gray-400">Szczegóły surowców:</h4>
                        {calculationResult.ingredientDetails.map(item => (
                            <div key={item.name} className="p-2 bg-slate-100 dark:bg-secondary-700 rounded-md">
                                <p className="font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Dostępne do planowania (kg):</span>
                                    <span className={item.availableStock < 0 ? 'text-red-500 font-bold' : ''}>{item.availableStock.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : selectedRecipeId ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <p>Obliczanie...</p>
                </div>
            ) : (
                 <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <p>Wybierz recepturę, aby zobaczyć, ile produktu można wyprodukować, uwzględniając aktualne rezerwacje.</p>
                </div>
            )}
        </div>
    );
};

export default RecipeProductionCalculator;