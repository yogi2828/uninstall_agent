import { execSync } from 'child_process';
import path from 'path';
import os from 'os';

function registerProtocol() {
  console.log('=== SysClean Custom Protocol Scheme Installer (TypeScript) ===');

  if (os.platform() === 'win32') {
    const nodePath = process.execPath.replace(/\\/g, '\\\\');
    const agentPath = path.join(__dirname, '..', '..', 'dist', 'client-agent', 'src', 'agent.js').replace(/\\/g, '\\\\');

    const regCommands = [
      `reg add "HKCU\\Software\\Classes\\sysclean" /ve /t REG_SZ /d "URL:SysClean Uninstaller Protocol" /f`,
      `reg add "HKCU\\Software\\Classes\\sysclean" /v "URL Protocol" /t REG_SZ /d "" /f`,
      `reg add "HKCU\\Software\\Classes\\sysclean\\shell\\open\\command" /ve /t REG_SZ /d "\\"${nodePath}\\" \\"${agentPath}\\" \\"%1\\"" /f`
    ];

    try {
      console.log('Registering sysclean:// URI scheme in Windows Registry...');
      regCommands.forEach(cmd => execSync(cmd, { stdio: 'inherit' }));
      console.log('SUCCESS: sysclean:// custom protocol registered!');
    } catch (err: any) {
      console.error('Protocol registration error:', err.message);
    }
  } else {
    console.log(`Protocol registration notice: Desktop association on ${os.platform()} requires desktop file or app bundle.`);
  }
}

registerProtocol();
