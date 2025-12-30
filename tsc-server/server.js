
const express = require('express');
const https = require('https');
const fs = require('fs');
const bodyParser = require('body-parser');
const net = require('net');

const app = express();
const port = 3001;

app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(bodyParser.json());

let sslOptions = {};
try {
    sslOptions = {
        key: fs.readFileSync('./server.key'),
        cert: fs.readFileSync('./server.cert')
    };
    console.log('✅ SSL: Certyfikaty aktywne.');
} catch (error) {
    console.error('❌ BŁĄD: Brak plików SSL w folderze!');
    process.exit(1);
}

// Stała mapa IP jako fallback / wartości domyślne
const PRINTER_IP_MAP = {
  'Biuro': '192.168.1.236',
  'Magazyn': '192.168.1.237',
  'Handel': '192.168.1.240',
  'OSIP': '192.168.1.160', // Zaktualizowano na .160 zgodnie z konfiguracją użytkownika
};

function wyslijDoDrukarki(zpl, ip) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        client.setTimeout(5000);
        client.connect(9100, ip, () => {
            console.log(`[TCP] Wysyłanie danych do ${ip}...`);
            client.write(zpl, 'utf8', (err) => {
                if (err) { client.destroy(); return reject(err); }
                client.end();
                resolve();
            });
        });
        client.on('error', (err) => { client.destroy(); reject(err); });
        client.on('timeout', () => { client.destroy(); reject(new Error('Timeout połączenia z drukarką')); });
    });
}

app.get('/status', (req, res) => {
    res.json({ success: true, message: 'Serwer druku działa.' });
});

app.post('/drukuj-zpl', async (req, res) => {
    const { dane, drukarka, ip, typ } = req.body;
    
    // Ustalanie docelowego IP: priorytet ma pole 'ip', potem mapa nazw
    const targetIp = ip || PRINTER_IP_MAP[drukarka];
    
    console.log(`\n--- NOWE ZLECENIE [${new Date().toLocaleTimeString()}] ---`);
    console.log(`- Typ: ${typ}`);
    console.log(`- Drukarka (nazwa): ${drukarka || 'dynamiczna'}`);
    console.log(`- IP: ${targetIp}`);
    
    if (!targetIp) {
        console.error('❌ BŁĄD: Nie określono adresu IP drukarki.');
        return res.status(400).json({ success: false, message: 'Nieznana drukarka lub brak adresu IP.' });
    }

    let zplString = '';

    if (typeof dane === 'string') {
        zplString = dane;
    } else {
        const p = dane.palletData ? dane.palletData : dane;
        const idPalety = p.nrPalety || p.displayId || p.id || 'Brak ID';
        const nazwa = p.nazwa || p.productName || 'Brak Nazwy';
        const partia = p.batchNumber || p.batchId || '---';
        const uwagi = p.labAnalysisNotes || p.labNotes || '';
        
        let dProdRaw = p.dataProdukcji || p.productionDate || '---';
        const dProd = dProdRaw.includes('T') ? dProdRaw.split('T')[0] : dProdRaw;
        
        let dWaznRaw = p.dataPrzydatnosci || p.expiryDate || '---';
        const dWazn = dWaznRaw.includes('T') ? dWaznRaw.split('T')[0] : dWaznRaw;

        const wagaValue = p.currentWeight || p.quantityKg || p.producedWeight || 0;
        const waga = Number(wagaValue).toFixed(0);

        zplString = `^XA^CI28
^FO30,30^GB740,540,4^FS
^FO60,60^A0N,30,30^FD${typ.includes('raw') ? 'SUROWIEC' : 'WYRÓB GOTOWY'}^FS
^FO60,100^A0N,45,45^FD${nazwa.substring(0, 30)}^FS
^FO60,160^BY3^BCN,80,Y,N,N^FD${idPalety}^FS
^FO60,280^A0N,25,25^FDPARTIA: ${partia}^FS
^FO60,320^A0N,25,25^FDPRODUKCJA: ${dProd}^FS
^FO60,360^A0N,25,25^FDWAZNOSC:   ${dWazn}^FS
${uwagi ? `^FO60,400^A0N,20,20^FB680,3,0,L^FDNOTATKI LAB: ${uwagi.replace(/\n/g, ' ')}^FS` : ''}
^FO60,480^A0N,55,55^FDWAGA NETTO: ${waga} kg^FS
^XZ`;
    }

    try {
        await wyslijDoDrukarki(zplString, targetIp);
        console.log('✅ Sukces: Etykieta wysłana do drukarki.');
        res.json({ success: true });
    } catch (e) {
        console.error('❌ Błąd wydruku:', e.message);
        res.status(500).json({ success: false, message: e.message });
    }
});

const server = https.createServer(sslOptions, app);
server.listen(port, '0.0.0.0', () => {
  console.log(`\n🚀 MOST DO DRUKAREK AKTYWNY: https://192.168.1.143:${port}`);
});
