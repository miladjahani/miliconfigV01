export interface CfAccount {
  id: string;
  name: string;
}

export interface CfZone {
  id: string;
  name: string;
}

export type DeployMethod = 'workers' | 'pages';

export interface WizardState {
  lang: 'en' | 'fa';
  theme: 'dark' | 'light';
  token: string;
  accountId: string;
  accountName: string;
  method: DeployMethod;
  scriptName: string;
  uuid: string;
  customPath: string;
  customDomain: string;
  zoneId: string;
  sourceUrl: string;
  accounts: CfAccount[];
  zones: CfZone[];
}

export type SigState = 'idle' | 'verify' | 'online' | 'error';

export type LogLevel = 'step' | 'ok' | 'err' | 'warn';

export interface LogEntry {
  id: number;
  time: string;
  text: string;
  level: LogLevel;
  caret?: boolean;
}

export interface DeployResult {
  baseUrl: string;
  panelUrl: string;
  kvId: string;
  method: DeployMethod;
  scriptName: string;
}
