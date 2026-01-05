import React, { useEffect, useState } from 'react';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  formToEdit?: any | null;
  onSaved?: () => void;
}

const AddEditPackagingFormModal: React.FC<Props> = ({ isOpen, onClose, formToEdit, onSaved }) => {
  const isEditing = !!formToEdit;
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && formToEdit) {
        setCode(formToEdit.code || '');
        setName(formToEdit.name || '');
        setType(formToEdit.type || '');
        setDescription(formToEdit.description || '');
      } else {
        setCode(''); setName(''); setType(''); setDescription('');
      }
      setError(null);
    }
  }, [isOpen, isEditing, formToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Nazwa jest wymagana'); return; }
    setLoading(true);
    try {
      let res: Response;
      if (isEditing && formToEdit && formToEdit.id) {
        res = await fetch(`/api/packaging-forms/${formToEdit.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code || null, name: name.trim(), type: type || null, description: description || null, is_active: true })
        });
      } else {
        res = await fetch(`/api/packaging-forms`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: code || null, name: name.trim(), type: type || null, description: description || null })
        });
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        throw new Error(txt || 'Błąd podczas zapisu');
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Błąd');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[150]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
          <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
            {isEditing ? 'Edytuj formę opakowania' : 'Dodaj formę opakowania'}
          </h2>
          <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
        </div>

        {error && <Alert type="error" message={error} />}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nazwa" id="pack-name" value={name} onChange={e => setName(e.target.value)} required autoFocus />
          <Input label="Kod" id="pack-code" value={code} onChange={e => setCode(e.target.value)} />
          <Select label="Typ" id="pack-type" options={[{ value: '', label: ' — ' }, { value: 'bulk', label: 'Bulk' }, { value: 'piece', label: 'Piece' }]} value={type} onChange={e => setType(e.target.value)} />
          <Input label="Opis" id="pack-desc" value={description} onChange={e => setDescription(e.target.value)} />

          <div className="flex justify-end gap-3 pt-4 border-t dark:border-secondary-700">
            <Button type="button" variant="secondary" onClick={onClose}>Anuluj</Button>
            <Button type="submit" disabled={loading}>{isEditing ? 'Zapisz zmiany' : 'Dodaj'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEditPackagingFormModal;
