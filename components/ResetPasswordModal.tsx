import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { useAppContext } from './contexts/AppContext';
import Button from './Button';
import Alert from './Alert';
import XCircleIcon from './icons/XCircleIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ArrowPathIcon from './icons/ArrowPathIcon';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, user }) => {
  const { handleResetPassword } = useAppContext();
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      // Wywołujemy reset hasła przy otwarciu modala
      const result = handleResetPassword(user.id);
      if (result.success) {
        setTempPassword(result.tempPassword!);
        setFeedback({ 
            type: 'success', 
            message: `Hasło dla użytkownika ${user.username} zostało zresetowane pomyślnie.` 
        });
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
      setCopied(false);
    }
  }, [isOpen, user?.id]); // Reaguj na zmianę usera lub otwarcie
  
  if (!isOpen) return null;

  const handleCopy = () => {
    if(tempPassword) {
        navigator.clipboard.writeText(tempPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-[160] backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-2xl p-6 w-full max-w-md border border-slate-200 dark:border-secondary-700 animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center pb-3 border-b dark:border-secondary-600 mb-4">
                <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                    <ArrowPathIcon className="h-6 w-6"/> Reset Hasła
                </h2>
                <Button onClick={onClose} variant="secondary" className="p-1.5 -mr-1.5"><XCircleIcon className="h-5 w-5"/></Button>
            </div>

            {feedback && (
                <div className="mb-4">
                    <Alert type={feedback.type} message={feedback.message} />
                </div>
            )}

            {tempPassword && (
                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                            Przekaż poniższe hasło użytkownikowi <strong>{user.username}</strong>. 
                            Będzie ono wymagane przy następnym logowaniu, po czym system wymusi jego zmianę na stałe.
                        </p>
                    </div>

                    <div className="relative group">
                        <div className="p-4 bg-slate-100 dark:bg-secondary-900 rounded-lg flex items-center justify-between border-2 border-dashed border-slate-300 dark:border-secondary-600">
                            <span className="font-mono text-2xl tracking-widest text-gray-800 dark:text-gray-200 select-all font-bold">
                                {tempPassword}
                            </span>
                            <Button 
                                onClick={handleCopy} 
                                variant="secondary" 
                                className="ml-2"
                                leftIcon={copied ? <CheckCircleIcon className="h-5 w-5 text-green-500" /> : <ClipboardIcon className="h-5 w-5" />}
                            >
                                {copied ? 'Skopiowano' : 'Kopiuj'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="mt-6 pt-4 border-t dark:border-secondary-700 flex justify-end">
                <Button onClick={onClose} className="px-8">Zamknij</Button>
            </div>
        </div>
    </div>
  );
};

export default ResetPasswordModal;