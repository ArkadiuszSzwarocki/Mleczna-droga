
import React, { useState, useEffect } from 'react';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Textarea from './Textarea';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import MapIcon from './icons/MapIcon';
import { LocationDefinition } from '../types';

interface AddEditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationToEdit?: LocationDefinition | null;
  onSave: (location: LocationDefinition) => { success: boolean; message: string };
}

const LOCATION_TYPES = [
  { value: 'warehouse', label: 'Magazyn (Obszar Główny)' },
  { value: 'zone', label: 'Strefa' },
  { value: 'rack', label: 'Regał' },
  { value: 'shelf', label: 'Półka' },
  { value: 'bin', label: 'Miejsce (Gniazdo)' },
];

const AddEditLocationModal: React.FC<AddEditLocationModalProps> = ({ isOpen, onClose, locationToEdit, onSave }) => {
  const isEditing = !!locationToEdit;
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<LocationDefinition['type']>('rack');
  const [capacity, setCapacity] = useState('10');
  const [description, setDescription] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (locationToEdit) {
        setId(locationToEdit.id);
        setName(locationToEdit.name);
        setType(locationToEdit.type);
        setCapacity(String(locationToEdit.capacity));
        setDescription(locationToEdit.description || '');
        setIsLocked(!!locationToEdit.isLocked);
      } else {
        setId('');
        setName('');
        setType('rack');
        setCapacity('10');
        setDescription('');
        setIsLocked(false);
      }
      setError(null);
    }
  }, [isOpen, locationToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!id.trim()) {
      setError('ID lokalizacji jest wymagane.');
      return;
    }
    if (!name.trim()) {
      setError('Nazwa lokalizacji jest wymagana.');
      return;
    }
    const cap = parseInt(capacity, 10);
    if (isNaN(cap) || cap < 0) {
      setError('Pojemność musi być liczbą nieujemną.');
      return;
    }

    const locationData: LocationDefinition = {
      id: id.trim().toUpperCase(),
      name: name.trim(),
      type,
      capacity: cap,
      description: description.trim(),
      isLocked,
    };

    const result = onSave(locationData);
    if (result.success) {
      onClose();
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[160]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
          <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
            <MapIcon className="h-6 w-6" />
            {isEditing ? 'Edytuj Lokalizację' : 'Dodaj Nową Lokalizację'}
          </h2>
          <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 space-y-4">
          {error && <Alert type="error" message={error} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="ID Lokalizacji (Unikalne)"
                id="loc-id"
                value={id}
                onChange={e => setId(e.target.value)}
                uppercase
                disabled={isEditing} // ID usually shouldn't change to maintain ref integrity
                required
                autoFocus={!isEditing}
                placeholder="np. R01-01-A"
              />
               <Select
                label="Typ"
                id="loc-type"
                options={LOCATION_TYPES}
                value={type}
                onChange={e => setType(e.target.value as any)}
              />
            </div>

            <Input
                label="Nazwa Wyświetlana"
                id="loc-name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="np. Regał 1, Poziom 1"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                 <Input
                    label="Pojemność (palety)"
                    id="loc-capacity"
                    type="number"
                    value={capacity}
                    onChange={e => setCapacity(e.target.value)}
                    min="0"
                    required
                />
                <div className="flex items-center gap-2 mt-6">
                    <input 
                        type="checkbox" 
                        id="loc-locked" 
                        checked={isLocked} 
                        onChange={e => setIsLocked(e.target.checked)} 
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="loc-locked" className="text-sm text-gray-700 dark:text-gray-300">Blokada techniczna</label>
                </div>
            </div>
            
            <Textarea
                label="Opis (opcjonalnie)"
                id="loc-desc"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
            />

            <div className="pt-4 border-t dark:border-secondary-700 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
                <Button type="submit">{isEditing ? 'Zapisz Zmiany' : 'Dodaj'}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditLocationModal;
