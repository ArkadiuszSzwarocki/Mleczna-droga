
import { useState, useCallback } from 'react';
import { usePersistedState } from './usePersistedState';
import { SOUND_OPTIONS } from '../constants';

export const useSound = () => {
    const [isSoundEnabled, setIsSoundEnabled] = usePersistedState<boolean>('app_settings_sound_v1', true);
    const [notificationSound, setNotificationSound] = usePersistedState<string>('app_settings_sound_choice_v1', 'default');
    
    const toggleSoundEnabled = useCallback(() => setIsSoundEnabled(p => !p), [setIsSoundEnabled]);

    const playSyntheticSound = useCallback(() => {
        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;

            const audioCtx = new AudioContextClass();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
            
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.15);
            
            setTimeout(() => { 
                if (audioCtx.state !== 'closed') audioCtx.close(); 
            }, 500);
        } catch (error) { 
            console.error("Error playing synthetic sound:", error); 
        }
    }, []);

    const playNotificationSound = useCallback(async (soundIdOverride?: string) => {
        if (isSoundEnabled) {
            const soundIdToPlay = soundIdOverride || notificationSound;
            const soundOption = SOUND_OPTIONS.find(s => s.id === soundIdToPlay);

            if (soundOption && soundOption.path) {
                try {
                    const audio = new Audio(soundOption.path);
                    await audio.play();
                } catch (error) {
                    console.warn(`Error playing sound file: ${soundOption.path}. Falling back to synthetic sound.`, error);
                    playSyntheticSound();
                }
            } else { 
                playSyntheticSound();
            }
        }
    }, [isSoundEnabled, notificationSound, playSyntheticSound]);

    return {
        isSoundEnabled,
        toggleSoundEnabled,
        notificationSound,
        setNotificationSound,
        playNotificationSound,
    };
};
