import React, { createContext, useContext } from 'react';
import { PsdContextValue } from '../types';

export const PsdContext = createContext<PsdContextValue | undefined>(undefined);

export const usePsdContext = (): PsdContextValue => {
    const context = useContext(PsdContext);
    if (!context) {
        throw new Error('usePsdContext must be used within a PsdProvider');
    }
    return context;
};
