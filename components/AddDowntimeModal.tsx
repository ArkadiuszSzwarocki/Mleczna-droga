import React, { useState, useEffect } from 'react';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import ClockIcon from './icons/ClockIcon';

const DOWNTIME_TYPES = [
    { value: 'awaria_mechaniczna', label: 'Awaria mechaniczna' },
    { value: 'awaria_elektryczna', label: 'Awaria elektryczna' },
    { value: 'brak_surowca', label: 'Brak surowca' },
    { value: 'przerwa_planowana', label: 'Przerwa planowana (np. czyszczenie)' },
    { value: 'problem_jakosciowy', label: 'Problem jakościowy' },
    { value: 'problem_organizacyjny', label: 'Problem organizacyjny (np. brak personelu)' },
    { value: 'inny', label: 'Inny (opisz poniżej)' },
];

interface DowntimeData {
    type: string;
    startTime: string;
    endTime: string | null;
    description: string;
}

interface AddDowntimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (downtimeData: DowntimeData) => void;
  productionRunId: string;
  defaultStartTime?: string; // ISO string
}

const AddDowntimeModal: React.FC<AddDowntimeModalProps> = ({ isOpen, onClose, onSave, productionRunId, defaultStartTime }) => {
    const [downtimeType, setDowntimeType] = useState(DOWNTIME_TYPES[0].value);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState<{ type?: string, startTime?: string, endTime?: string, description?: string, form?: string }>({});

    const toLocalISOString = (date: Date) => {
        const tzoffset = (new Date()).getTimezoneOffset() * 60000; // offset in milliseconds
        const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
        return localISOTime;
    };

    useEffect(() => {
        if (isOpen) {
            setErrors({});
            setDescription('');
            setEndTime('');
            setDowntimeType(DOWNTIME_TYPES[0].value);
            setStartTime(defaultStartTime ? toLocalISOString(new Date(defaultStartTime)) : toLocalISOString(new Date()));
        }
    }, [isOpen, defaultStartTime]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        const validationErrors: { type?: string, startTime?: string, endTime?: string, description?: string, form?: string } = {};

        if (!downtimeType) {
            validationErrors.type = 'Typ przestoju jest wymagany.';
        }
        if (!startTime) {
            validationErrors.startTime = 'Czas rozpoczęcia jest wymagany.';
        }

        if (endTime && new Date(startTime) >= new Date(endTime)) {
            validationErrors.endTime = 'Czas zakończenia musi być późniejszy niż czas rozpoczęcia.';
        }

        if (downtimeType === 'inny' && !description.trim()) {
            validationErrors.description = 'Opis jest wymagany dla typu "Inny".';
        }

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        onSave({
            type: downtimeType,
            startTime: new Date(startTime).toISOString(),
            endTime: endTime ? new Date(endTime).toISOString() : null,
            description: description.trim(),
        });
    };

    return (
        <div
            className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[150] animate-fadeIn"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-downtime-modal-title"
        >
            <div
                className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg space-y-4"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex justify-between items-center">
                    <h2 id="add-downtime-modal-title" className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <ClockIcon className="h-6 w-6" />
                        Zgłoś Przestój Produkcyjny
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Zgłoś nieplanowany lub planowany przestój dla zlecenia produkcyjnego. Jeśli przestój wciąż trwa, pozostaw pole "Czas zakończenia" puste.
                </p>

                {errors.form && <Alert type="error" message={errors.form} />}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Select
                        label="Typ Przestoju"
                        id="downtime-type"
                        options={DOWNTIME_TYPES}
                        value={downtimeType}
                        onChange={e => setDowntimeType(e.target.value)}
                        required
                        error={errors.type}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Czas rozpoczęcia"
                            id="downtime-start"
                            type="datetime-local"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            required
                            error={errors.startTime}
                        />
                         <Input
                            label="Czas zakończenia (opcjonalnie)"
                            id="downtime-end"
                            type="datetime-local"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            min={startTime}
                            error={errors.endTime}
                        />
                    </div>
                     <Textarea
                        label="Opis (opcjonalnie, wymagane dla 'Inny')"
                        id="downtime-description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Dodaj szczegółowe informacje dotyczące przestoju..."
                        error={errors.description}
                    />

                    <div className="flex justify-end space-x-3 pt-2 border-t dark:border-secondary-700">
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Anuluj
                        </Button>
                        <Button type="submit" variant="primary">
                            Zapisz Przestój
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddDowntimeModal;