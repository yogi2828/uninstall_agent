const http = require('http');
const TraceCleaner = require('./cleaner');

const SERVER_URL = process.env.SERVER_URL || 'https://uninstall-agent.onrender.com';

/**
 * Helper to make HTTP JSON requests
 */
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

/**
 * Parse Token from command line arguments or protocol string (sysclean://uninstall?token=...)
 */
function extractToken() {
  const rawArg = process.argv.find(arg => arg.includes('token=') || arg.startsWith('sysclean://'));
  if (!rawArg) return null;

  if (rawArg.includes('token=')) {
    const parts = rawArg.split('token=');
    return parts[1].split('&')[0];
  }
  return null;
}

async function runAgent() {
  console.log('=== SysClean Desktop Helper Agent ===');
  const token = extractToken();

  if (!token) {
    console.error('Error: No authorization token provided.');
    console.log('Usage: node agent.js sysclean://uninstall?token=<JWT_TOKEN>');
    process.exit(1);
  }

  console.log(`[Agent] Validating token with management server (${SERVER_URL})...`);

  try {
    // Step 1: Verify token with Server
    const verifyRes = await makeRequest(`${SERVER_URL}/api/uninstall/verify?token=${token}`);
    
    if (!verifyRes.success) {
      console.error(`[Agent] Token verification failed: ${verifyRes.message}`);
      process.exit(1);
    }

    console.log(`[Agent] Verified! Target Application: ${verifyRes.appName}`);
    console.log(`[Agent] Cleanup Level: ${verifyRes.cleanupDepth}`);

    // Step 2: Report Execution Start
    await makeRequest(`${SERVER_URL}/api/uninstall/report`, 'POST', {
      token,
      step: 'AGENT_EXECUTING',
      status: 'Uninstalling',
      message: `Local agent started uninstallation routine for '${verifyRes.appName}'`
    });

    // Step 3: Run Cleaner Engine
    const cleaner = new TraceCleaner(verifyRes.appName, verifyRes.cleanupDepth);
    await cleaner.executeUninstallation();

    // Step 4: Report Trace Purging
    await makeRequest(`${SERVER_URL}/api/uninstall/report`, 'POST', {
      token,
      step: 'TRACE_PURGE',
      status: 'Cleaning',
      message: `Executing ${verifyRes.cleanupDepth.toUpperCase()} trace removal...`
    });

    const purgedTraces = await cleaner.purgeResidualTraces();

    // Step 5: Report Completion
    await makeRequest(`${SERVER_URL}/api/uninstall/report`, 'POST', {
      token,
      step: 'COMPLETED',
      status: 'Completed',
      message: `Successfully uninstalled '${verifyRes.appName}' and removed all traces (${purgedTraces.length} items purged).`,
      tracesRemoved: purgedTraces
    });

    console.log(`[Agent] Uninstallation and deep trace removal completed successfully!`);
  } catch (err) {
    console.error(`[Agent] Execution error: ${err.message}`);
  }
}

runAgent();
