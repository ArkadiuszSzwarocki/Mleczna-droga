
import React, { useState } from 'react';
import DocumentCheckIcon from './icons/DocumentCheckIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import ChevronUpIcon from './icons/ChevronUpIcon';
import DownloadIcon from './icons/DownloadIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import PencilIcon from './icons/PencilIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import XCircleIcon from './icons/XCircleIcon';
import ClipboardIcon from './icons/ClipboardIcon';
import Button from './Button';
import Input from './Input';
import Textarea from './Textarea';
import { useAuth } from './contexts/AuthContext';

type Instruction = {
    id: string;
    title: string;
    category: string;
    content: string;
};

const DEFAULT_INSTRUCTIONS: Instruction[] = [
    // --- MAGAZYN ---
    {
        id: 'wh-1',
        title: 'Przyjęcie Dostawy Surowców',
        category: 'Magazyn',
        content: `### Proces przyjęcia towaru z zewnątrz

1. Przejdź do zakładki **Magazyn > Przyjęcia**.
2. Kliknij przycisk **"Nowa Dostawa"** (jeśli masz uprawnienia) lub wybierz istniejącą w statusie *Rejestracja*.
3. Uzupełnij nagłówek dostawy:
   - Nr Zamówienia / WZ
   - Wybierz Dostawcę
   - Data Dostawy
   - Magazyn Docelowy (zazwyczaj Bufor MS01)
4. Dodaj pozycje dostawy (palety):
   - Wybierz produkt z listy.
   - Wpisz wagę netto.
   - Podaj nr partii dostawcy.
   - Jeśli surowiec jest w Big-Bag, system automatycznie zaznaczy go jako zablokowany (wymaga Lab).
5. Kliknij **"Zatwierdź Przyjęcie"**. Status zmieni się na *Oczekuje na Laboratorium* (jeśli wymagane) lub *Oczekuje na Magazyn*.
6. Po zakończeniu wszystkich procedur, kliknij **"Zakończ Przyjęcie Magazynowe"**. System wygeneruje palety i pozwoli wydrukować etykiety.`
    },
    {
        id: 'wh-2',
        title: 'Inwentaryzacja',
        category: 'Magazyn',
        content: `### Przeprowadzanie Spisu z Natury

**1. Rozpoczęcie Sesji**
- Przejdź do **Magazyn > Inwentaryzacja**.
- Kliknij "Rozpocznij Nową Inwentaryzację".
- Nadaj nazwę sesji (np. "MS01 Lipiec 2024") i wybierz strefy do sprawdzenia.
- **UWAGA:** Wybrane strefy zostaną zablokowane dla ruchów magazynowych.

**2. Skanowanie (Ślepy Spis)**
- Wejdź w aktywną sesję.
- Zeskanuj kod lokalizacji (np. \`R010101\`).
- Zeskanuj każdą paletę znajdującą się w tej lokalizacji i wpisz jej ilość.
- Kliknij "Zakończ tę Lokalizację".

**3. Weryfikacja i Zamknięcie**
- Po przeskanowaniu wszystkich stref, przejdź do podsumowania.
- System pokaże różnice (nadwyżki/braki).
- Kliknij **"Zaksięguj Różnice i Zamknij"**, aby zaktualizować stany w systemie.`
    },
    // --- LOGISTYKA ---
    {
        id: 'log-3',
        title: 'Zarządzanie Opakowaniami Zwrotnymi',
        category: 'Logistyka',
        content: `### Ewidencja i Rozliczanie Palet (EUR / EPAL / H1)

System pozwala na śledzenie sald opakowań zwrotnych u każdego kontrahenta (Dostawcy i Klienta). Pozwala to uniknąć strat wynikających z braku wymiany palet przy rampie.

**1. Rejestracja Ruchu (Wydanie/Przyjęcie)**
- Przejdź do **Logistyka > Saldy Opakowań**.
- Kliknij **"Rejestruj Ruch Palet"**.
- Wybierz Kontrahenta z bazy.
- Wybierz kierunek: 
  - **WYDANIE:** Gdy palety wyjeżdżają z naszego zakładu (zmniejsza nasze saldo u klienta).
  - **PRZYJĘCIE:** Gdy palety przyjeżdżają do nas (np. zwrot od klienta lub dostawa od dostawcy).
- Wprowadź ilość i opcjonalnie numer dokumentu (np. WZ lub kwit paletowy).

**2. Interpretacja Sald**
- **Wartość ujemna (czerwona):** Kontrahent jest nam winien palety (wydało się więcej niż przyjęło).
- **Wartość dodatnia (zielona):** Mamy nadwyżkę palet od tego kontrahenta.
- **Zero (szare):** Wszystkie palety zostały rozliczone / wymienione 1:1.

**3. Historia Transakcji**
- Każda operacja jest zapisywana z datą i nazwiskiem operatora w zakładce "Historia Transakcji". Umożliwia to wyjaśnianie sporów z przewoźnikami.`
    },
    {
        id: 'log-1',
        title: 'Transfery Wewnętrzne (OSiP)',
        category: 'Logistyka',
        content: `### Przesuwanie zapasów między oddziałami

1. Przejdź do **Logistyka > Transfery Wewnętrzne**.
2. Kliknij **"Utwórz Transfer"**.
3. Wybierz kierunek (np. Centrala -> OSiP).
4. Wybierz palety z listy dostępnych.
5. Zatwierdź utworzenie zlecenia.

**Wysyłka:** Kliknij **"Załadunek"** w szczegółach zlecenia.
**Przyjęcie:** W magazynie docelowym otwórz zlecenie w statusie *W Tranzycie* i zeskanuj przyjmowane palety.`
    },
    // --- PRODUKCJA ---
    {
        id: 'prod-1',
        title: 'Planowanie Produkcji AGRO',
        category: 'Produkcja',
        content: `### Tworzenie Zleceń Produkcyjnych

1. Otwórz **Planowanie > Planowanie AGRO**.
2. Wybierz dzień w kalendarzu i kliknij "Dodaj Zlecenie".
3. Wybierz recepturę i wpisz planowaną ilość (kg).
4. System automatycznie sprawdzi dostępność surowców.
5. Kliknij "Zapisz". Zlecenie pojawi się w statusie *Zaplanowane*.`
    },
    // --- LABORATORIUM ---
    {
        id: 'lab-1',
        title: 'Zwalnianie i Blokowanie Palet',
        category: 'Laboratorium',
        content: `### Kontrola Jakości

**Blokowanie:**
- Możesz zablokować dowolną paletę z poziomu podglądu palety (przycisk "Zablokuj").
- Zablokowana paleta nie może zostać użyta w produkcji ani wysłana.

**Zwalnianie:**
- Przejdź do **Laboratorium > Zwalnianie Palet**.
- Znajdź paletę na liście "Zablokowane".
- Kliknij "Zwolnij". Jeśli paleta była przeterminowana, system wymusi podanie nowej daty ważności.`
    }
];

const InstructionContent: React.FC<{ content: string }> = ({ content }) => {
    const parts = content.split(/```/);
    
    return (
        <div className="text-sm text-gray-700 dark:text-gray-300 font-sans space-y-4">
            {parts.map((part, index) => {
                if (index % 2 === 1) {
                    const lines = part.trim().split('\n');
                    let language = 'bash';
                    let code = part.trim();
                    if (lines.length > 0 && lines[0].trim().length < 20 && !lines[0].includes(' ')) {
                         language = lines[0].trim();
                         code = lines.slice(1).join('\n');
                    }
                    return (
                        <div key={index} className="relative group my-3">
                            <div className="absolute top-0 right-0 bg-gray-700 text-gray-300 text-[10px] px-2 py-1 rounded-bl-md rounded-tr-md font-mono select-none">{language}</div>
                            <pre className="bg-gray-900 text-green-400 p-4 rounded-md overflow-x-auto font-mono text-xs border border-gray-700 shadow-inner">
                                <code>{code}</code>
                            </pre>
                             <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(code); }} className="absolute top-2 right-14 p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity" title="Kopiuj">
                                <ClipboardIcon className="h-3 w-3" />
                            </button>
                        </div>
                    );
                } else {
                    if (!part.trim()) return null;
                    return <div key={index} className="whitespace-pre-wrap">{part}</div>;
                }
            })}
        </div>
    );
};

const InstructionItem: React.FC<{ instruction: Instruction }> = ({ instruction }) => {
    const [isOpen, setIsOpen] = useState(false);

    const getCategoryColor = (category: string) => {
        switch(category) {
            case 'Logistyka': return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-800';
            case 'Magazyn': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800';
            case 'Produkcja': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-800';
            case 'Laboratorium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-800';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    return (
        <div className="border dark:border-secondary-700 rounded-lg bg-white dark:bg-secondary-800 overflow-hidden shadow-sm mb-4">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-secondary-700/50 hover:bg-slate-100 dark:hover:bg-secondary-700 transition-colors text-left">
                <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs font-bold uppercase rounded border ${getCategoryColor(instruction.category)}`}>{instruction.category}</span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{instruction.title}</span>
                </div>
                {isOpen ? <ChevronUpIcon className="h-5 w-5 text-gray-500"/> : <ChevronDownIcon className="h-5 w-5 text-gray-500"/>}
            </button>
            {isOpen && (
                <div className="p-4 border-t dark:border-secondary-700 animate-fadeIn">
                    <InstructionContent content={instruction.content} />
                </div>
            )}
        </div>
    );
};

const InstructionsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const [instructions, setInstructions] = useState<Instruction[]>(DEFAULT_INSTRUCTIONS);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Instruction[]>([]);
    const canEdit = ['admin', 'boss'].includes(currentUser?.role || '');

    const handleStartEdit = () => { setEditForm(JSON.parse(JSON.stringify(instructions))); setIsEditing(true); };
    const handleCancelEdit = () => { setIsEditing(false); setEditForm([]); };
    const handleSave = () => { setInstructions(editForm); setIsEditing(false); };
    const handleChange = (id: string, field: keyof Instruction, value: string) => { setEditForm(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item)); };
    const handleDelete = (id: string) => { if(confirm('Czy na pewno usunąć tę instrukcję?')) { setEditForm(prev => prev.filter(item => item.id !== id)); } };
    const handleAdd = () => { setEditForm(prev => [...prev, { id: `instr-${Date.now()}`, title: 'Nowa Instrukcja', category: 'Ogólne', content: 'Wpisz treść tutaj...' }]); };

    return (
        <div className="p-4 md:p-6 bg-slate-50 dark:bg-secondary-900 min-h-full flex flex-col">
             <header className="flex justify-between items-start mb-6 border-b dark:border-secondary-700 pb-3">
                <div className="flex items-center">
                    <DocumentCheckIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Instrukcje i Procedury</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Baza wiedzy operacyjnej systemu Mleczna Droga.</p>
                    </div>
                </div>
                {canEdit && !isEditing && <Button onClick={handleStartEdit} variant="secondary" leftIcon={<PencilIcon className="h-4 w-4"/>}>Edytuj</Button>}
                {isEditing && (
                    <div className="flex gap-2">
                        <Button onClick={handleCancelEdit} variant="secondary" leftIcon={<XCircleIcon className="h-4 w-4"/>}>Anuluj</Button>
                        <Button onClick={handleSave} variant="primary" leftIcon={<CheckCircleIcon className="h-4 w-4"/>}>Zapisz</Button>
                    </div>
                )}
            </header>

            <div className="max-w-4xl mx-auto w-full">
                {isEditing ? (
                    <div className="space-y-6">
                        {editForm.map(instr => (
                            <div key={instr.id} className="border border-blue-300 rounded-lg p-4 bg-blue-50/30">
                                <div className="grid grid-cols-2 gap-4 mb-2">
                                    <Input label="Tytuł" value={instr.title} onChange={e => handleChange(instr.id, 'title', e.target.value)} />
                                    <Input label="Kategoria" value={instr.category} onChange={e => handleChange(instr.id, 'category', e.target.value)} />
                                </div>
                                <Textarea label="Treść" value={instr.content} onChange={e => handleChange(instr.id, 'content', e.target.value)} rows={6} />
                                <div className="mt-2 text-right"><Button onClick={() => handleDelete(instr.id)} variant="danger" className="text-xs">Usuń</Button></div>
                            </div>
                        ))}
                        <Button onClick={handleAdd} className="w-full" variant="secondary" leftIcon={<PlusIcon className="h-4 w-4"/>}>Dodaj nową</Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {instructions.map(instr => <InstructionItem key={instr.id} instruction={instr} />)}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstructionsPage;
