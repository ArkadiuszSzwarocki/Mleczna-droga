import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from './contexts/AppContext';
import { PRODUCTION_STATIONS_BB, PRODUCTION_STATIONS_MZ } from '../constants';
import Button from './Button';
import SearchableSelect from './SearchableSelect';
import Alert from './Alert';
import RectangleGroupIcon from './icons/RectangleGroupIcon';
import ConfirmationModal from './ConfirmationModal';

const ManageProductionStationsPage: React.FC = () => {
    const { 
        stationRawMaterialMapping, 
        handleUpdateStationMappings,
        allProducts 
    } = useAppContext();

    const [draftMapping, setDraftMapping] = useState<Record<string, string>>(() => stationRawMaterialMapping);
    const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
    const [confirmationState, setConfirmationState] = useState<{
        stationId: string;
        rawMaterialName: string;
        existingStationId: string;
    } | null>(null);


    useEffect(() => {
        setDraftMapping(stationRawMaterialMapping);
    }, [stationRawMaterialMapping]);

    const rawMaterialOptions = useMemo(() => {
        return (allProducts || [])
            .filter((p: any) => p.type === 'raw_material')
            .map((p: any) => ({ value: p.name, label: p.name }));
    }, [allProducts]);

    const handleMappingChange = (stationId: string, rawMaterialName: string) => {
        setFeedback(null);

        // Check for duplication only if a material is being assigned (not cleared)
        if (rawMaterialName) {
            const existingStationEntry = Object.entries(draftMapping).find(
                ([key, value]) => value === rawMaterialName && key !== stationId
            );

            if (existingStationEntry) {
                const [existingStationId] = existingStationEntry;
                setConfirmationState({
                    stationId,
                    rawMaterialName,
                    existingStationId,
                });
                return; // Stop here and wait for user confirmation
            }
        }

        // No duplication, or material is being cleared - update directly
        setDraftMapping(prev => ({
            ...prev,
            [stationId]: rawMaterialName
        }));
    };

    const handleConfirmDuplicate = () => {
        if (!confirmationState) return;

        const { stationId, rawMaterialName } = confirmationState;

        setDraftMapping(prev => ({
            ...prev,
            [stationId]: rawMaterialName
        }));

        setConfirmationState(null);
    };

    const handleCancelDuplicate = () => {
        setConfirmationState(null);
    };

    const handleSaveChanges = () => {
        handleUpdateStationMappings(draftMapping);
        setFeedback({type: 'success', message: 'Przypisania stacji zostały zaktualizowane.'});
         // Scroll to top to make feedback visible
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const renderStationList = (title: string, stationIds: string[]) => (
        <section>
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b-2 border-primary-500/50">
                {title}
            </h3>
            <div className="space-y-4">
                {stationIds.map(stationId => (
                    <div key={stationId} className="grid grid-cols-1 md:grid-cols-[200px_1fr] items-center gap-4 p-3 bg-slate-50 dark:bg-secondary-900 rounded-lg border dark:border-secondary-700">
                        <label htmlFor={`station-${stationId}`} className="font-bold text-lg text-gray-700 dark:text-gray-300">
                            {stationId}:
                        </label>
                        <SearchableSelect
                            label=""
                            id={`station-${stationId}`}
                            options={[{ value: '', label: 'Brak / Nieprzypisany' }, ...rawMaterialOptions]}
                            value={draftMapping[stationId] || ''}
                            onChange={(value) => handleMappingChange(stationId, value)}
                        />
                    </div>
                ))}
            </div>
        </section>
    );

    return (
        <>
            <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg h-full flex flex-col">
                <header className="flex-shrink-0 flex items-center mb-6 border-b dark:border-secondary-600 pb-3">
                    <RectangleGroupIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Ustawienia Stacji Zasypowych</h2>
                </header>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-8">
                    {feedback && <div className="sticky top-2 z-10"><Alert type={feedback.type} message={feedback.message} /></div>}
                    <Alert type="info" message="Konfiguracja przypisania surowców" details="Na tej stronie możesz na stałe przypisać, jaki surowiec ma być używany na danej stacji zasypowej. Operatorzy nie będą mogli zasypać stacji innym surowcem niż ten wybrany tutaj." />
                    
                    {renderStationList("Stacje Zasypowe Big-Bag (BB)", PRODUCTION_STATIONS_BB)}
                    {renderStationList("Stacje Zasypowe Worki (MZ)", PRODUCTION_STATIONS_MZ)}
                </div>

                <footer className="flex-shrink-0 mt-6 pt-4 border-t dark:border-secondary-700 flex justify-end">
                    <Button onClick={handleSaveChanges}>
                        Zapisz zmiany
                    </Button>
                </footer>
            </div>
            {confirmationState && (
                <ConfirmationModal
                    isOpen={!!confirmationState}
                    onClose={handleCancelDuplicate}
                    onConfirm={handleConfirmDuplicate}
                    title="Potwierdź Duplikację Surowca"
                    message={
                        <span>
                            Surowiec <strong className="font-bold">{confirmationState.rawMaterialName}</strong> jest już przypisany do stacji <strong className="font-bold">{confirmationState.existingStationId}</strong>.
                            <br /><br />
                            Czy na pewno chcesz przypisać ten sam surowiec również do stacji <strong className="font-bold">{confirmationState.stationId}</strong>?
                        </span>
                    }
                    confirmButtonText="Tak, przypisz"
                    cancelButtonText="Anuluj"
                />
            )}
        </>
    );
};

export default ManageProductionStationsPage;
