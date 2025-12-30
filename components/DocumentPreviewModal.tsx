import React from 'react';
import { Document } from '../types';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: Document | null;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({ isOpen, onClose, document }) => {
  if (!isOpen || !document) return null;

  const isImage = document.type.startsWith('image/');
  const isPdf = document.type === 'application/pdf';

  let content;
  if (isImage) {
    content = <img src={document.url} alt={document.name} className="max-w-full max-h-full object-contain" />;
  } else if (isPdf) {
    content = <iframe src={document.url} title={document.name} className="w-full h-full border-0" />;
  } else {
    content = (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">Podgląd niedostępny</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">Typ pliku "{document.type}" nie jest wspierany.</p>
        <a href={document.url} download={document.name} className="mt-4">
          <Button variant="secondary">Pobierz plik</Button>
        </a>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[180] animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="px-6 py-3 border-b dark:border-secondary-700 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-bold text-primary-700 dark:text-primary-300 truncate pr-4">
            Podgląd: {document.name}
          </h2>
          <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-2 -mt-1">
            <XCircleIcon className="h-6 w-6" />
          </Button>
        </header>
        <div className="flex-grow p-2 flex items-center justify-center overflow-auto">
          {content}
        </div>
      </div>
    </div>
  );
};

export default DocumentPreviewModal;
