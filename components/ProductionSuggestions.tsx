import React, { useMemo } from 'react';
import { RawMaterialLogEntry, Recipe, PsdTask } from '../types';
import { useUIContext } from './contexts/UIContext';
import Button from './Button';
import SparklesIcon from './icons/SparklesIcon';
import { useWarehouseContext } from './contexts/WarehouseContext';
import { getBlockInfo } from '../src/utils';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import XCircleIcon from './icons/XCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
// FIX: Correct import path to be relative
import { usePsdContext } from './contexts/PsdContext';
import { useAuth } from './contexts/AuthContext';


interface ProductionSuggestionsProps {
    criticalMaterials: RawMaterialLogEntry[];
    allRecipes: Recipe[];
}

const ProductionSuggestions: React.FC<ProductionSuggestionsProps> = ({ criticalMaterials, allRecipes }) => {
    const { modalHandlers } = useUIContext();
    const { rawMaterialsLogList } = useWarehouseContext();
    const { psdTasks } = usePsdContext();
    const { currentUser } = useAuth();


    const suggestions = useMemo(() => {
        const criticalMaterialNames = new Set(criticalMaterials.map(m => m.palletData.nazwa));

        const availableStock = (rawMaterialsLogList || []).reduce((acc, pallet) => {
            // Check only for manual block, not expiry block, because we WANT to use expiring items.
            const isManuallyBlocked = pallet.palletData?.isBlocked;
            if (!isManuallyBlocked) {
                const productName = pallet.palletData.nazwa;
                acc[productName] = (acc[productName] || 0) + pallet.palletData.currentWeight;
            }
            return acc;
        }, {} as Record<string, number>);

        const relevantRecipes = allRecipes.map(recipe => {
            const usesCriticalMaterial = recipe.ingredients.some(ing => criticalMaterialNames.has(ing.productName));

            if (!usesCriticalMaterial) return null;

            return {
                recipe,
                ingredientDetails: recipe.ingredients.map(ing => ({
                    name: ing.productName,
                    isCritical: criticalMaterialNames.has(ing.productName),
                    isAvailable: (availableStock[ing.productName] || 0) > 0,
                })),
            };
        }).filter((item): item is { recipe: Recipe; ingredientDetails: { name: string; isCritical: boolean; isAvailable: boolean; }[] } => item !== null);
        
        return relevantRecipes.sort((a, b) => a.recipe.name.localeCompare(b.recipe.name));

    }, [criticalMaterials, allRecipes, rawMaterialsLogList]);

    const handlePlanProduction = (recipe: Recipe) => {
        const today = new Date().toISOString().split('T')[0];

        const onSelectAgro = () => {
            modalHandlers.closeChooseProductionTypeModal();
            modalHandlers.openAddEditRunModal({
                isNew: true,
                initialDate: today,
                initialRecipeId: recipe.id
            });
        };

        const onSelectPsd = () => {
            modalHandlers.closeChooseProductionTypeModal();
            if (!currentUser) {
                console.error("Cannot create PSD task: User not logged in.");
                return;
            }
            
            const psdPrefix = 'ZLEPSD';
            const existingPsdIds = (psdTasks || []).map(task => task.id).filter(id => id.startsWith(psdPrefix));
            let maxNumber = 0;
            if (existingPsdIds.length > 0) {
                maxNumber = Math.max(...existingPsdIds.map(id => parseInt(id.replace(psdPrefix, ''), 10) || 0));
            }
            const newSequence = maxNumber + 1;
            const newId = `${psdPrefix}${String(newSequence).padStart(5, '0')}`;
            
            const newTask: PsdTask = {
                id: newId,
                name: newId,
                recipeId: recipe.id,
                recipeName: recipe.name,
                targetQuantity: 0,
                plannedDate: today,
                shelfLifeMonths: 0,
                status: 'planned',
                createdAt: new Date().toISOString(),
                createdBy: currentUser.username,
                batches: [],
            };
            
            modalHandlers.openEditPsdTaskModal(newTask);
        };
        
        modalHandlers.openChooseProductionTypeModal({
            onSelectAgro,
            onSelectPsd,
            recipeName: recipe.name
        });
    };

    if (suggestions.length === 0) {
        return null;
    }

    return (
        <section className="mb-6 p-4 bg-slate-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700 animate-fadeIn">
            <h3 className="text-xl font-semibold text-primary-700 dark:text-primary-300 mb-3 flex items-center gap-2">
                <SparklesIcon className="h-6 w-6" />
                Sugestie Zastosowania
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {suggestions.map(({ recipe, ingredientDetails }) => (
                    <div key={recipe.id} className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md flex flex-col justify-between">
                        <div>
                            <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{recipe.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Możliwe zastosowanie zagrożonych surowców.</p>
                            <div className="mt-2 text-xs space-y-1">
                                {ingredientDetails
                                    .filter(ing => ing.isCritical)
                                    .map(ing => (
                                    <div key={ing.name} className="flex items-center gap-2" title="Surowiec z krytycznym terminem">
                                        <ExclamationTriangleIcon className="h-4 w-4 text-orange-500 flex-shrink-0" />
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                                            {ing.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-4 text-right">
                            <Button onClick={() => handlePlanProduction(recipe)} className="text-sm">
                                Zaplanuj Produkcję
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default ProductionSuggestions;
