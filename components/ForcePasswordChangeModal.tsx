import React, { useState } from 'react';
import { User } from '../types';
import { useAuth } from './contexts/AuthContext';
import Input from './Input';
import Button from './Button';
import Alert from './Alert';
import PadlockIcon from './icons/PadlockIcon';
import EyeIcon from './icons/EyeIcon';
import EyeSlashIcon from './icons/EyeSlashIcon';

interface ForcePasswordChangeModalProps {
  isOpen: boolean;
  user: any;
  onSuccess: (user: any) => void;
  reason: 'temporary' | 'expired';
  onClose: () => void;
}

const ForcePasswordChangeModal: React.FC<ForcePasswordChangeModalProps> = ({ isOpen, user, onSuccess, reason, onClose }) => {
  const { handleForceChangePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string; form?: string }>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(null);
    setLoading(true);

    const validationErrors: { newPassword?: string; confirmPassword?: string; form?: string } = {};

    if (newPassword.length < 6) {
      validationErrors.newPassword = 'Nowe hasło musi mieć co najmniej 6 znaków.';
    }
    if (newPassword !== confirmPassword) {
      validationErrors.confirmPassword = 'Podane hasła nie są identyczne.';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setLoading(false);
      return;
    }

    // Dla hasła tymczasowego używamy handleForceChangePassword (bez weryfikacji starego hasła)
    const result = await handleForceChangePassword(newPassword);

    if (result.success) {
      setSuccess('Hasło zostało zmienione. Zaraz nastąpi zalogowanie...');
      setTimeout(() => {
        // Po zmianie hasła, user nie ma już isTemporaryPassword
        onSuccess({ ...user, isTemporaryPassword: false });
      }, 1500);
    } else {
      setErrors({ form: result.message });
      setLoading(false);
    }
  };
  
  const title = reason === 'expired' ? 'Twoje Hasło Wygasło' : 'Wymagana Zmiana Hasła';
  const message = reason === 'expired'
    ? `Witaj, ${user.username}! Twoje hasło straciło ważność. Ze względów bezpieczeństwa, musisz ustawić nowe hasło, aby kontynuować.`
    : `Witaj, ${user.username}! To jest Twoje pierwsze logowanie. Ze względów bezpieczeństwa, musisz ustawić nowe, własne hasło.`;

  return (
    <div
      className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center p-4 z-[200]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="force-password-change-title"
    >
      <div
        className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-md space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="force-password-change-title" className="text-2xl font-bold text-primary-700 dark:text-primary-300 text-center">
          {title}
        </h2>

        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          {message}
        </p>

        {errors.form && <Alert type="error" message={errors.form} />}
        {success && <Alert type="success" message={success} />}
        
        {!success && (
            <form onSubmit={handleSubmit} className="space-y-4">
            <Input
                label="Nowe Hasło"
                id="newPasswordForce"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                placeholder="Min. 6 znaków"
                icon={<PadlockIcon className="h-5 w-5 text-gray-400" />}
                rightIcon={showNewPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                onRightIconClick={() => setShowNewPassword(!showNewPassword)}
                error={errors.newPassword}
                disabled={loading}
            />
            <Input
                label="Potwierdź Nowe Hasło"
                id="confirmPasswordForce"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                icon={<PadlockIcon className="h-5 w-5 text-gray-400" />}
                rightIcon={showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
                error={errors.confirmPassword}
                disabled={loading}
            />
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto" disabled={loading}>
                    Anuluj
                </Button>
                <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                    {loading ? 'Zmiana hasła...' : 'Ustaw Nowe Hasło i Zaloguj'}
                </Button>
            </div>
            </form>
        )}
      </div>
    </div>
  );
};

export default ForcePasswordChangeModal;
