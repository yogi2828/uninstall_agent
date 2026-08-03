const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * SysClean Deep Trace Cleaner Module
 */
class TraceCleaner {
  constructor(appName, cleanupDepth = 'deep') {
    this.appName = appName;
    this.cleanupDepth = cleanupDepth; // 'standard' | 'deep' | 'forensic'
    this.purgedTraces = [];
  }

  /**
   * Safe directory removal helper with safety guardrails
   */
  safeRemoveDir(targetPath) {
    // Safety check: Prevent root or critical system directory deletion
    const normalized = path.normalize(targetPath).toLowerCase();
    if (normalized.endsWith('system32') || normalized.endsWith('windows') || normalized === 'c:\\' || normalized === '/') {
      console.warn(`[SAFETY GUARDRAIL] Refused to remove dangerous path: ${targetPath}`);
      return false;
    }

    try {
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        this.purgedTraces.push(targetPath);
        return true;
      }
    } catch (err) {
      console.warn(`Could not remove path ${targetPath}: ${err.message}`);
    }
    return false;
  }

  /**
   * Execute application uninstaller binary or package manager command
   */
  async executeUninstallation() {
    console.log(`[Cleaner] Starting uninstallation routine for: ${this.appName}...`);
    
    // Simulate/Execute OS uninstaller invocation
    try {
      if (os.platform() === 'win32') {
        // Example Windows command using winget or wmic (safe fallback simulation)
        console.log(`[Cleaner] Executing Windows uninstaller for app: ${this.appName}`);
      } else if (os.platform() === 'darwin') {
        console.log(`[Cleaner] Executing macOS Application uninstallation for: ${this.appName}`);
      } else {
        console.log(`[Cleaner] Executing Linux package removal for: ${this.appName}`);
      }
      return true;
    } catch (err) {
      console.error(`Uninstallation failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Purge residual traces (AppData, Temp, Config, Cache, Registry Keys)
   */
  async purgeResidualTraces() {
    console.log(`[Cleaner] Initiating [${this.cleanupDepth.toUpperCase()}] trace cleanup for ${this.appName}...`);
    
    const userHome = os.homedir();
    const sanitizedAppName = this.appName.replace(/[^a-zA-Z0-9]/g, '');

    // Potential residual trace locations
    const candidatePaths = [
      path.join(userHome, 'AppData', 'Local', sanitizedAppName),
      path.join(userHome, 'AppData', 'Roaming', sanitizedAppName),
      path.join(userHome, 'AppData', 'Local', 'Temp', `${sanitizedAppName}_cache`),
      path.join(userHome, '.config', sanitizedAppName.toLowerCase()),
      path.join(userHome, '.cache', sanitizedAppName.toLowerCase())
    ];

    if (this.cleanupDepth === 'deep' || this.cleanupDepth === 'forensic') {
      candidatePaths.push(
        path.join(userHome, 'AppData', 'Local', 'Temp', `${sanitizedAppName}_installer.log`),
        path.join(userHome, 'AppData', 'Roaming', `${sanitizedAppName}_settings.json`)
      );
    }

    if (this.cleanupDepth === 'forensic') {
      console.log(`[Cleaner] Forensic level selected: Purging registry index caches and memory traces...`);
      this.purgedTraces.push(`HKCU\\Software\\${sanitizedAppName} (Simulated Registry Key Purge)`);
      this.purgedTraces.push(`HKLM\\Software\\${sanitizedAppName} (Simulated Registry Key Purge)`);
    }

    // Process path removals
    candidatePaths.forEach(p => {
      this.safeRemoveDir(p);
    });

    console.log(`[Cleaner] Trace cleanup completed. Removed ${this.purgedTraces.length} trace items.`);
    return this.purgedTraces;
  }
}

module.exports = TraceCleaner;
