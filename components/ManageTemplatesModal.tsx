import React, { useState } from 'react';
import { ProductionRunTemplate } from '../types';
// FIX: Correct import path to be relative
import { useProductionContext } from './contexts/ProductionContext';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import TrashIcon from './icons/TrashIcon';
import ConfirmationModal from './ConfirmationModal';
import Alert from './Alert';
import TemplateIcon from './icons/TemplateIcon';

interface ManageTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ManageTemplatesModal: React.FC<ManageTemplatesModalProps> = ({ isOpen, onClose }) => {
    const { productionRunTemplates, handleDeleteTemplate } = useProductionContext();
    const [templateToDelete, setTemplateToDelete] = useState<ProductionRunTemplate | null>(null);

    if (!isOpen) return null;

    const confirmDelete = () => {
        if (templateToDelete) {
            handleDeleteTemplate(templateToDelete.id);
            setTemplateToDelete(null);
        }
    };
    
    return (
        <>
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[160]">
                <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                        <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                           <TemplateIcon className="h-6 w-6" />
                           Zarządzaj Szablonami Zleceń AGRO
                        </h2>
                        <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                    </div>

                    <div className="flex-grow overflow-y-auto pr-2 space-y-3">
                        {(!productionRunTemplates || productionRunTemplates.length === 0) ? (
                            <Alert type="info" message="Brak zapisanych szablonów." details="Możesz zapisać zlecenie jako szablon podczas jego tworzenia lub edycji w planerze."/>
                        ) : (
                            productionRunTemplates.map(template => (
                                <div key={template.id} className="p-3 border dark:border-secondary-700 rounded-md flex justify-between items-center bg-slate-50 dark:bg-secondary-900">
                                    <div>
                                        <p className="font-semibold text-gray-800 dark:text-gray-200">{template.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {template.recipeName} - {template.targetBatchSizeKg} kg
                                        </p>
                                    </div>
                                    <Button onClick={() => setTemplateToDelete(template)} variant="danger" className="p-1.5"><TrashIcon className="h-4 w-4"/></Button>
                                </div>
                            ))
                        )}
                    </div>

                     <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3 mt-4">
                        <Button onClick={onClose} variant="primary">Gotowe</Button>
                    </div>
                </div>
            </div>
            {templateToDelete && (
                <ConfirmationModal
                    isOpen={!!templateToDelete}
                    onClose={() => setTemplateToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Potwierdź Usunięcie Szablonu"
                    message={`Czy na pewno chcesz usunąć szablon "${templateToDelete.name}"? Tej operacji nie można cofnąć.`}
                    confirmButtonText="Tak, usuń"
                />
            )}
        </>
    );
};

export default ManageTemplatesModal;
