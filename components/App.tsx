import React, { ErrorInfo, ReactNode } from 'react';
// FIX: Corrected import path for AppContext to be relative from the current file's location.
import { AppProvider } from './contexts/AppContext'; 
// FIX: Corrected import to named import
import { AppContent } from './AppContent';
import SadBotIcon from './icons/SadBotIcon';
import Button from './Button';
import { logger } from '../utils/logger';

// FIX: Modified props to explicitly include `children` instead of using `React.PropsWithChildren`,
// which appears to cause type resolution issues in this environment. This resolves the error where
// `this.props` was not being recognized on the class instance.
// FIX: Made `children` optional to resolve the error at the usage site where the compiler
// fails to infer the implicitly passed `children` prop from JSX.
interface ErrorBoundaryProps {
    children?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // FIX: Explicitly declare `props` on the class instance. This mirrors the existing fix for the `state` property
  // and resolves an issue where inherited properties from `React.Component` are not recognized in this environment.
  props: ErrorBoundaryProps;

  // FIX: The 'state' property must be declared on the class instance for TypeScript to recognize it.
  // While the constructor initializes the state, this declaration is what makes `this.state` available on the component's type.
  state: ErrorBoundaryState;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error: error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.logError(error, `ErrorBoundary: ${errorInfo.componentStack}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100 dark:bg-secondary-900 p-4 text-center font-sans animate-fadeIn">
          <div className="w-40 h-40">
            <SadBotIcon className="w-full h-full" />
          </div>
          <h1 className="mt-6 text-4xl font-bold text-primary-600 dark:text-primary-400">
            Ups! Coś poszło nie tak.
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-300 max-w-md">
            Wygląda na to, że napotkaliśmy nieoczekiwany problem. Nasz zespół techniczny został o tym poinformowany.
          </p>
          <div className="mt-8 flex gap-4">
             <Button onClick={() => window.location.reload()}>
                Odśwież stronę
             </Button>
          </div>
           <details className="mt-6 text-left max-w-2xl w-full bg-slate-200/50 dark:bg-secondary-800/50 p-3 rounded-lg">
             <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400">Szczegóły techniczne</summary>
             <pre className="mt-2 text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                {this.state.error && this.state.error.toString()}
                <br />
                {this.state.error?.stack}
              </pre>
           </details>
        </div>
      );
    }
    // This now works because ErrorBoundaryProps correctly defines `children`.
    return this.props.children;
  }
}

// FIX: Added the missing 'App' component and exported it to resolve the module import error in index.tsx.
export const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <AppProvider>
                <AppContent />
            </AppProvider>
        </ErrorBoundary>
    );
};