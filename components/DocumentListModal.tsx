import React from 'react';
import { Document } from '../types';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import { useUIContext } from './contexts/UIContext';

interface DocumentListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documents: Document[];
}

const DocumentListModal: React.FC<DocumentListModalProps> = ({ isOpen, onClose, title, documents }) => {
  const { modalHandlers } = useUIContext();
  if (!isOpen) return null;

  const handleDocumentClick = (doc: Document) => {
    modalHandlers.openDocumentPreviewModal(doc);
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[170]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="px-6 py-4 border-b dark:border-secondary-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary-700 dark:text-primary-300">{title}</h2>
          <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-2 -mt-1"><XCircleIcon className="h-6 w-6"/></Button>
        </header>
        <div className="flex-grow overflow-y-auto p-6">
          {documents.length > 0 ? (
            <ul className="space-y-2">
              {documents.map((doc, index) => (
                <li key={index}>
                  <button onClick={() => handleDocumentClick(doc)} className="w-full flex items-center p-3 bg-slate-100 dark:bg-secondary-700 hover:bg-slate-200 dark:hover:bg-secondary-600 rounded-md text-left">
                    <DocumentTextIcon className="h-5 w-5 mr-3 text-primary-600 dark:text-primary-400 flex-shrink-0"/>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{doc.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-center text-gray-500 dark:text-gray-400">Brak dokumentów powiązanych z tą paletą.</p>
          )}
        </div>
        <footer className="px-6 py-3 bg-gray-50 dark:bg-secondary-900/50 border-t dark:border-secondary-700 flex justify-end">
          <Button onClick={onClose}>Zamknij</Button>
        </footer>
      </div>
    </div>
  );
};

export default DocumentListModal;