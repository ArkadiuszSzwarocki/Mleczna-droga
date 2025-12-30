// FIX: Added 'import React' to provide the JSX namespace and fix compilation error.
import React from 'react';
// FIX: Removed file extensions from all imports to fix module resolution errors.
// FIX: Corrected import path for constants.ts to be relative
import { CHANGELOG_DATA } from '../constants';
import { formatDate } from '../src/utils';
import NewspaperIcon from './icons/NewspaperIcon';
import PlusCircleIcon from './icons/PlusCircleIcon';
import ArrowUpCircleIcon from './icons/ArrowUpCircleIcon';
import WrenchScrewdriverIcon from './icons/WrenchScrewdriverIcon';

// FIX: Changed type from JSX.Element to React.ReactNode to resolve "Cannot find namespace 'JSX'" error. This is more robust against tsconfig misconfigurations.
const changeTypeStyles: Record<string, { icon: React.ReactNode; bgColor: string; textColor: string; label: string }> = {
  new: {
    icon: <PlusCircleIcon className="h-5 w-5 text-green-500" />,
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    label: 'Nowa Funkcja'
  },
  improvement: {
    icon: <ArrowUpCircleIcon className="h-5 w-5 text-blue-500" />,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    label: 'Usprawnienie'
  },
  fix: {
    icon: <WrenchScrewdriverIcon className="h-5 w-5 text-orange-500" />,
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    label: 'Poprawka Błędu'
  },
};

const WhatsNewPage: React.FC = () => {
  return (
    <div className="p-4 md:p-6 bg-white dark:bg-secondary-800 shadow-xl rounded-lg">
      <header className="flex items-center mb-6 border-b dark:border-secondary-600 pb-4">
        <NewspaperIcon className="h-8 w-8 text-primary-600 dark:text-primary-400 mr-3" />
        <h2 className="text-2xl font-semibold text-primary-700 dark:text-primary-300">Dziennik Zmian i Aktualizacji</h2>
      </header>

      <div className="space-y-8">
        {CHANGELOG_DATA.map((entry, index) => (
          <section key={entry.version} aria-labelledby={`version-${entry.version}`}>
            <div className="flex items-center gap-4 mb-3">
              <h3 id={`version-${entry.version}`} className="text-xl font-bold text-gray-800 dark:text-gray-200">
                Wersja {entry.version}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(entry.date)}</span>
            </div>
            
            <ul className="space-y-3 pl-4 border-l-2 border-primary-200 dark:border-primary-700">
              {entry.changes.map((change, changeIndex) => {
                const styles = changeTypeStyles[change.type];
                return (
                  <li key={changeIndex} className={`p-3 rounded-lg flex items-start gap-3 ${styles.bgColor}`}>
                    <div className="flex-shrink-0 pt-0.5">{styles.icon}</div>
                    <div>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${styles.textColor}`}>{styles.label}</span>
                      <p className={`mt-0.5 text-sm ${styles.textColor}`}>{change.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export default WhatsNewPage;
