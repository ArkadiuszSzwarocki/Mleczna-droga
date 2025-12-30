import React, { useEffect, useRef } from 'react';
import { useDynamicScripts } from '../src/useDynamicScript';

declare var QRCode: any;

const QRCODE_SCRIPT_URL = ["https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"];

const LoginQrCodeModal: React.FC<{ qrData: string, username?: string, password?: string }> = ({ qrData, username, password }) => {
    const qrCodeRef = useRef<HTMLDivElement>(null);
    const { areLoaded: scriptsLoaded, error: scriptError } = useDynamicScripts(QRCODE_SCRIPT_URL);

    useEffect(() => {
        if (scriptsLoaded && qrCodeRef.current && qrData && typeof QRCode !== 'undefined') {
            qrCodeRef.current.innerHTML = ""; // Clear previous QR
            new QRCode(qrCodeRef.current, {
                text: qrData,
                width: 160,
                height: 160,
                colorDark: "#0f172a",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    }, [qrData, scriptsLoaded]);

    return (
        <div className="flex flex-col items-center p-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2">Kod QR Logowania</h3>
            <div ref={qrCodeRef} className="p-2 bg-white rounded-lg shadow-md min-w-[176px] min-h-[176px] flex items-center justify-center">
                {!scriptsLoaded && <span className="text-xs">Ładowanie...</span>}
                {scriptError && <span className="text-xs text-red-500">Błąd QR</span>}
            </div>
            {username && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Użytkownik: <strong>{username}</strong></p>}
            {password && <p className="text-xs text-red-600 dark:text-red-400">Hasło: {password} (jednorazowe)</p>}
        </div>
    );
};

export default LoginQrCodeModal;