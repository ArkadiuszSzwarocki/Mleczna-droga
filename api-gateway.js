
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3002;

app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

app.use(bodyParser.json({ limit: '50mb' }));

let systemSnapshot = {
  productionRuns: [],
  psdTasks: [],
  rawMaterials: [],
  finishedGoods: [],
  usersCount: 0,
  lastSyncTimestamp: null,
  status: 'awaiting_data'
};

// Endpoint główny do szybkiego sprawdzenia czy proces żyje
app.get('/', (req, res) => {
    res.send('Mleczna Droga API Gateway is Running');
});

app.post('/api/update', (req, res) => {
  systemSnapshot = {
    ...req.body,
    lastSyncTimestamp: new Date().toISOString(),
    status: 'online'
  };
  console.log(`[${new Date().toLocaleTimeString()}] Dane zaktualizowane przez MES`);
  res.json({ success: true, timestamp: systemSnapshot.lastSyncTimestamp });
});

app.get('/api/data', (req, res) => {
  if (!systemSnapshot.lastSyncTimestamp) {
    return res.status(404).json({ 
        error: "Brak danych", 
        details: "Brama działa, ale aplikacja MES nie przesłała jeszcze pierwszego pakietu danych." 
    });
  }
  res.json(systemSnapshot);
});

app.get('/status', (req, res) => {
  res.json({ 
    service: 'Mleczna Droga Gateway', 
    active: true,
    uptime: Math.floor(process.uptime()),
    lastSync: systemSnapshot.lastSyncTimestamp,
    dataReady: !!systemSnapshot.lastSyncTimestamp
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`\n====================================================`);
  console.log(`🚀 BRAMA PROXY DZIAŁA NA http://localhost:${port}/api/data`);
  console.log(`====================================================\n`);
});
