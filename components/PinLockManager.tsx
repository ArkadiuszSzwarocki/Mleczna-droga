import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUIContext } from './contexts/UIContext';
import IdleWarningPrompt from './IdleWarningPrompt';

const IDLE_WARNING_TIMEOUT = 2 * 60 * 1000; // 2 minutes
const IDLE_LOCK_TIMEOUT = 3 * 60 * 1000;    // 3 minutes
const WARNING_DURATION_SECONDS = 60;

const PinLockManager: React.FC = () => {
    const { modalHandlers, isIdleLockEnabled, setIsIdleLockEnabled } = useUIContext();
    const [isIdleWarningVisible, setIsIdleWarningVisible] = useState(false);

    const warningTimer = useRef<number | null>(null);
    const lockTimer = useRef<number | null>(null);

    const isIdleWarningVisibleRef = useRef(isIdleWarningVisible);
    useEffect(() => {
        isIdleWarningVisibleRef.current = isIdleWarningVisible;
    }, [isIdleWarningVisible]);

    const handleLock = useCallback(() => {
        setIsIdleWarningVisible(false);
        setIsIdleLockEnabled(false);
        // Show the pin prompt. The logic in AppContent.tsx will handle re-enabling the lock on success.
        modalHandlers.showPinPrompt(() => {});
    }, [setIsIdleLockEnabled, modalHandlers]);

    const resetTimers = useCallback(() => {
        if (warningTimer.current) clearTimeout(warningTimer.current);
        if (lockTimer.current) clearTimeout(lockTimer.current);
        
        warningTimer.current = window.setTimeout(() => {
            setIsIdleWarningVisible(true);
        }, IDLE_WARNING_TIMEOUT);

        lockTimer.current = window.setTimeout(() => {
            handleLock();
        }, IDLE_LOCK_TIMEOUT);
    }, [handleLock]);

    const handleActivity = useCallback(() => {
        // Only reset timers if the warning prompt is not currently visible.
        // This prevents activity from dismissing an active warning.
        if (!isIdleWarningVisibleRef.current) {
            resetTimers();
        }
    }, [resetTimers]);
    
    useEffect(() => {
        if (!isIdleLockEnabled) {
            if (warningTimer.current) clearTimeout(warningTimer.current);
            if (lockTimer.current) clearTimeout(lockTimer.current);
            setIsIdleWarningVisible(false);
            return;
        }

        const events: ('mousemove' | 'keydown' | 'click' | 'scroll' | 'touchstart')[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        
        events.forEach(event => window.addEventListener(event, handleActivity, { passive: true }));
        resetTimers();

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (warningTimer.current) clearTimeout(warningTimer.current);
            if (lockTimer.current) clearTimeout(lockTimer.current);
        };
    }, [isIdleLockEnabled, resetTimers, handleActivity]);
    
    const handleExtend = () => {
        setIsIdleWarningVisible(false);
        resetTimers();
    };
    
    if (!isIdleLockEnabled) {
        return null;
    }

    return (
        <IdleWarningPrompt 
            isOpen={isIdleWarningVisible}
            onExtend={handleExtend}
            onLock={handleLock}
            initialTime={WARNING_DURATION_SECONDS}
        />
    );
};

export default PinLockManager;