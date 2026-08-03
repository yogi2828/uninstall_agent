import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import path from 'path';
import http from 'http';
import https from 'https';
import { Device, UninstallJob, JWTPayload } from './types';

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sysclean-enterprise-secret-key-2026';

app.use(cors());
app.use(express.json());

// Serve static web dashboard from public folder
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Initial managed devices store
const devices: Device[] = [
  {
    id: 'dev-001',
    hostname: 'DESKTOP-PRO-EXPRESS',
    os: 'Windows 11 Enterprise (x64)',
    ip: '192.168.1.105',
    status: 'Online',
    lastSeen: new Date().toISOString(),
    installedApps: [
      { id: 'app-bloatware-01', name: 'Legacy Toolbar Sync', version: '4.2.1', vendor: 'AdSync Corp', sizeMB: 145, registryKey: 'HKCU\\Software\\LegacyToolbarSync', appDataDir: 'AppData\\Local\\LegacyToolbarSync' },
      { id: 'app-crm-helper', name: 'Old CRM Desktop Helper', version: '2.1.0', vendor: 'CloudSolutions', sizeMB: 320, registryKey: 'HKLM\\Software\\OldCRMHelper', appDataDir: 'AppData\\Roaming\\OldCRMHelper' },
      { id: 'app-pdf-converter', name: 'Fast PDF Converter Pro', version: '1.0.4', vendor: 'DocTools', sizeMB: 88, registryKey: 'HKLM\\Software\\FastPDFConverterPro', appDataDir: 'AppData\\Local\\FastPDFConverter' },
      { id: 'app-temp-cleaner', name: 'Optimizer Utility v3', version: '3.0.0', vendor: 'UtilitySoft', sizeMB: 210, registryKey: 'HKCU\\Software\\OptimizerUtility', appDataDir: 'AppData\\Local\\TempOptimizer' }
    ]
  },
  {
    id: 'dev-002',
    hostname: 'WORKSTATION-FINANCE-02',
    os: 'Windows 10 Pro (x64)',
    ip: '192.168.1.112',
    status: 'Online',
    lastSeen: new Date().toISOString(),
    installedApps: [
      { id: 'app-legacy-banking', name: 'Legacy Banking Client', version: '1.5.8', vendor: 'FinTech Systems', sizeMB: 512, registryKey: 'HKLM\\Software\\LegacyBanking', appDataDir: 'AppData\\Roaming\\LegacyBanking' },
      { id: 'app-pdf-converter', name: 'Fast PDF Converter Pro', version: '1.0.4', vendor: 'DocTools', sizeMB: 88, registryKey: 'HKLM\\Software\\FastPDFConverterPro', appDataDir: 'AppData\\Local\\FastPDFConverter' }
    ]
  }
];

const uninstallJobs: UninstallJob[] = [];

// Fallback route for single page dashboard
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 1. Devices Inventory Endpoint
app.get('/api/devices', (req: Request, res: Response) => {
  res.json({ success: true, devices });
});

// 2. Dispatch Uninstall Email Request & Generate Token
app.post('/api/uninstall/request', (req: Request, res: Response) => {
  const { deviceId, appId, targetEmail, cleanupDepth, autoPurgeTraces } = req.body;

  const device = devices.find(d => d.id === deviceId);
  if (!device) return res.status(404).json({ success: false, message: 'Device not found' });

  const appItem = device.installedApps.find(a => a.id === appId);
  if (!appItem) return res.status(404).json({ success: false, message: 'Application not found on target device' });

  const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const tokenPayload: JWTPayload = {
    jobId,
    deviceId,
    appId,
    appName: appItem.name,
    cleanupDepth: cleanupDepth || 'deep',
    autoPurgeTraces: autoPurgeTraces !== undefined ? autoPurgeTraces : true,
    targetEmail: targetEmail || 'user@company.com'
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

  const protocolLink = `sysclean://uninstall?token=${token}`;
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol || 'http';
  const webTriggerLink = `${protocol}://${host}/api/uninstall/trigger-web?token=${token}`;

  const newJob: UninstallJob = {
    jobId,
    deviceId,
    hostname: device.hostname,
    appId,
    appName: appItem.name,
    vendor: appItem.vendor,
    targetEmail: targetEmail || 'user@company.com',
    cleanupDepth: cleanupDepth || 'deep',
    autoPurgeTraces: autoPurgeTraces !== undefined ? autoPurgeTraces : true,
    status: 'Pending',
    protocolLink,
    webTriggerLink,
    token,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    logs: [
      { timestamp: new Date().toISOString(), step: 'JOB_CREATED', message: `Uninstall job initialized for '${appItem.name}' on device '${device.hostname}'` },
      { timestamp: new Date().toISOString(), step: 'EMAIL_SENT', message: `Dispatching trigger link to email: ${targetEmail || 'user@company.com'}` }
    ]
  };

  uninstallJobs.unshift(newJob);

  res.json({
    success: true,
    message: 'Uninstall email link generated and dispatched successfully.',
    job: newJob
  });
});

// 3. Web Trigger Link Handler (Browser Email Trigger)
app.get('/api/uninstall/trigger-web', (req: Request, res: Response) => {
  const token = req.query.token as string;
  if (!token) return res.status(400).send('Missing uninstall token');

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const job = uninstallJobs.find(j => j.jobId === decoded.jobId);
    
    if (job) {
      job.status = 'Triggered';
      job.updatedAt = new Date().toISOString();
      job.logs.push({
        timestamp: new Date().toISOString(),
        step: 'EMAIL_CLICKED',
        message: 'User clicked the email link. Protocol launcher requested.'
      });
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Launching SysClean Auto-Uninstaller</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
          .card { background: #1e293b; border: 1px solid #334155; padding: 2.5rem; border-radius: 16px; max-width: 500px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
          .spinner { border: 4px solid rgba(255,255,255,0.1); border-left-color: #38bdf8; border-radius: 50%; width: 50px; height: 50px; animation: spin 1s linear infinite; margin: 1.5rem auto; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .btn { background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; margin-top: 1rem; }
          .badge { background: #0284c7; color: #e0f2fe; padding: 4px 12px; border-radius: 9999px; font-size: 0.85rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>SysClean Automatic Uninstaller</h2>
          <p>Requesting local agent execution for app: <strong>${decoded.appName}</strong></p>
          <div class="spinner"></div>
          <p style="color: #94a3b8; font-size: 0.9rem;">Triggering local system helper agent via <code>sysclean://</code> protocol scheme...</p>
          <a href="sysclean://uninstall?token=${token}" class="btn">Click Here if Agent Does Not Launch Automatically</a>
          <br/><br/>
          <span class="badge">Trace Purge Mode: ${decoded.cleanupDepth.toUpperCase()}</span>
        </div>
        <script>
          window.location.href = "sysclean://uninstall?token=${token}";
        </script>
      </body>
      </html>
    `);
  } catch (err: any) {
    res.status(401).send(`Invalid or expired token: ${err.message}`);
  }
});

// 4. Token Verification (Agent Endpoint)
app.get('/api/uninstall/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = (req.query.token as string) || (authHeader && authHeader.split(' ')[1]);

  if (!token) return res.status(400).json({ success: false, message: 'Token required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const job = uninstallJobs.find(j => j.jobId === decoded.jobId);

    if (!job) return res.status(404).json({ success: false, message: 'Job record not found' });

    job.status = 'Validated';
    job.updatedAt = new Date().toISOString();
    job.logs.push({
      timestamp: new Date().toISOString(),
      step: 'AGENT_CONNECTED',
      message: 'Desktop agent connected and validated authorization token.'
    });

    res.json({
      success: true,
      jobId: decoded.jobId,
      deviceId: decoded.deviceId,
      appId: decoded.appId,
      appName: decoded.appName,
      cleanupDepth: decoded.cleanupDepth,
      autoPurgeTraces: decoded.autoPurgeTraces
    });
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired token', error: err.message });
  }
});

// 5. Progress Report (Agent Endpoint)
app.post('/api/uninstall/report', (req: Request, res: Response) => {
  const { token, step, status, message, tracesRemoved } = req.body;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const job = uninstallJobs.find(j => j.jobId === decoded.jobId);

    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    if (status) job.status = status;
    job.updatedAt = new Date().toISOString();

    const logEntry = {
      timestamp: new Date().toISOString(),
      step: step || 'PROGRESS',
      message: message || 'Agent activity reported.',
      tracesRemoved: tracesRemoved || []
    };

    job.logs.push(logEntry);

    if (status === 'Completed') {
      const device = devices.find(d => d.id === job.deviceId);
      if (device) {
        device.installedApps = device.installedApps.filter(a => a.id !== job.appId);
      }
    }

    res.json({ success: true, message: 'Report logged successfully' });
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// 6. Get Jobs History
app.get('/api/jobs', (req: Request, res: Response) => {
  res.json({ success: true, jobs: uninstallJobs });
});

// 7. Health Check & Keep-Alive Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ success: true, status: 'alive', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`[SysClean TypeScript Server] Running on http://localhost:${PORT}`);

  // Automated Keep-Alive Self-Ping Engine (Prevents Render.com 50s spin down)
  const KEEP_ALIVE_URL = process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL || `http://localhost:${PORT}`;
  
  // Ping every 5 minutes (300,000 ms) in all cloud environments
  if (process.env.NODE_ENV === 'production' || process.env.RENDER_EXTERNAL_URL || process.env.KEEP_ALIVE_URL) {
    console.log(`[Keep-Alive Engine] Active! Ping interval: 5m -> ${KEEP_ALIVE_URL}`);
    const httpLib = KEEP_ALIVE_URL.startsWith('https') ? https : http;

    setInterval(() => {
      httpLib.get(`${KEEP_ALIVE_URL}/api/health`, (res) => {
        console.log(`[Keep-Alive] Ping sent to ${KEEP_ALIVE_URL}/api/health - Response: ${res.statusCode}`);
      }).on('error', (err) => {
        console.warn(`[Keep-Alive] Ping failed: ${err.message}`);
      });
    }, 5 * 60 * 1000);
  }
});
