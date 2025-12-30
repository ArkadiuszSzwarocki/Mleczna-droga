import React from 'react';
// FIX: Removed file extensions from all imports to fix module resolution errors.
import Button from './Button';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import { User, PsdTask, FinishedGoodItem } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onCancel?: () => void; // New optional prop
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText = 'Potwierdź',
  cancelButtonText = 'Anuluj',
  onCancel,
}) => {
  if (!isOpen) return null;

  const handleConfirmClick = () => {
    onConfirm();
  };

  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose(); // Default behavior
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center p-4 z-[200] transition-opacity duration-300 ease-in-out"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-modal-title"
    >
      <div
        className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4 transform transition-all duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start">
          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
          </div>
          <div className="ml-4 text-left">
            <h3 id="confirmation-modal-title" className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <div className="mt-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
          <Button
            type="button"
            variant="danger"
            className="w-full sm:w-auto"
            onClick={handleConfirmClick}
          >
            {confirmButtonText}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="w-full sm:w-auto"
            onClick={handleCancelClick}
          >
            {cancelButtonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;