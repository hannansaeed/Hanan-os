export type StationId =
  | 'overview'
  | 'horizontal_monitor'
  | 'vertical_monitor'
  | 'desk'
  | 'server_rack'
  | 'social_linkedin'
  | 'social_github'
  | 'social_steam';

export interface StationConfig {
  id: StationId;
  label: string;
  shortCode: string;
  description: string;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  fov?: number;
}

export interface ProjectItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'Cybersecurity' | 'Systems & Low-level' | 'Android & Mobile' | 'Web & Graphics';
  year: string;
  status: 'Production' | 'Active Research' | 'Open Source' | 'Security Verified';
  featured: boolean;
  description: string;
  impact: string;
  architectureNotes: string[];
  technologies: string[];
  metrics: { label: string; value: string }[];
  liveDemoUrl?: string;
  githubUrl?: string;
  interactiveSimType: 'packet_analyzer' | 'apk_scanner' | 'gl_engine' | 'crypto_verify' | 'default';
}

export interface CTFChallenge {
  id: string;
  title: string;
  event: string;
  category: 'Web' | 'Reverse Engineering' | 'Cryptography' | 'Forensics' | 'Binary Exploitation / Pwn';
  difficulty: 'Medium' | 'Hard' | 'Insane';
  points: number;
  solvedDate: string;
  flagFormat: string;
  vulnerability: string;
  overview: string;
  writeupSummary: string[];
  exploitScriptSnippet: string;
}

export interface TimelineMilestone {
  year: string;
  period: string;
  title: string;
  role: string;
  highlight: string;
  details: string[];
  skillsAcquired: string[];
  badge: string;
}

export interface ServerMetric {
  service: string;
  status: 'ONLINE' | 'ACTIVE' | 'STANDBY';
  port: number;
  protocol: string;
  load: string;
  uptime: string;
}

export interface CertificationItem {
  name: string;
  issuer: string;
  year: string;
  verificationId: string;
  badgeCode: string;
}
