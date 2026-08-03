import http from 'http';
import https from 'https';
import { execSync } from 'child_process';
import path from 'path';

function request(url: string, method: string = 'GET', body: any = null): Promise<any> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const transport = u.protocol === 'https:' ? https : http;
    const req = transport.request({
      hostname: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname + u.search,
      method: method,
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve(JSON.parse(b)); } catch (e) { resolve(b); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function testFlow() {
  const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
  console.log(`1. Connecting to Server (${SERVER_URL})...`);
  
  const devRes = await request(`${SERVER_URL}/api/devices`);
  const device = devRes.devices[0];
  const appItem = device.installedApps[0] || devRes.devices[1].installedApps[0];

  console.log(`Target App: '${appItem.name}' on Host: '${device.hostname}'`);

  console.log('\n2. Requesting Uninstall Token from Server...');
  const res = await request(`${SERVER_URL}/api/uninstall/request`, 'POST', {
    deviceId: device.id,
    appId: appItem.id,
    targetEmail: 'admin.user@company.com',
    cleanupDepth: 'forensic',
    autoPurgeTraces: true
  });

  console.log('Job Generated ID:', res.job.jobId);
  console.log('Protocol Link:', res.job.protocolLink);

  console.log('\n3. Executing Agent with Token via TSX...');
  const agentScript = path.join(__dirname, 'agent.ts');
  const output = execSync(`npx tsx "${agentScript}" "${res.job.protocolLink}"`, {
    env: { ...process.env, SERVER_URL }
  }).toString();
  console.log(output);

  console.log('\n4. Verifying Server Job Log Stream...');
  const jobRes = await request(`${SERVER_URL}/api/jobs`);
  console.log('Latest Job Status:', jobRes.jobs[0].status);
  console.log('Latest Log Entry:', jobRes.jobs[0].logs[jobRes.jobs[0].logs.length - 1]);
}

testFlow();
