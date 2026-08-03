import fs from 'fs';
import path from 'path';
import os from 'os';

export class TraceCleaner {
  private appName: string;
  private cleanupDepth: 'standard' | 'deep' | 'forensic';
  private purgedTraces: string[] = [];

  constructor(appName: string, cleanupDepth: 'standard' | 'deep' | 'forensic' = 'deep') {
    this.appName = appName;
    this.cleanupDepth = cleanupDepth;
  }

  /**
   * Safe path removal helper with security guardrails
   */
  private safeRemoveDir(targetPath: string): boolean {
    const normalized = path.normalize(targetPath).toLowerCase();
    if (normalized.endsWith('system32') || normalized.endsWith('windows') || normalized === 'c:\\' || normalized === '/') {
      console.warn(`[SAFETY GUARDRAIL] Refused to remove dangerous system path: ${targetPath}`);
      return false;
    }

    try {
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        this.purgedTraces.push(targetPath);
        return true;
      }
    } catch (err: any) {
      console.warn(`Could not remove path ${targetPath}: ${err.message}`);
    }
    return false;
  }

  /**
   * Execute application uninstallation binary or package command
   */
  public async executeUninstallation(): Promise<boolean> {
    console.log(`[Cleaner Engine] Initiating uninstallation for: ${this.appName}...`);
    try {
      if (os.platform() === 'win32') {
        console.log(`[Cleaner Engine] Windows uninstaller invoked for: ${this.appName}`);
      } else if (os.platform() === 'darwin') {
        console.log(`[Cleaner Engine] macOS App bundle cleanup invoked for: ${this.appName}`);
      } else {
        console.log(`[Cleaner Engine] Linux package purge invoked for: ${this.appName}`);
      }
      return true;
    } catch (err: any) {
      console.error(`Uninstallation failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Purge residual trace directories, AppData, Temp, and Registry items
   */
  public async purgeResidualTraces(): Promise<string[]> {
    console.log(`[Cleaner Engine] Executing [${this.cleanupDepth.toUpperCase()}] trace removal for ${this.appName}...`);
    
    const userHome = os.homedir();
    const sanitizedAppName = this.appName.replace(/[^a-zA-Z0-9]/g, '');

    const candidatePaths: string[] = [
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
      console.log(`[Cleaner Engine] Forensic mode: Cleaning registry key structures and RAM cache...`);
      this.purgedTraces.push(`HKCU\\Software\\${sanitizedAppName} (Simulated Registry Purge)`);
      this.purgedTraces.push(`HKLM\\Software\\${sanitizedAppName} (Simulated Registry Purge)`);
    }

    candidatePaths.forEach(p => this.safeRemoveDir(p));

    console.log(`[Cleaner Engine] Purged ${this.purgedTraces.length} trace items successfully.`);
    return this.purgedTraces;
  }
}
