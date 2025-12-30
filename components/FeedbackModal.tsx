import React, { useState } from 'react';
import Button from './Button';
import XCircleIcon from './icons/XCircleIcon';
import BugIcon from './icons/BugIcon';
import Select from './Select';
import Textarea from './Textarea';
import Alert from './Alert';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const [feedbackType, setFeedbackType] = useState('bug');
    const [description, setDescription] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Feedback submitted:", { type: feedbackType, description });
        setIsSubmitted(true);
        setTimeout(() => {
            onClose();
            // Reset state for next time
            setIsSubmitted(false);
            setDescription('');
        }, 2000);
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[170]">
            <div className="bg-white dark:bg-secondary-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                        <BugIcon className="h-6 w-6"/> Zgłoś Błąd / Sugestię
                    </h2>
                    <Button onClick={onClose} variant="secondary" className="p-1.5"><XCircleIcon className="h-5 w-5"/></Button>
                </div>

                {isSubmitted ? (
                    <Alert type="success" message="Dziękujemy za Twoją opinię!" />
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Select
                            label="Typ zgłoszenia"
                            id="feedback-type"
                            value={feedbackType}
                            onChange={e => setFeedbackType(e.target.value)}
                            options={[
                                { value: 'bug', label: 'Zgłoszenie błędu' },
                                { value: 'suggestion', label: 'Sugestia ulepszenia' },
                                { value: 'question', label: 'Pytanie' },
                            ]}
                        />
                        <Textarea
                            label="Opis"
                            id="feedback-description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Opisz szczegółowo swój problem lub pomysł..."
                            required
                            rows={6}
                        />
                        <div className="flex justify-end gap-3 pt-4 border-t dark:border-secondary-700">
                            <Button type="button" onClick={onClose} variant="secondary">Anuluj</Button>
                            <Button type="submit" disabled={!description.trim()}>Wyślij</Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default FeedbackModal;