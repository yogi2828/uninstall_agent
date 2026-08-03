const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

function registerProtocol() {
  console.log('=== SysClean Custom Protocol Handler Registration ===');

  if (os.platform() === 'win32') {
    const nodePath = process.execPath.replace(/\\/g, '\\\\');
    const agentPath = path.join(__dirname, 'agent.js').replace(/\\/g, '\\\\');

    const regCommands = [
      `reg add "HKCU\\Software\\Classes\\sysclean" /ve /t REG_SZ /d "URL:SysClean Uninstaller Protocol" /f`,
      `reg add "HKCU\\Software\\Classes\\sysclean" /v "URL Protocol" /t REG_SZ /d "" /f`,
      `reg add "HKCU\\Software\\Classes\\sysclean\\shell\\open\\command" /ve /t REG_SZ /d "\\"${nodePath}\\" \\"${agentPath}\\" \\"%1\\"" /f`
    ];

    try {
      console.log('Registering sysclean:// scheme in Windows HKCU registry...');
      regCommands.forEach(cmd => {
        execSync(cmd, { stdio: 'inherit' });
      });
      console.log('SUCCESS: sysclean:// custom URI protocol registered successfully!');
      console.log('Clicking email links containing sysclean://uninstall?token=... will now trigger the Desktop Agent.');
    } catch (err) {
      console.error('Registry protocol creation failed:', err.message);
    }
  } else {
    console.log(`Protocol registration notice: Custom URI schemes on ${os.platform()} require desktop file or app bundle association.`);
  }
}

registerProtocol();
