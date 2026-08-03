const http = require('http');
const { execSync } = require('child_process');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    }).on('error', reject);
  });
}

function post(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => resolve(JSON.parse(b)));
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function testFlow() {
  console.log('1. Fetching Managed Devices & Apps...');
  const devRes = await get('http://localhost:3000/api/devices');
  const device = devRes.devices[0];
  if (!device || device.installedApps.length === 0) {
    console.log('No apps left on device 1, picking device 2...');
  }
  const appItem = device.installedApps[0] || devRes.devices[1].installedApps[0];

  console.log(`Targeting App: '${appItem.name}' on Host: '${device.hostname}'`);

  console.log('\n2. Dispatching Uninstall Request to Server...');
  const res = await post('http://localhost:3000/api/uninstall/request', {
    deviceId: device.id,
    appId: appItem.id,
    targetEmail: 'admin.user@company.com',
    cleanupDepth: 'forensic',
    autoPurgeTraces: true
  });

  console.log('Job Generated ID:', res.job.jobId);
  console.log('Protocol Link:', res.job.protocolLink);

  console.log('\n3. Executing Desktop Agent with Token...');
  const output = execSync(`node agent.js "${res.job.protocolLink}"`, { cwd: __dirname }).toString();
  console.log(output);

  console.log('\n4. Fetching Latest Job Status...');
  const jobRes = await get('http://localhost:3000/api/jobs');
  console.log('Latest Job Status:', jobRes.jobs[0].status);
  console.log('Total Logs Count:', jobRes.jobs[0].logs.length);
  console.log('Latest Log Entry:', jobRes.jobs[0].logs[jobRes.jobs[0].logs.length - 1]);
}

testFlow();
