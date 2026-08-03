import http from 'http';
import https from 'https';
import { TraceCleaner } from './cleaner';

const SERVER_URL = process.env.SERVER_URL || 'https://uninstall-agent.onrender.com';

/**
 * Helper to make HTTP/HTTPS JSON requests
 */
function makeRequest(url: string, method: string = 'GET', data: any = null): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const transport = parsedUrl.protocol === 'https:' ? https : http;
    const defaultPort = parsedUrl.protocol === 'https:' ? 443 : 80;

    const options: http.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || defaultPort,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = transport.request(options, (res) => {
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
 * Extract token from command line arguments or protocol string
 */
function extractToken(): string | null {
  const rawArg = process.argv.find(arg => arg.includes('token=') || arg.startsWith('sysclean://'));
  if (!rawArg) return null;

  if (rawArg.includes('token=')) {
    const parts = rawArg.split('token=');
    return parts[1].split('&')[0];
  }
  return null;
}

async function runAgent() {
  console.log('=== SysClean Enterprise Desktop Agent (TypeScript) ===');
  const token = extractToken();

  if (!token) {
    console.error('Error: Authorization token missing.');
    console.log('Usage: npx tsx client-agent/src/agent.ts sysclean://uninstall?token=<JWT_TOKEN>');
    process.exit(1);
  }

  console.log(`[Agent] Validating token with server (${SERVER_URL})...`);

  try {
    const verifyRes = await makeRequest(`${SERVER_URL}/api/uninstall/verify?token=${token}`);

    if (!verifyRes.success) {
      console.error(`[Agent] Token verification failed: ${verifyRes.message}`);
      process.exit(1);
    }

    console.log(`[Agent] Token Verified! App: ${verifyRes.appName} | Depth: ${verifyRes.cleanupDepth}`);

    await makeRequest(`${SERVER_URL}/api/uninstall/report`, 'POST', {
      token,
      step: 'AGENT_EXECUTING',
      status: 'Uninstalling',
      message: `Local desktop agent starting uninstallation of '${verifyRes.appName}'`
    });

    const cleaner = new TraceCleaner(verifyRes.appName, verifyRes.cleanupDepth);
    await cleaner.executeUninstallation();

    await makeRequest(`${SERVER_URL}/api/uninstall/report`, 'POST', {
      token,
      step: 'TRACE_PURGE',
      status: 'Cleaning',
      message: `Purging residual traces at level: ${verifyRes.cleanupDepth.toUpperCase()}...`
    });

    const purgedTraces = await cleaner.purgeResidualTraces();

    await makeRequest(`${SERVER_URL}/api/uninstall/report`, 'POST', {
      token,
      step: 'COMPLETED',
      status: 'Completed',
      message: `Uninstalled '${verifyRes.appName}' and purged ${purgedTraces.length} trace items.`,
      tracesRemoved: purgedTraces
    });

    console.log(`[Agent] Application uninstallation & trace purge completed successfully!`);
  } catch (err: any) {
    console.error(`[Agent] Error during execution: ${err.message}`);
  }
}

runAgent();
