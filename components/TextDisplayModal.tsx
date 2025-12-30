import React from 'react';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';

interface TextDisplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

const TextDisplayModal: React.FC<TextDisplayModalProps> = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[160]" onClick={onClose}>
      <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <header className="px-6 py-4 border-b dark:border-secondary-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-primary-700 dark:text-primary-300">{title}</h2>
          <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-2 -mt-1"><XCircleIcon className="h-6 w-6"/></Button>
        </header>
        <div className="flex-grow overflow-y-auto p-6">
          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{content}</p>
        </div>
        <footer className="px-6 py-3 bg-gray-50 dark:bg-secondary-900/50 border-t dark:border-secondary-700 flex justify-end">
          <Button onClick={onClose}>Zamknij</Button>
        </footer>
      </div>
    </div>
  );
};

export default TextDisplayModal;