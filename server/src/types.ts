export interface InstalledApp {
  id: string;
  name: string;
  version: string;
  vendor: string;
  sizeMB: number;
  registryKey: string;
  appDataDir: string;
}

export interface Device {
  id: string;
  hostname: string;
  os: string;
  ip: string;
  status: 'Online' | 'Offline';
  lastSeen: string;
  installedApps: InstalledApp[];
}

export interface LogEntry {
  timestamp: string;
  step: string;
  message: string;
  tracesRemoved?: string[];
}

export interface UninstallJob {
  jobId: string;
  deviceId: string;
  hostname: string;
  appId: string;
  appName: string;
  vendor: string;
  targetEmail: string;
  cleanupDepth: 'standard' | 'deep' | 'forensic';
  autoPurgeTraces: boolean;
  status: 'Pending' | 'Triggered' | 'Validated' | 'Uninstalling' | 'Cleaning' | 'Completed' | 'Failed';
  protocolLink: string;
  webTriggerLink: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  logs: LogEntry[];
}

export interface JWTPayload {
  jobId: string;
  deviceId: string;
  appId: string;
  appName: string;
  cleanupDepth: 'standard' | 'deep' | 'forensic';
  autoPurgeTraces: boolean;
  targetEmail: string;
}
