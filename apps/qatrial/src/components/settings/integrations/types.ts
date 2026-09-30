export interface JiraStatus {
  connected: boolean;
  projectKey?: string;
  baseUrl?: string;
  lastSyncAt?: string;
}

export interface GithubStatus {
  connected: boolean;
  owner?: string;
  repo?: string;
  lastSyncAt?: string;
}

export interface SapStatus {
  connected: boolean;
  baseUrl?: string;
  client?: string;
  system?: string;
  lastSyncAt?: string;
}

export interface LimsStatus {
  connected: boolean;
  baseUrl?: string;
  labId?: string;
  lastSyncAt?: string;
}
