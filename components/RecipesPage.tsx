
import React, { useState } from 'react';
// FIX: Correct import path for types.ts to be relative
import { Recipe } from '../types';
import Button from './Button';
import BeakerIcon from './icons/BeakerIcon';
import PlusIcon from './icons/PlusIcon';
import EditIcon from './icons/EditIcon';
import ListBulletIcon from './icons/ListBulletIcon';
import { useProductionContext } from './contexts/ProductionContext';
import { useUIContext } from './contexts/UIContext';
import { useAuth } from './contexts/AuthContext'; // Import Auth

const RecipeCard: React.FC<{ recipe: Recipe; onViewDetails: () => void; onEdit: () => void; canEdit: boolean }> = ({ recipe, onViewDetails, onEdit, canEdit }) => {
    const totalWeight = recipe.ingredients.reduce((sum, ing) => sum + ing.quantityKg, 0);

    return (
        <div className="bg-white dark:bg-secondary-800 p-4 rounded-lg shadow-md border dark:border-secondary-700 flex flex-col justify-between h-full">
            <div>
                <h3 className="font-bold text-lg text-primary-700 dark:text-primary-300">{recipe.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{recipe.id}</p>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                    <p>Liczba składników: <span className="font-semibold">{recipe.ingredients.length}</span></p>
                    <p>Waga całkowita: <span className="font-semibold">{totalWeight.toFixed(2)} kg</span></p>
                    <p>Wydajność: <span className="font-semibold">{recipe.productionRateKgPerMinute} kg/min</span></p>
                </div>
            </div>
            <div className="mt-4 pt-3 border-t dark:border-secondary-600 flex justify-end gap-2">
                {canEdit && <Button onClick={onEdit} variant="secondary" className="text-xs" leftIcon={<EditIcon className="h-4 w-4" />}>Edytuj</Button>}
                <Button onClick={onViewDetails} className="text-xs" leftIcon={<ListBulletIcon className="h-4 w-4" />}>Szczegóły</Button>
            </div>
        </div>
    );
};

const RecipesPage: React.FC = () => {
    const { recipes } = useProductionContext();
    const { modalHandlers, modalState } = useUIContext();
    const { currentUser } = useAuth();
    
    // Simple check: Admin, Boss, Technologist/Lab, or Planner can edit recipes
    const canManageRecipes = ['admin', 'boss', 'lab', 'planista'].includes(currentUser?.role || '');

    const handleViewDetails = (recipe: Recipe) => {
        // View details doesn't strictly need a PIN, but the old code had it. Keeping consistency or removing if annoying.
        // Let's remove PIN for viewing to make it easier, but keep for Edit if critical.
        modalHandlers.openRecipeDetailModal(recipe);
    };
    
    const handleEdit = (recipe: Recipe) => {
        modalHandlers.showPinPrompt(() => modalHandlers.openAddEditRecipeModal(recipe));
    };
    
    const handleAdd = () => {
        modalHandlers.showPinPrompt(() => modalHandlers.openAddEditRecipeModal(null));
    };
    
    // Import AddEditRecipeModal dynamically via UIContext/AppContent, but since we modify RecipesPage, we assume the modal is rendered in AppContent
    // based on modalState.isAddEditRecipeModalOpen. 
    // We just need to trigger it here.
    
    // To ensure the modal is imported, we rely on AppContent.tsx lazy loading it.
    // We need to add the modal rendering to AppContent (which was done in the previous step).

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900/50 h-full">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <div className="flex items-center">
                    <BeakerIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <div>
                        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Zarządzanie Recepturami</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Przeglądaj, dodawaj i edytuj receptury produkcyjne.</p>
                    </div>
                </div>
                {canManageRecipes && (
                    <Button onClick={handleAdd} leftIcon={<PlusIcon className="h-5 w-5"/>}>
                        Dodaj Nową Recepturę
                    </Button>
                )}
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(recipes || []).map((recipe: Recipe) => (
                    <RecipeCard 
                        key={recipe.id} 
                        recipe={recipe} 
                        onViewDetails={() => handleViewDetails(recipe)} 
                        onEdit={() => handleEdit(recipe)}
                        canEdit={canManageRecipes}
                    />
                ))}
            </div>
            
            {/* Note: The actual Modal component is rendered in AppContent.tsx based on global state */}
        </div>
    );
};

export default RecipesPage;
