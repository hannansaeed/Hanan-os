import * as THREE from 'three';
import { StationId } from '../types';
import { STATIONS } from '../data/portfolioData';
import { CRTShader } from './shaders/crtShader';
import { DustParticleShader } from './shaders/serverLedShader';
import { soundEngine } from '../audio/soundEngine';

export interface RaycastHitInfo {
  stationId: StationId;
  label: string;
  hint: string;
}

export class RoomScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animFrameId: number | null = null;
  private clock: THREE.Clock;

  // Camera & Walk state
  private currentCameraPos: THREE.Vector3;
  private targetCameraPos: THREE.Vector3;
  private currentCameraLook: THREE.Vector3;
  private targetCameraLook: THREE.Vector3;
  private targetFov: number = 60;
  private activeStation: StationId = 'overview';
  private isInspecting: boolean = false;

  // First-person walk controls
  private isWalkMode: boolean = true;
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private walkSpeed = 3.6;
  private yaw = 0;
  private pitch = 0;
  private isMouseDown = false;
  private prevMouseX = 0;
  private prevMouseY = 0;

  // Interactive raycasting
  private interactiveObjects: THREE.Object3D[] = [];
  private objectStationMap = new Map<THREE.Object3D, StationId>();
  private hoveredStationId: StationId | null = null;
  private raycaster = new THREE.Raycaster();
  private centerCrosshair = new THREE.Vector2(0, 0);

  // Dynamic canvas textures for monitors
  private horizCanvas!: HTMLCanvasElement;
  private horizCtx!: CanvasRenderingContext2D;
  private horizTexture!: THREE.CanvasTexture;
  private horizMaterial!: THREE.ShaderMaterial;

  private vertCanvas!: HTMLCanvasElement;
  private vertCtx!: CanvasRenderingContext2D;
  private vertTexture!: THREE.CanvasTexture;
  private vertMaterial!: THREE.ShaderMaterial;

  // Dynamic canvas for Primary Server 1 Status LCD
  private serverLcdCanvas!: HTMLCanvasElement;
  private serverLcdCtx!: CanvasRenderingContext2D;
  private serverLcdTexture!: THREE.CanvasTexture;

  // Animated 3D objects
  private dustPoints!: THREE.Points;
  private fanRotors: THREE.Mesh[] = [];
  private server1Leds: { mesh: THREE.Mesh; baseColor: number; blinkRate: number }[] = [];
  private server2Leds: { mesh: THREE.Mesh; baseColor: number; blinkRate: number }[] = [];
  private routerLeds: THREE.Mesh[] = [];
  private deskLampLight!: THREE.PointLight;

  // Callbacks
  public onStationSelect?: (stationId: StationId) => void;
  public onHoverChange?: (hit: RaycastHitInfo | null) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0e111a);
    this.scene.fog = new THREE.FogExp2(0x0e111a, 0.018);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);

    // Initial position: entrance facing the desk
    this.camera.position.set(0, 1.7, 3.2);
    this.currentCameraPos = this.camera.position.clone();
    this.targetCameraPos = this.camera.position.clone();

    this.currentCameraLook = new THREE.Vector3(0, 1.35, -3.2);
    this.targetCameraLook = this.currentCameraLook.clone();
    this.camera.lookAt(this.currentCameraLook);

    // High quality WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    // Standard default cursor (no grab/grabbing or custom crosshairs)
    this.renderer.domElement.style.cursor = 'default';
    container.appendChild(this.renderer.domElement);

    // Build the detailed 3D room
    this.initCanvasScreens();
    this.setupLighting();
    this.buildRoomArchitecture();
    this.buildWorkbenchDesk();
    this.buildDesktopRigPC();
    this.buildMonitors();
    this.buildKeyboardAndMouse();
    this.buildHeadphones();
    this.buildDeskProps();
    this.buildDroopingCables();
    this.buildWallShelf();
    this.buildDualServers(); // 2 physical servers: Server 1 interactable, Server 2 companion
    this.buildCTFBoard();
    this.buildTimelineWall();
    this.buildExitPortal();
    this.buildDustParticles();

    // Bind event listeners
    this.bindEvents();

    // Start render loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  /* ----------------------------------------------------
     Canvas Screens: Horizontal Desktop, Vertical Terminal, Server LCD
  ---------------------------------------------------- */
  private initCanvasScreens() {
    // 1. Horizontal Desktop Screen (1024x576)
    this.horizCanvas = document.createElement('canvas');
    this.horizCanvas.width = 1024;
    this.horizCanvas.height = 576;
    this.horizCtx = this.horizCanvas.getContext('2d')!;
    this.horizTexture = new THREE.CanvasTexture(this.horizCanvas);

    this.horizMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.horizTexture },
        uTime: { value: 0.0 },
        uCurvature: { value: 0.04 },
        uScanlineIntensity: { value: 0.14 },
        uFlicker: { value: 0.01 },
        uBrightness: { value: 1.15 },
        uTint: { value: new THREE.Color(0.95, 0.98, 1.0) },
      },
      vertexShader: CRTShader.vertexShader,
      fragmentShader: CRTShader.fragmentShader,
    });

    // 2. Vertical Terminal Screen (512x1024)
    this.vertCanvas = document.createElement('canvas');
    this.vertCanvas.width = 512;
    this.vertCanvas.height = 1024;
    this.vertCtx = this.vertCanvas.getContext('2d')!;
    this.vertTexture = new THREE.CanvasTexture(this.vertCanvas);

    this.vertMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.vertTexture },
        uTime: { value: 0.0 },
        uCurvature: { value: 0.04 },
        uScanlineIntensity: { value: 0.18 },
        uFlicker: { value: 0.015 },
        uBrightness: { value: 1.2 },
        uTint: { value: new THREE.Color(0.88, 1.0, 0.9) },
      },
      vertexShader: CRTShader.vertexShader,
      fragmentShader: CRTShader.fragmentShader,
    });

    // 3. Primary Server 1 Status LCD Screen (256x64)
    this.serverLcdCanvas = document.createElement('canvas');
    this.serverLcdCanvas.width = 256;
    this.serverLcdCanvas.height = 64;
    this.serverLcdCtx = this.serverLcdCanvas.getContext('2d')!;
    this.serverLcdTexture = new THREE.CanvasTexture(this.serverLcdCanvas);
  }

  private updateScreensContent(elapsed: number) {
    // 1. HORIZONTAL DESKTOP GUI
    const hc = this.horizCtx;
    hc.fillStyle = '#090f1d';
    hc.fillRect(0, 0, 1024, 576);

    // Subtle background cyber grid
    hc.strokeStyle = 'rgba(56, 189, 248, 0.07)';
    hc.lineWidth = 1;
    for (let x = 0; x < 1024; x += 48) {
      hc.beginPath();
      hc.moveTo(x, 0);
      hc.lineTo(x, 576);
      hc.stroke();
    }
    for (let y = 0; y < 576; y += 48) {
      hc.beginPath();
      hc.moveTo(0, y);
      hc.lineTo(1024, y);
      hc.stroke();
    }

    // Workstation watermark
    hc.font = 'bold 36px "Syne", sans-serif';
    hc.fillStyle = 'rgba(244, 63, 94, 0.22)';
    hc.textAlign = 'center';
    hc.fillText('HANAN // WORKSTATION', 512, 260);
    hc.font = 'bold 15px "JetBrains Mono", monospace';
    hc.fillStyle = 'rgba(56, 189, 248, 0.35)';
    hc.fillText('CYBERSPACE RIG · OS v3.8.4', 512, 292);
    hc.textAlign = 'left';

    // Left App Icons
    const icons = [
      { name: 'Projects.exe', tag: 'Core Systems', color: '#38bdf8' },
      { name: 'About_Me.txt', tag: 'Bio & Engineering', color: '#fb7185' },
      { name: 'Resume_CV.pdf', tag: 'Curriculum Vitae', color: '#34d399' },
      { name: 'CTF_Vault.sh', tag: 'Exploit Writeups', color: '#fbbf24' },
      { name: 'Comms.app', tag: 'Encrypted Mail', color: '#c084fc' },
    ];

    icons.forEach((ic, i) => {
      const iy = 50 + i * 86;
      hc.fillStyle = 'rgba(15, 23, 42, 0.9)';
      hc.strokeStyle = 'rgba(71, 85, 105, 0.5)';
      hc.lineWidth = 1.5;
      hc.beginPath();
      hc.roundRect(40, iy, 190, 68, 6);
      hc.fill();
      hc.stroke();

      hc.fillStyle = ic.color;
      hc.beginPath();
      hc.arc(62, iy + 24, 7, 0, Math.PI * 2);
      hc.fill();

      hc.font = 'bold 14px "JetBrains Mono", monospace';
      hc.fillStyle = '#f8fafc';
      hc.fillText(ic.name, 80, iy + 29);

      hc.font = '11px "Plus Jakarta Sans", sans-serif';
      hc.fillStyle = '#94a3b8';
      hc.fillText(ic.tag, 60, iy + 52);
    });

    // Active Window: Projects & Systems Explorer
    hc.fillStyle = '#0f172a';
    hc.strokeStyle = '#2563eb';
    hc.lineWidth = 2;
    hc.beginPath();
    hc.roundRect(260, 50, 720, 460, 8);
    hc.fill();
    hc.stroke();

    // Window Titlebar
    hc.fillStyle = '#1e293b';
    hc.beginPath();
    hc.roundRect(260, 50, 720, 36, [8, 8, 0, 0]);
    hc.fill();
    hc.font = 'bold 13px "JetBrains Mono", monospace';
    hc.fillStyle = '#93c5fd';
    hc.fillText('HANAN//OS — Projects & Systems Explorer (v3.8)', 280, 73);

    // Window controls
    ['#ef4444', '#eab308', '#22c55e'].forEach((col, idx) => {
      hc.fillStyle = col;
      hc.beginPath();
      hc.arc(935 + idx * 16, 68, 5, 0, Math.PI * 2);
      hc.fill();
    });

    // Project Cards
    const cards = [
      {
        title: 'Android Kernel IPC Monitor',
        tag: 'eBPF · Binder Security · Rust',
        desc: 'Kernel hook monitor tracing Android Binder IPC calls with zero-drop ringbuffers.',
        color: '#38bdf8',
      },
      {
        title: 'Sentinel Autonomous CTF Engine',
        tag: 'Pwn · Symbolics · Python/C',
        desc: 'Autonomous exploit generator analyzing binary vulnerabilities and stack clobbering.',
        color: '#fb7185',
      },
      {
        title: 'Post-Quantum PQC Key Exchange',
        tag: 'Kyber-768 · Dilithium · Go',
        desc: 'Production hybrid post-quantum TLS cipher proxy with constant-time verification.',
        color: '#34d399',
      },
    ];

    cards.forEach((c, idx) => {
      const cy = 105 + idx * 105;
      hc.fillStyle = '#131d33';
      hc.strokeStyle = c.color;
      hc.lineWidth = 1.5;
      hc.beginPath();
      hc.roundRect(280, cy, 680, 92, 6);
      hc.fill();
      hc.stroke();

      hc.font = 'bold 16px "Syne", sans-serif';
      hc.fillStyle = '#ffffff';
      hc.fillText(c.title, 300, cy + 28);

      hc.font = 'bold 12px "JetBrains Mono", monospace';
      hc.fillStyle = c.color;
      hc.fillText(c.tag, 300, cy + 50);

      hc.font = '12px "Plus Jakarta Sans", sans-serif';
      hc.fillStyle = '#94a3b8';
      hc.fillText(c.desc, 300, cy + 74);
    });

    // Action banner inside desktop window
    hc.fillStyle = '#0a101d';
    hc.beginPath();
    hc.roundRect(280, 428, 680, 68, 6);
    hc.fill();
    hc.font = 'bold 13px "JetBrains Mono", monospace';
    hc.fillStyle = '#38bdf8';
    hc.fillText('CLICK MONITOR OR PRESS [E] TO INSPECT FULL PROJECTS & CV', 300, 456);
    hc.font = '11px "JetBrains Mono", monospace';
    hc.fillStyle = '#94a3b8';
    hc.fillText('> Access live APK interactive sandbox & verified security certifications', 300, 478);

    // Desktop Taskbar
    hc.fillStyle = '#060a12';
    hc.fillRect(0, 536, 1024, 40);
    hc.strokeStyle = '#1e293b';
    hc.beginPath();
    hc.moveTo(0, 536);
    hc.lineTo(1024, 536);
    hc.stroke();

    hc.fillStyle = '#2563eb';
    hc.beginPath();
    hc.roundRect(12, 542, 90, 28, 4);
    hc.fill();
    hc.font = 'bold 12px "JetBrains Mono", monospace';
    hc.fillStyle = '#ffffff';
    hc.fillText('START', 36, 561);

    hc.font = '12px "JetBrains Mono", monospace';
    hc.fillStyle = '#94a3b8';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} PST`;
    hc.fillText(`ONLINE · ${timeStr}`, 840, 561);

    this.horizTexture.needsUpdate = true;

    // 2. VERTICAL TERMINAL SCREEN (Live Streaming CLI)
    const vc = this.vertCtx;
    vc.fillStyle = '#060f0a';
    vc.fillRect(0, 0, 512, 1024);

    // Titlebar
    vc.fillStyle = '#0e2417';
    vc.fillRect(0, 0, 512, 50);
    vc.font = 'bold 16px "JetBrains Mono", monospace';
    vc.fillStyle = '#34d399';
    vc.fillText('hanan@workstation-os:~ (pty/1)', 24, 32);

    const lines = [
      'Linux workstation-os 6.9.1-security-ebpf #1 SMP x86_64',
      'Debian GNU/Linux 12 (bookworm) — Offensive Security Lab',
      'System Uptime: 48 days, 14 hours, 22 minutes',
      '',
      '$ whoami',
      'hanan :: cybersecurity researcher & systems software engineer',
      '',
      '$ nmap -sS -p 22,80,443,8443,9090 127.0.0.1',
      'PORT     STATE SERVICE',
      '22/tcp   open  ssh (OpenSSH 9.2)',
      '80/tcp   open  http (Caddy / HTTP3)',
      '443/tcp  open  https (TLS 1.3)',
      '8443/tcp open  hanan-core-daemon',
      '9090/tcp open  sentinel-jail (CTF)',
      '',
      '$ cat /proc/ctf_ranking',
      'DEFCON Quals: Top 2% Worldwide',
      'HTB University: 8th Place Global',
      'Active Exploits: Heap Tcache / Curve25519 Fault',
      '',
      '$ ./monitor_ingress.sh',
      `[eBPF-XDP] ${((elapsed * 50) % 999).toFixed(0)} packets/s | Drops: 0`,
      `[SELinux] Enforcing mode: verified zero escapes`,
      `[Kyber-PQC] 768-bit key exchange: 12.4µs latency`,
      '',
      'hanan@workstation-os:~$ _',
    ];

    let lineY = 80;
    lines.forEach((l) => {
      if (l.startsWith('$')) {
        vc.fillStyle = '#6ee7b7';
        vc.font = 'bold 13px "JetBrains Mono", monospace';
      } else if (l.includes('open') || l.includes('Top') || l.includes('verified')) {
        vc.fillStyle = '#34d399';
        vc.font = '12px "JetBrains Mono", monospace';
      } else {
        vc.fillStyle = '#94a3b8';
        vc.font = '12px "JetBrains Mono", monospace';
      }
      vc.fillText(l, 24, lineY);
      lineY += 24;
    });

    // Blinking cursor
    if (Math.floor(elapsed * 2) % 2 === 0) {
      vc.fillStyle = '#34d399';
      vc.fillRect(24 + vc.measureText('hanan@workstation-os:~$ ').width, lineY - 24, 8, 15);
    }

    // Bottom prompt helper
    vc.fillStyle = '#05190e';
    vc.fillRect(0, 930, 512, 94);
    vc.strokeStyle = '#10b981';
    vc.lineWidth = 1;
    vc.strokeRect(12, 942, 488, 70);
    vc.font = 'bold 13px "JetBrains Mono", monospace';
    vc.fillStyle = '#34d399';
    vc.fillText('PRESS [E] OR CLICK TO RUN COMMANDS', 28, 970);
    vc.font = '11px "JetBrains Mono", monospace';
    vc.fillStyle = '#a7f3d0';
    vc.fillText('Run help, whoami, cv, projects, ctf, certs...', 28, 995);

    this.vertTexture.needsUpdate = true;

    // 3. SERVER 1 STATUS LCD SCREEN
    const sc = this.serverLcdCtx;
    sc.fillStyle = '#05121f';
    sc.fillRect(0, 0, 256, 64);
    sc.font = 'bold 11px "JetBrains Mono", monospace';
    sc.fillStyle = '#38bdf8';
    sc.fillText('NODE-01 // CORE MAINFRAME', 10, 18);
    sc.font = '9px "JetBrains Mono", monospace';
    sc.fillStyle = '#34d399';
    sc.fillText(`IP: 10.13.37.1  CPU: ${(36 + Math.sin(elapsed) * 3).toFixed(1)}°C`, 10, 36);
    sc.fillStyle = '#94a3b8';
    sc.fillText(`LOAD: 0.14  SANDBOXES: 4 ACTIVE`, 10, 52);
    this.serverLcdTexture.needsUpdate = true;
  }

  /* ----------------------------------------------------
     Lighting
  ---------------------------------------------------- */
  private setupLighting() {
    // Ambient fill light for room visibility
    const ambientLight = new THREE.AmbientLight(0xffebd6, 1.4);
    this.scene.add(ambientLight);

    // Hemisphere light: warm sky, dark purple floor bounce
    const hemiLight = new THREE.HemisphereLight(0xfff5eb, 0x1a1520, 1.1);
    this.scene.add(hemiLight);

    // Warm desk pendant lights above desk
    const pendant1 = new THREE.PointLight(0xff9933, 4.2, 6.5);
    pendant1.position.set(-0.6, 2.3, -2.8);
    pendant1.castShadow = true;
    pendant1.shadow.bias = -0.002;
    this.scene.add(pendant1);

    const pendant2 = new THREE.PointLight(0xff9933, 4.2, 6.5);
    pendant2.position.set(0.6, 2.3, -2.8);
    pendant2.castShadow = true;
    this.scene.add(pendant2);

    // Room center ceiling light
    const ceilingLight = new THREE.PointLight(0xffe2c4, 2.0, 9.0);
    ceilingLight.position.set(0, 3.1, 0.5);
    this.scene.add(ceilingLight);

    // Architect desk lamp spotlight (focused on desk pad)
    this.deskLampLight = new THREE.PointLight(0xffeedd, 3.5, 3.2);
    this.deskLampLight.position.set(-0.9, 1.25, -2.8);
    this.deskLampLight.castShadow = true;
    this.scene.add(this.deskLampLight);

    // Cold monitor glows
    const blueMonitorGlow = new THREE.PointLight(0x38bdf8, 2.2, 3.2);
    blueMonitorGlow.position.set(0.38, 1.45, -2.8);
    this.scene.add(blueMonitorGlow);

    const greenMonitorGlow = new THREE.PointLight(0x34d399, 2.2, 3.2);
    greenMonitorGlow.position.set(-0.55, 1.45, -2.8);
    this.scene.add(greenMonitorGlow);

    // Server corner LED glow (blue/violet ambient bleed)
    const serverGlow = new THREE.PointLight(0x0284c7, 2.8, 4.5);
    serverGlow.position.set(-3.6, 1.4, -2.6);
    this.scene.add(serverGlow);
  }

  /* ----------------------------------------------------
     Room Architecture: Floor, Walls, Baseboard, Acoustic Tiles
  ---------------------------------------------------- */
  private buildRoomArchitecture() {
    const roomW = 9.0;
    const roomD = 8.5;
    const roomH = 3.6;

    // Detailed floor: rich dark wood parquet with subtle specular
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x241812,
      roughness: 0.4,
      metalness: 0.15,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Procedural floor plank seam grid
    const floorGrid = new THREE.GridHelper(9, 18, 0x422d20, 0x2a1c14);
    floorGrid.position.y = 0.002;
    this.scene.add(floorGrid);

    // Perimeter Baseboards (Skirting Boards) along walls
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x16100c, roughness: 0.5 });
    // Back baseboard
    const bbBack = new THREE.Mesh(new THREE.BoxGeometry(roomW, 0.12, 0.03), baseboardMat);
    bbBack.position.set(0, 0.06, -3.73);
    this.scene.add(bbBack);
    // Left baseboard
    const bbLeft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, roomD), baseboardMat);
    bbLeft.position.set(-4.18, 0.06, 0);
    this.scene.add(bbLeft);
    // Right baseboard
    const bbRight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.12, roomD), baseboardMat);
    bbRight.position.set(4.18, 0.06, 0);
    this.scene.add(bbRight);

    // Thick Woven Area Rug under workstation & chair
    const rugMat = new THREE.MeshStandardMaterial({ color: 0x1e1927, roughness: 0.95 });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.005, -2.4);
    rug.receiveShadow = true;
    this.scene.add(rug);

    // Rug border trim
    const rugTrimMat = new THREE.MeshStandardMaterial({ color: 0x382e4a, roughness: 0.9 });
    const rugTrim = new THREE.Mesh(new THREE.BoxGeometry(3.64, 0.01, 2.64), rugTrimMat);
    rugTrim.position.set(0, 0.004, -2.4);
    this.scene.add(rugTrim);

    // Floor Cable Raceway Trench between Desk & Dual Servers
    const racewayMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, metalness: 0.8, roughness: 0.3 });
    const raceway = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.012, 0.14), racewayMat);
    raceway.position.set(-2.4, 0.006, -3.1);
    this.scene.add(raceway);

    // Back Wall: Charcoal architectural surface
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x161720,
      roughness: 0.7,
      metalness: 0.15,
    });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
    backWall.position.set(0, roomH / 2, -3.75);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // 3D Acoustic Sound-Dampening Foam Tiles on Back Wall (Pyramidal/Hexagonal feel)
    const foamMat = new THREE.MeshStandardMaterial({
      color: 0x222432,
      roughness: 0.85,
      metalness: 0.05,
    });
    const tileGeo = new THREE.BoxGeometry(0.24, 0.24, 0.035);
    for (let row = 0; row < 5; row++) {
      for (let col = -7; col <= 7; col++) {
        const tile = new THREE.Mesh(tileGeo, foamMat);
        tile.position.set(col * 0.28, 1.3 + row * 0.28, -3.73);
        tile.castShadow = true;
        this.scene.add(tile);
      }
    }

    // Side Walls
    const sideWallGeo = new THREE.PlaneGeometry(roomD, roomH);
    const leftWall = new THREE.Mesh(sideWallGeo, wallMat);
    leftWall.position.set(-4.2, roomH / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeo, wallMat);
    rightWall.position.set(4.2, roomH / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.scene.add(rightWall);

    // Ceiling
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x101118, roughness: 0.9 });
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomD), ceilingMat);
    ceiling.position.y = roomH;
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);

    // Overhead Structural Metal Cable Trays (Suspended from ceiling)
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 });
    for (let z = -2.8; z <= 2.8; z += 2.0) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(roomW * 0.9, 0.05, 0.25), trayMat);
      tray.position.set(0, 3.3, z);
      this.scene.add(tray);

      // Bundled colored cables lying in the tray
      const bundleColors = [0x0284c7, 0x10b981, 0xf59e0b];
      bundleColors.forEach((bCol, bIdx) => {
        const cable = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, roomW * 0.9, 8),
          new THREE.MeshStandardMaterial({ color: bCol, roughness: 0.5 })
        );
        cable.rotation.z = Math.PI / 2;
        cable.position.set(0, 3.34, z - 0.06 + bIdx * 0.06);
        this.scene.add(cable);
      });
    }

    // Industrial Wall Conduit Pipes & Emergency Shutoff Switch
    const conduitMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, roomH, 8), conduitMat);
    conduit.position.set(-4.16, roomH / 2, -2.5);
    this.scene.add(conduit);

    // Emergency power switch box (Yellow handle, steel enclosure)
    const switchBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.1), conduitMat);
    switchBox.position.set(-4.16, 1.8, -2.5);
    this.scene.add(switchBox);

    const switchHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.1, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.3 })
    );
    switchHandle.position.set(-4.1, 1.8, -2.5);
    this.scene.add(switchHandle);
  }

  /* ----------------------------------------------------
     Workbench Desk & Ergonomic Chair (Against Back Wall)
  ---------------------------------------------------- */
  private buildWorkbenchDesk() {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(0, 0, -3.2);

    // Desk top: Solid walnut butcher block with chamfered edge bevels (2.8m x 1.0m x 0.08m)
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x3d281a,
      roughness: 0.35,
      metalness: 0.15,
    });
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 1.0), topMat);
    deskTop.position.set(0, 0.76, 0);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    deskGroup.add(deskTop);

    // Steel K-frame legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.85, roughness: 0.35 });
    const legGeo = new THREE.BoxGeometry(0.09, 0.76, 0.09);
    const legPositions = [
      [-1.3, 0.38, -0.4],
      [1.3, 0.38, -0.4],
      [-1.3, 0.38, 0.4],
      [1.3, 0.38, 0.4],
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      deskGroup.add(leg);
    });

    // Dual Circular Cable Pass-Through Grommets in desk
    const grommetMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85 });
    [-0.55, 0.38].forEach((gx) => {
      const grommet = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.09, 16), grommetMat);
      grommet.position.set(gx, 0.76, -0.35);
      deskGroup.add(grommet);
    });

    // Stitched Leatherette Desk Pad with Raised Border
    const matMat = new THREE.MeshStandardMaterial({ color: 0x141822, roughness: 0.85 });
    const deskMat = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.008, 0.7), matMat);
    deskMat.position.set(0, 0.804, 0.08);
    deskGroup.add(deskMat);

    // Ergonomic Chair (5-star caster base, pneumatic cylinder, contoured mesh backrest)
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, 0.85);

    // Seat cushion
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.56, 0.08, 0.52),
      new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.7 })
    );
    seat.position.y = 0.52;
    seat.castShadow = true;
    chairGroup.add(seat);

    // Contoured backrest
    const backrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.65, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x141822, roughness: 0.8 })
    );
    backrest.position.set(0, 0.88, 0.24);
    backrest.rotation.x = 0.08;
    chairGroup.add(backrest);

    // Chair stem & star base
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 12), legMat);
    stem.position.y = 0.26;
    chairGroup.add(stem);

    for (let c = 0; c < 5; c++) {
      const angle = (c * Math.PI * 2) / 5;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.04), legMat);
      leg.position.set(Math.sin(angle) * 0.2, 0.04, Math.cos(angle) * 0.2);
      leg.rotation.y = angle;
      chairGroup.add(leg);

      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.02, 8), legMat);
      wheel.position.set(Math.sin(angle) * 0.32, 0.025, Math.cos(angle) * 0.32);
      wheel.rotation.z = Math.PI / 2;
      chairGroup.add(wheel);
    }

    deskGroup.add(chairGroup);
    this.scene.add(deskGroup);
  }

  /* ----------------------------------------------------
     Custom Water-Cooled Desktop PC Rig
  ---------------------------------------------------- */
  private buildDesktopRigPC() {
    const pcGroup = new THREE.Group();
    pcGroup.position.set(1.15, 0.8, -3.2);

    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x141620,
      metalness: 0.8,
      roughness: 0.3,
    });
    // Main Chassis
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.5, 0.46), chassisMat);
    chassis.position.y = 0.25;
    chassis.castShadow = true;
    pcGroup.add(chassis);

    // Tempered Glass Side Panel
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
    });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.46, 0.42), glassMat);
    glass.position.set(-0.122, 0.25, 0);
    pcGroup.add(glass);

    // Inside: Motherboard & RAM Sticks with RGB diffusers
    const moboMat = new THREE.MeshStandardMaterial({ color: 0x090b10 });
    const mobo = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.35, 0.35), moboMat);
    mobo.position.set(0.08, 0.25, 0);
    pcGroup.add(mobo);

    for (let r = 0; r < 2; r++) {
      const ram = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.06, 0.008),
        new THREE.MeshBasicMaterial({ color: r === 0 ? 0x06b6d4 : 0xec4899 })
      );
      ram.position.set(0.06, 0.32, -0.04 + r * 0.02);
      pcGroup.add(ram);
    }

    // Inside: Triple-Fan GPU with illuminated logo
    const gpu = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.04, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9 })
    );
    gpu.position.set(0.02, 0.2, 0.02);
    pcGroup.add(gpu);

    // Front Mesh Panel with Dual Rotating RGB Fans
    const frontMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.46, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x090b10, metalness: 0.9, roughness: 0.4 })
    );
    frontMesh.position.set(0, 0.25, 0.235);
    pcGroup.add(frontMesh);

    for (let i = 0; i < 2; i++) {
      const fanRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.065, 0.008, 8, 24),
        new THREE.MeshBasicMaterial({ color: i === 0 ? 0x06b6d4 : 0xec4899 })
      );
      fanRing.position.set(0, 0.16 + i * 0.18, 0.22);
      pcGroup.add(fanRing);

      const blades = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.01, 6),
        new THREE.MeshStandardMaterial({ color: 0x1f2937 })
      );
      blades.rotation.x = Math.PI / 2;
      blades.position.set(0, 0.16 + i * 0.18, 0.22);
      pcGroup.add(blades);
      this.fanRotors.push(blades);
    }

    // Front USB thumb drive with blinking green LED
    const usbThumb = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.01, 0.05),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.2 })
    );
    usbThumb.position.set(-0.04, 0.51, 0.16);
    pcGroup.add(usbThumb);

    const usbLed = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 8), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    usbLed.position.set(-0.04, 0.518, 0.145);
    pcGroup.add(usbLed);

    this.scene.add(pcGroup);
  }

  /* ----------------------------------------------------
     Dual Monitors (Horizontal Desktop + Vertical Terminal)
  ---------------------------------------------------- */
  private buildMonitors() {
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x141822,
      metalness: 0.8,
      roughness: 0.25,
    });

    /* 1. HORIZONTAL WORKSTATION MONITOR (X: 0.38, Z: -3.35) */
    const horizGroup = new THREE.Group();
    horizGroup.position.set(0.38, 1.42, -3.35);

    const horizFrame = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.68, 0.05), frameMat);
    horizFrame.castShadow = true;
    horizGroup.add(horizFrame);

    const horizBackHousing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.48, 0.08), frameMat);
    horizBackHousing.position.z = -0.06;
    horizGroup.add(horizBackHousing);

    const horizScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.64), this.horizMaterial);
    horizScreen.position.z = 0.028;
    horizGroup.add(horizScreen);

    // Heavy-duty articulated monitor mount arm
    const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 12), frameMat);
    standPole.position.set(0, -0.35, -0.08);
    horizGroup.add(standPole);
    const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.24), frameMat);
    standBase.position.set(0, -0.62, 0.02);
    horizGroup.add(standBase);

    this.scene.add(horizGroup);
    this.registerInteractive(horizGroup, 'horizontal_monitor');

    /* 2. VERTICAL TERMINAL MONITOR (X: -0.55, Z: -3.3) */
    const vertGroup = new THREE.Group();
    vertGroup.position.set(-0.55, 1.45, -3.3);
    vertGroup.rotation.y = Math.PI / 12; // angled inward

    const vertFrame = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.94, 0.05), frameMat);
    vertFrame.castShadow = true;
    vertGroup.add(vertFrame);

    const vertBackHousing = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.65, 0.08), frameMat);
    vertBackHousing.position.z = -0.06;
    vertGroup.add(vertBackHousing);

    const vertScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.9), this.vertMaterial);
    vertScreen.position.z = 0.028;
    vertGroup.add(vertScreen);

    const vertStandPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 12), frameMat);
    vertStandPole.position.set(0, -0.38, -0.08);
    vertGroup.add(vertStandPole);
    const vertStandBase = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.24), frameMat);
    vertStandBase.position.set(0, -0.64, 0.02);
    vertGroup.add(vertStandBase);

    this.scene.add(vertGroup);
    this.registerInteractive(vertGroup, 'vertical_monitor');
  }

  /* ----------------------------------------------------
     Sculpted Mechanical Keyboard & Mouse
  ---------------------------------------------------- */
  private buildKeyboardAndMouse() {
    const kbGroup = new THREE.Group();
    kbGroup.position.set(0.12, 0.815, -3.02);

    // Aluminum Keyboard Case
    const caseMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.44, 0.022, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x1e2430, metalness: 0.6, roughness: 0.35 })
    );
    kbGroup.add(caseMesh);

    // Individual Sculpted 3D Keycaps
    const keyGeo = new THREE.BoxGeometry(0.022, 0.012, 0.022);
    const alphaMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.6 });
    const modMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.5 });
    const escMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.5 });

    for (let r = 0; r < 5; r++) {
      const zOffset = -0.055 + r * 0.028;
      for (let c = 0; c < 14; c++) {
        const xOffset = -0.18 + c * 0.028;
        let mat = alphaMat;
        if (r === 0 && c === 0) mat = escMat;
        else if (c === 0 || c === 13 || r === 4) mat = modMat;
        if (r === 4 && c >= 4 && c <= 9) continue; // spacebar slot

        const key = new THREE.Mesh(keyGeo, mat);
        key.position.set(xOffset, 0.014, zOffset);
        kbGroup.add(key);
      }
    }

    // Spacebar
    const spacebar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.022), alphaMat);
    spacebar.position.set(0, 0.014, 0.057);
    kbGroup.add(spacebar);

    // Coiled Aviator Cable (Helical spiral tube)
    const coilCurvePoints: THREE.Vector3[] = [];
    for (let t = 0; t < 20; t += 0.5) {
      const rad = 0.018;
      coilCurvePoints.push(
        new THREE.Vector3(
          -0.15 - t * 0.012,
          0.005 + Math.sin(t * 1.5) * rad,
          -0.08 + Math.cos(t * 1.5) * rad
        )
      );
    }
    const coilCurve = new THREE.CatmullRomCurve3(coilCurvePoints);
    const coilMesh = new THREE.Mesh(
      new THREE.TubeGeometry(coilCurve, 64, 0.004, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })
    );
    kbGroup.add(coilMesh);

    this.scene.add(kbGroup);
    this.registerInteractive(kbGroup, 'desk');

    // Ergonomic Mouse
    const mouseGroup = new THREE.Group();
    mouseGroup.position.set(0.48, 0.815, -3.02);

    const mouseBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.03, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.3 })
    );
    mouseGroup.add(mouseBody);

    const scrollWheel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.012, 12),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8 })
    );
    scrollWheel.rotation.z = Math.PI / 2;
    scrollWheel.position.set(0, 0.016, -0.025);
    mouseGroup.add(scrollWheel);

    this.scene.add(mouseGroup);
  }

  /* ----------------------------------------------------
     Over-Ear Studio Headphones (Hanging on Desk Side Hook)
  ---------------------------------------------------- */
  private buildHeadphones() {
    const hpGroup = new THREE.Group();
    hpGroup.position.set(-1.42, 0.72, -3.0);

    const hook = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.015, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9 })
    );
    hpGroup.add(hook);

    const arcCurve = new THREE.EllipseCurve(0, 0, 0.1, 0.12, 0, Math.PI, false, 0);
    const pts = arcCurve.getPoints(24).map((p) => new THREE.Vector3(p.x, p.y - 0.08, 0));
    const bandCurve = new THREE.CatmullRomCurve3(pts);
    const headband = new THREE.Mesh(
      new THREE.TubeGeometry(bandCurve, 24, 0.012, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.8 })
    );
    hpGroup.add(headband);

    for (const side of [-0.1, 0.1]) {
      const earcup = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16),
        new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.6, roughness: 0.3 })
      );
      earcup.rotation.z = Math.PI / 2;
      earcup.position.set(side, -0.16, 0);
      hpGroup.add(earcup);

      const cushion = new THREE.Mesh(
        new THREE.TorusGeometry(0.038, 0.012, 10, 20),
        new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.9 })
      );
      cushion.rotation.y = Math.PI / 2;
      cushion.position.set(side + (side < 0 ? 0.015 : -0.015), -0.16, 0);
      hpGroup.add(cushion);
    }

    this.scene.add(hpGroup);
  }

  /* ----------------------------------------------------
     Tactile 3D Props (Bruno Simon / Joan Ramos Refusta Style)
  ---------------------------------------------------- */
  private buildDeskProps() {
    // 1. Ceramic Coffee Mug with coffee liquid
    const mugGroup = new THREE.Group();
    mugGroup.position.set(-0.95, 0.81, -3.1);

    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.042, 0.1, 20, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.25 })
    );
    mug.position.y = 0.05;
    mugGroup.add(mug);

    const mugBottom = new THREE.Mesh(
      new THREE.CircleGeometry(0.042, 20),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.25 })
    );
    mugBottom.rotation.x = Math.PI / 2;
    mugBottom.position.y = 0.002;
    mugGroup.add(mugBottom);

    const coffeeLiquid = new THREE.Mesh(
      new THREE.CircleGeometry(0.043, 20),
      new THREE.MeshStandardMaterial({ color: 0x24140e, roughness: 0.1 })
    );
    coffeeLiquid.rotation.x = -Math.PI / 2;
    coffeeLiquid.position.y = 0.088;
    mugGroup.add(coffeeLiquid);

    const handleCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0.044, 0.075, 0),
      new THREE.Vector3(0.085, 0.05, 0),
      new THREE.Vector3(0.044, 0.025, 0)
    );
    const handleMesh = new THREE.Mesh(
      new THREE.TubeGeometry(handleCurve, 16, 0.008, 8, false),
      new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.25 })
    );
    mugGroup.add(handleMesh);
    this.scene.add(mugGroup);

    // 2. Aluminum Soda Can
    const canGroup = new THREE.Group();
    canGroup.position.set(-0.85, 0.81, -2.95);

    const canBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.12, 20),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.9, roughness: 0.2 })
    );
    canBody.position.y = 0.06;
    canGroup.add(canBody);

    const canRim = new THREE.Mesh(
      new THREE.TorusGeometry(0.034, 0.003, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95, roughness: 0.1 })
    );
    canRim.rotation.x = Math.PI / 2;
    canRim.position.y = 0.12;
    canGroup.add(canRim);

    const pullTab = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.002, 0.025),
      new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.95 })
    );
    pullTab.position.set(0, 0.121, 0.008);
    canGroup.add(pullTab);
    this.scene.add(canGroup);

    // 3. Potted Snake Plant / Succulent on desk corner
    const plantGroup = new THREE.Group();
    plantGroup.position.set(-1.25, 0.81, -3.3);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.05, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
    );
    pot.position.y = 0.06;
    plantGroup.add(pot);

    const soil = new THREE.Mesh(
      new THREE.CircleGeometry(0.068, 8),
      new THREE.MeshStandardMaterial({ color: 0x1f1610, roughness: 0.9 })
    );
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = 0.118;
    plantGroup.add(soil);

    // 5 geometric leaves
    for (let l = 0; l < 5; l++) {
      const leafAngle = (l * Math.PI * 2) / 5;
      const leaf = new THREE.Mesh(
        new THREE.ConeGeometry(0.025, 0.22, 4),
        new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.5 })
      );
      leaf.position.set(Math.sin(leafAngle) * 0.03, 0.22, Math.cos(leafAngle) * 0.03);
      leaf.rotation.z = Math.sin(leafAngle) * 0.25;
      leaf.rotation.x = Math.cos(leafAngle) * 0.25;
      plantGroup.add(leaf);
    }
    this.scene.add(plantGroup);

    // 4. Stack of Hardcover Tech Books
    const bookGroup = new THREE.Group();
    bookGroup.position.set(-1.15, 0.81, -3.05);

    const bookColors = [0x1e3a8a, 0x065f46, 0x831843];
    for (let i = 0; i < 3; i++) {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.035, 0.18),
        new THREE.MeshStandardMaterial({ color: bookColors[i], roughness: 0.6 })
      );
      book.position.y = 0.018 + i * 0.036;
      book.rotation.y = i * 0.08 - 0.04;
      bookGroup.add(book);

      const pages = new THREE.Mesh(
        new THREE.BoxGeometry(0.23, 0.03, 0.17),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.9 })
      );
      pages.position.set(0.008, 0.018 + i * 0.036, 0);
      pages.rotation.y = book.rotation.y;
      bookGroup.add(pages);
    }
    this.scene.add(bookGroup);

    // 5. Retro 3.5" Floppy Disks
    const floppyGroup = new THREE.Group();
    floppyGroup.position.set(0.78, 0.81, -3.28);
    for (let f = 0; f < 2; f++) {
      const disk = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.004, 0.094),
        new THREE.MeshStandardMaterial({ color: f === 0 ? 0x1e293b : 0x0284c7, roughness: 0.5 })
      );
      disk.position.y = 0.002 + f * 0.005;
      disk.rotation.y = f * 0.12;
      floppyGroup.add(disk);

      const shutter = new THREE.Mesh(
        new THREE.BoxGeometry(0.032, 0.005, 0.032),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.95, roughness: 0.2 })
      );
      shutter.position.set(0, 0.0025 + f * 0.005, -0.03);
      shutter.rotation.y = disk.rotation.y;
      floppyGroup.add(shutter);
    }
    this.scene.add(floppyGroup);

    // 6. Articulated Architect Desk Lamp
    const lampGroup = new THREE.Group();
    lampGroup.position.set(-1.18, 0.81, -2.85);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 0.02, 20),
      new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.3 })
    );
    base.position.y = 0.01;
    lampGroup.add(base);

    const armMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8, roughness: 0.3 });
    const lowerArm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.38, 8), armMat);
    lowerArm.position.set(0.06, 0.18, -0.05);
    lowerArm.rotation.z = -0.35;
    lampGroup.add(lowerArm);

    const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.38, 8), armMat);
    upperArm.position.set(0.18, 0.42, 0.02);
    upperArm.rotation.z = 0.55;
    lampGroup.add(upperArm);

    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.14, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7, roughness: 0.3 })
    );
    shade.position.set(0.32, 0.48, 0.05);
    shade.rotation.z = -Math.PI / 1.5;
    lampGroup.add(shade);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    );
    bulb.position.set(0.3, 0.46, 0.05);
    lampGroup.add(bulb);

    this.scene.add(lampGroup);
  }

  /* ----------------------------------------------------
     Realistic 3D Cables (Catenary Curves)
  ---------------------------------------------------- */
  private buildDroopingCables() {
    const cableMat = new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.8 });

    // Horizontal Monitor cable to grommet
    const c1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.38, 1.25, -3.4),
      new THREE.Vector3(0.32, 0.95, -3.45),
      new THREE.Vector3(0.36, 0.82, -3.4),
      new THREE.Vector3(0.38, 0.76, -3.35),
    ]);
    const cable1 = new THREE.Mesh(new THREE.TubeGeometry(c1, 24, 0.008, 8, false), cableMat);
    this.scene.add(cable1);

    // Vertical Monitor cable to grommet
    const c2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.55, 1.25, -3.35),
      new THREE.Vector3(-0.52, 0.98, -3.42),
      new THREE.Vector3(-0.54, 0.82, -3.4),
      new THREE.Vector3(-0.55, 0.76, -3.35),
    ]);
    const cable2 = new THREE.Mesh(new THREE.TubeGeometry(c2, 24, 0.008, 8, false), cableMat);
    this.scene.add(cable2);

    // Floor cable bundle to servers
    const c3 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.3, 0.76, -3.2),
      new THREE.Vector3(-1.8, 0.25, -3.15),
      new THREE.Vector3(-2.8, 0.05, -3.1),
      new THREE.Vector3(-3.5, 0.2, -3.0),
    ]);
    const cable3 = new THREE.Mesh(new THREE.TubeGeometry(c3, 32, 0.014, 8, false), cableMat);
    this.scene.add(cable3);
  }

  /* ----------------------------------------------------
     Wall Shelf with Vintage Tech Items & Router
  ---------------------------------------------------- */
  private buildWallShelf() {
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(0, 2.3, -3.6);

    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.05, 0.32),
      new THREE.MeshStandardMaterial({ color: 0x3d281a, roughness: 0.5 })
    );
    shelfGroup.add(shelf);

    const bracketMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.9 });
    for (const bX of [-0.9, 0.9]) {
      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.28), bracketMat);
      bracket.position.set(bX, -0.12, 0);
      shelfGroup.add(bracket);
    }

    // 3D Wi-Fi 6 Router with 4 Antennas & Status LEDs
    const router = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.045, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x090b10, roughness: 0.4 })
    );
    router.position.set(-0.6, 0.045, 0);
    shelfGroup.add(router);

    for (let a = -1.5; a <= 1.5; a += 1) {
      const ant = new THREE.Mesh(
        new THREE.CylinderGeometry(0.004, 0.004, 0.18, 8),
        new THREE.MeshStandardMaterial({ color: 0x1f2937 })
      );
      ant.position.set(-0.6 + a * 0.06, 0.12, -0.06);
      ant.rotation.z = a * 0.18;
      shelfGroup.add(ant);
    }

    // Router green status LEDs
    for (let l = 0; l < 4; l++) {
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.003, 6, 6), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      led.position.set(-0.7 + l * 0.025, 0.045, 0.092);
      shelfGroup.add(led);
      this.routerLeds.push(led);
    }

    // Cassette Tape
    const tape = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.02, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 })
    );
    tape.position.set(0.6, 0.035, 0);
    shelfGroup.add(tape);

    this.scene.add(shelfGroup);
  }

  /* ----------------------------------------------------
     DUAL SERVERS (Replacing the 42U Infra Rack)
     - Server 1: Primary Core Mainframe Node (INTERACTABLE)
     - Server 2: Secondary Storage / Failover Array (COMPANION NODE)
  ---------------------------------------------------- */
  private buildDualServers() {
    const serversRoot = new THREE.Group();
    serversRoot.position.set(-3.5, 0, -3.0);

    // Industrial rolling server cart / rack stand
    const cartMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.85, roughness: 0.3 });
    // 4 vertical corner posts
    const postGeo = new THREE.BoxGeometry(0.05, 1.8, 0.05);
    const postPositions = [
      [-0.45, 0.9, -0.4],
      [0.45, 0.9, -0.4],
      [-0.45, 0.9, 0.4],
      [0.45, 0.9, 0.4],
    ];
    postPositions.forEach(([px, py, pz]) => {
      const post = new THREE.Mesh(postGeo, cartMat);
      post.position.set(px, py, pz);
      serversRoot.add(post);
    });

    // 3 shelves on the cart (Bottom, Middle, Top)
    const shelfGeo = new THREE.BoxGeometry(0.96, 0.03, 0.86);
    [0.1, 0.85, 1.65].forEach((sy) => {
      const shelf = new THREE.Mesh(shelfGeo, cartMat);
      shelf.position.y = sy;
      serversRoot.add(shelf);
    });

    // 4 caster wheels on cart base
    for (const [wx, wz] of [[-0.45, -0.4], [0.45, -0.4], [-0.45, 0.4], [0.45, 0.4]]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12),
        cartMat
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.04, wz);
      serversRoot.add(wheel);
    }

    /* --------------------------------------------------
       SERVER 1: PRIMARY CORE MAINFRAME NODE (INTERACTABLE!)
       Sits on the middle/upper rack shelf (Y = 0.88 to 1.35)
    -------------------------------------------------- */
    const server1Group = new THREE.Group();
    server1Group.position.set(0, 1.15, 0);

    const s1ChassisMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.25,
    });
    // 3U Chassis: 0.82m wide, 0.32m high, 0.72m deep
    const s1Chassis = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.32, 0.72), s1ChassisMat);
    s1Chassis.castShadow = true;
    server1Group.add(s1Chassis);

    // Front Metal Rack Handles & Mounting Ears
    const earMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95, roughness: 0.2 });
    [-0.43, 0.43].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.32, 0.02), earMat);
      ear.position.set(ex, 0, 0.36);
      server1Group.add(ear);

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), earMat);
      handle.position.set(ex, 0, 0.41);
      server1Group.add(handle);
    });

    // Hot-Swap SAS Drive Caddies (12 drives in 3 rows x 4 cols)
    const caddyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.35 });
    const latchMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7 });

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 6; col++) {
        const cx = -0.32 + col * 0.128;
        const cy = -0.06 + row * 0.11;

        // Drive Tray
        const tray = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.09, 0.02), caddyMat);
        tray.position.set(cx, cy, 0.362);
        server1Group.add(tray);

        // Latch handle
        const latch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.01), latchMat);
        latch.position.set(cx, cy - 0.025, 0.374);
        server1Group.add(latch);

        // Individual Blinking Status LED (Activity Green)
        const ledGreen = new THREE.Mesh(
          new THREE.SphereGeometry(0.004, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x22c55e })
        );
        ledGreen.position.set(cx - 0.035, cy + 0.026, 0.375);
        server1Group.add(ledGreen);
        this.server1Leds.push({ mesh: ledGreen, baseColor: 0x22c55e, blinkRate: 3 + Math.random() * 8 });

        // Beacon / SAS Status LED (Blue / Amber)
        const ledBlue = new THREE.Mesh(
          new THREE.SphereGeometry(0.004, 6, 6),
          new THREE.MeshBasicMaterial({ color: col % 2 === 0 ? 0x38bdf8 : 0xf59e0b })
        );
        ledBlue.position.set(cx + 0.035, cy + 0.026, 0.375);
        server1Group.add(ledBlue);
        this.server1Leds.push({
          mesh: ledBlue,
          baseColor: col % 2 === 0 ? 0x38bdf8 : 0xf59e0b,
          blinkRate: 1.5 + Math.random() * 4,
        });
      }
    }

    // Primary Server 1 Status LCD Panel Screen
    const lcdScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.06),
      new THREE.MeshBasicMaterial({ map: this.serverLcdTexture })
    );
    lcdScreen.position.set(-0.16, 0.1, 0.365);
    server1Group.add(lcdScreen);

    // Power switch & diagnostic USB on front
    const s1Power = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.008, 12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    s1Power.rotation.x = Math.PI / 2;
    s1Power.position.set(0.12, 0.1, 0.365);
    server1Group.add(s1Power);

    // Front Ethernet ports with plugged-in neon cyan & emerald patch cables
    const ethCableColors = [0x06b6d4, 0x10b981];
    ethCableColors.forEach((col, idx) => {
      const port = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.016, 0.015),
        new THREE.MeshStandardMaterial({ color: 0xd97706 })
      );
      port.position.set(0.2 + idx * 0.045, 0.1, 0.365);
      server1Group.add(port);

      // Drooping patch cable connecting down into Server 2 or raceway
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.2 + idx * 0.045, 0.1, 0.38),
        new THREE.Vector3(0.22 + idx * 0.045, -0.15, 0.44),
        new THREE.Vector3(0.18 + idx * 0.045, -0.45, 0.42),
        new THREE.Vector3(0.15 + idx * 0.045, -0.65, 0.38),
      ]);
      const patchCable = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 20, 0.006, 8, false),
        new THREE.MeshBasicMaterial({ color: col })
      );
      server1Group.add(patchCable);
    });

    serversRoot.add(server1Group);
    // Register Server 1 as the INTERACTABLE station object!
    this.registerInteractive(server1Group, 'server_rack');

    /* --------------------------------------------------
       SERVER 2: SECONDARY REPLICA / STORAGE ARRAY (COMPANION NODE)
       Sits on the bottom rack shelf (Y = 0.12 to 0.6)
       NON-INTERACTABLE as requested!
    -------------------------------------------------- */
    const server2Group = new THREE.Group();
    server2Group.position.set(0, 0.48, 0);

    // 4U High-Density Storage Chassis: 0.82m wide, 0.42m high, 0.72m deep
    const s2Chassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.42, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x0b1120, metalness: 0.85, roughness: 0.35 })
    );
    s2Chassis.castShadow = true;
    server2Group.add(s2Chassis);

    // Server 2 Rack Ears
    [-0.43, 0.43].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.42, 0.02), earMat);
      ear.position.set(ex, 0, 0.36);
      server2Group.add(ear);
    });

    // 24 Dense 3.5" Storage Drive Trays in a 4x6 grid
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        const cx = -0.32 + col * 0.128;
        const cy = -0.14 + row * 0.092;

        const tray = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.076, 0.015), caddyMat);
        tray.position.set(cx, cy, 0.362);
        server2Group.add(tray);

        // Blinking storage read/write LED
        const led = new THREE.Mesh(
          new THREE.SphereGeometry(0.0035, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        led.position.set(cx - 0.035, cy + 0.02, 0.372);
        server2Group.add(led);
        this.server2Leds.push({ mesh: led, baseColor: 0x38bdf8, blinkRate: 4 + Math.random() * 10 });
      }
    }

    // Fiber Optic LC Duplex Patch Cables (Bright Orange) looping between Server 2 and Server 1
    for (let f = 0; f < 2; f++) {
      const fiberCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.25 + f * 0.05, 0.18, 0.37),
        new THREE.Vector3(-0.28 + f * 0.05, 0.4, 0.45),
        new THREE.Vector3(-0.24 + f * 0.05, 0.58, 0.42),
        new THREE.Vector3(-0.22 + f * 0.05, 0.65, 0.37),
      ]);
      const fiber = new THREE.Mesh(
        new THREE.TubeGeometry(fiberCurve, 20, 0.005, 8, false),
        new THREE.MeshBasicMaterial({ color: 0xf97316 })
      );
      server2Group.add(fiber);
    }

    serversRoot.add(server2Group);
    this.scene.add(serversRoot);
  }

  /* ----------------------------------------------------
     CTF Board (Left Wall: X = -4.18, Z = 0.5)
  ---------------------------------------------------- */
  private buildCTFBoard() {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(-4.16, 1.8, 0.5);
    boardGroup.rotation.y = Math.PI / 2;

    const back = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.6, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x181e2b, roughness: 0.8 })
    );
    boardGroup.add(back);

    const titleBar = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.22, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x0284c7 })
    );
    titleBar.position.set(0, 0.65, 0.025);
    boardGroup.add(titleBar);

    // Pinned notes & cards in 3D
    const cardColors = [0xfef08a, 0xa7f3d0, 0xfbcfe8, 0xbae6fd];
    cardColors.forEach((color, i) => {
      const note = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.45, 0.015),
        new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
      );
      note.position.set(-0.9 + i * 0.6, i % 2 === 0 ? 0.15 : -0.2, 0.025);
      boardGroup.add(note);

      // Red pin
      const pin = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      pin.position.set(-0.9 + i * 0.6, i % 2 === 0 ? 0.35 : 0.0, 0.04);
      boardGroup.add(pin);
    });

    this.scene.add(boardGroup);
    this.registerInteractive(boardGroup, 'ctf_wall');
  }

  /* ----------------------------------------------------
     Timeline Wall & CV Board (Right Wall: X = 4.18, Z = 0.5)
  ---------------------------------------------------- */
  private buildTimelineWall() {
    const timeGroup = new THREE.Group();
    timeGroup.position.set(4.16, 1.8, 0.5);
    timeGroup.rotation.y = -Math.PI / 2;

    const corkboard = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.6, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x3d281a, roughness: 0.95 })
    );
    timeGroup.add(corkboard);

    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 2.4, 8),
      new THREE.MeshBasicMaterial({ color: 0xa855f7 })
    );
    wire.rotation.z = Math.PI / 2;
    wire.position.set(0, 0, 0.025);
    timeGroup.add(wire);

    for (let i = 0; i < 4; i++) {
      const plaque = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.55, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x1f2430, roughness: 0.5 })
      );
      plaque.position.set(-0.9 + i * 0.6, 0.15, 0.025);
      timeGroup.add(plaque);

      const node = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), new THREE.MeshBasicMaterial({ color: 0xc084fc }));
      node.position.set(-0.9 + i * 0.6, 0, 0.038);
      timeGroup.add(node);
    }

    this.scene.add(timeGroup);
    this.registerInteractive(timeGroup, 'timeline_wall');
  }

  /* ----------------------------------------------------
     Exit Portal (Z = 4.1)
  ---------------------------------------------------- */
  private buildExitPortal() {
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 1.4, 4.1);

    const doorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 2.6, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x181a24, metalness: 0.8, roughness: 0.3 })
    );
    doorGroup.add(doorMesh);

    const keypad = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.45, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x0b1329, metalness: 0.9 })
    );
    keypad.position.set(0.95, 0, 0);
    doorGroup.add(keypad);

    const led = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    led.position.set(0.95, 0.12, 0.025);
    doorGroup.add(led);

    this.scene.add(doorGroup);
    this.registerInteractive(doorGroup, 'exit_door');
  }

  /* ----------------------------------------------------
     Dust particles
  ---------------------------------------------------- */
  private buildDustParticles() {
    const count = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 8.0;
      positions[i * 3 + 1] = 0.5 + Math.random() * 2.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 7.5;
      scales[i] = 0.6 + Math.random() * 1.4;
      randoms[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uColor: DustParticleShader.uniforms.uColor,
      },
      vertexShader: DustParticleShader.vertexShader,
      fragmentShader: DustParticleShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.dustPoints = new THREE.Points(geometry, material);
    this.scene.add(this.dustPoints);
  }

  /* ----------------------------------------------------
     Interactive Registry
  ---------------------------------------------------- */
  private registerInteractive(obj: THREE.Object3D, stationId: StationId) {
    this.interactiveObjects.push(obj);
    this.objectStationMap.set(obj, stationId);
    obj.traverse((child) => {
      this.objectStationMap.set(child, stationId);
    });
  }

  /* ----------------------------------------------------
     Station Zooming & Transitions
  ---------------------------------------------------- */
  public goToStation(stationId: StationId) {
    const config = STATIONS[stationId];
    if (!config) return;

    this.activeStation = stationId;
    this.targetCameraPos.set(...config.cameraPos);
    this.targetCameraLook.set(...config.cameraTarget);
    this.targetFov = config.fov || 55;

    this.isInspecting = stationId !== 'overview';
    this.isWalkMode = !this.isInspecting;

    soundEngine.playWhoosh();
    if (this.onStationSelect) {
      this.onStationSelect(stationId);
    }
  }

  public stepBackToWalk() {
    this.isInspecting = false;
    this.isWalkMode = true;
    this.goToStation('overview');
  }

  public setWalkMode(active: boolean) {
    this.isWalkMode = active;
    if (active) {
      this.isInspecting = false;
    }
  }

  public getWalkMode(): boolean {
    return this.isWalkMode;
  }

  public getActiveStation(): StationId {
    return this.activeStation;
  }

  /* ----------------------------------------------------
     Event Handlers (WASD Walking, Mouse Look)
  ---------------------------------------------------- */
  private bindEvents() {
    window.addEventListener('resize', this.onWindowResize);

    const dom = this.renderer.domElement;
    dom.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);

    dom.addEventListener('click', this.onClick);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onMouseDown = (e: MouseEvent) => {
    soundEngine.startAmbient();
    this.isMouseDown = true;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.isMouseDown && this.isWalkMode) {
      const deltaX = e.clientX - this.prevMouseX;
      const deltaY = e.clientY - this.prevMouseY;

      this.yaw -= deltaX * 0.0035;
      this.pitch -= deltaY * 0.0035;
      this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));

      const lookDir = new THREE.Vector3(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch)
      );

      this.currentCameraLook.copy(this.camera.position).add(lookDir);
      this.targetCameraLook.copy(this.currentCameraLook);
      this.camera.lookAt(this.currentCameraLook);

      this.prevMouseX = e.clientX;
      this.prevMouseY = e.clientY;
    }
  };

  private onMouseUp = () => {
    this.isMouseDown = false;
  };

  private onClick = (e: MouseEvent) => {
    soundEngine.startAmbient();
    soundEngine.playKeyClick();

    if (this.hoveredStationId) {
      this.goToStation(this.hoveredStationId);
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
      return;
    }

    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.moveForward = true;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.moveBackward = true;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.moveLeft = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.moveRight = true;

    if ((e.key === 'e' || e.key === 'E' || e.key === ' ') && this.hoveredStationId) {
      this.goToStation(this.hoveredStationId);
    }

    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 0 && num <= 7) {
      const stations: StationId[] = [
        'overview',
        'horizontal_monitor',
        'vertical_monitor',
        'desk',
        'ctf_wall',
        'timeline_wall',
        'server_rack',
        'exit_door',
      ];
      if (stations[num]) {
        this.goToStation(stations[num]);
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.moveForward = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.moveBackward = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.moveLeft = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.moveRight = false;
  };

  /* ----------------------------------------------------
     Render Loop
  ---------------------------------------------------- */
  private animate() {
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // 1. Shaders update
    if (this.horizMaterial.uniforms.uTime) {
      this.horizMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.vertMaterial.uniforms.uTime) {
      this.vertMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.dustPoints && (this.dustPoints.material as THREE.ShaderMaterial).uniforms.uTime) {
      (this.dustPoints.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    }

    // 2. Rotate PC fan blades
    this.fanRotors.forEach((fan) => {
      fan.rotation.y += delta * 12.0;
    });

    // 3. Dynamic Server 1 Status LEDs animation
    this.server1Leds.forEach((led) => {
      const isLit = Math.sin(elapsed * led.blinkRate) > 0.1;
      (led.mesh.material as THREE.MeshBasicMaterial).color.setHex(isLit ? led.baseColor : 0x050e14);
    });

    // 4. Server 2 Replica LEDs animation
    this.server2Leds.forEach((led) => {
      const isLit = Math.sin(elapsed * led.blinkRate) > 0.25;
      (led.mesh.material as THREE.MeshBasicMaterial).color.setHex(isLit ? led.baseColor : 0x03070f);
    });

    // 5. Dynamic Canvas screens
    this.updateScreensContent(elapsed);

    // 6. Movement
    if (this.isWalkMode && !this.isInspecting) {
      const move = new THREE.Vector3();
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
      const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();

      if (this.moveForward) move.add(forward);
      if (this.moveBackward) move.sub(forward);
      if (this.moveRight) move.add(right);
      if (this.moveLeft) move.sub(right);

      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(this.walkSpeed * delta);
        this.camera.position.add(move);

        // Desk collision: desk is at Z = -3.2, player stops at Z = -2.15
        this.camera.position.x = Math.max(-3.8, Math.min(3.8, this.camera.position.x));
        this.camera.position.z = Math.max(-2.15, Math.min(3.6, this.camera.position.z));
        this.camera.position.y = 1.7;

        this.currentCameraPos.copy(this.camera.position);

        const lookDir = new THREE.Vector3(
          -Math.sin(this.yaw) * Math.cos(this.pitch),
          Math.sin(this.pitch),
          -Math.cos(this.yaw) * Math.cos(this.pitch)
        );
        this.currentCameraLook.copy(this.camera.position).add(lookDir);
        this.camera.lookAt(this.currentCameraLook);
      }
    } else {
      this.currentCameraPos.lerp(this.targetCameraPos, delta * 4.2);
      this.currentCameraLook.lerp(this.targetCameraLook, delta * 4.2);

      this.camera.position.copy(this.currentCameraPos);
      this.camera.lookAt(this.currentCameraLook);

      if (Math.abs(this.camera.fov - this.targetFov) > 0.1) {
        this.camera.fov += (this.targetFov - this.camera.fov) * delta * 4.0;
        this.camera.updateProjectionMatrix();
      }
    }

    // 7. Raycast check for interactive objects
    this.raycaster.setFromCamera(this.centerCrosshair, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0 && intersects[0].distance < 6.5) {
      let root: THREE.Object3D | null = intersects[0].object;
      while (root && !this.objectStationMap.has(root)) {
        root = root.parent;
      }

      if (root) {
        const stationId = this.objectStationMap.get(root)!;
        this.hoveredStationId = stationId;
        const config = STATIONS[stationId];

        let hintText = 'Press [E] or Click to Interact';
        if (stationId === 'vertical_monitor') hintText = 'Press [E] or Click to Run Terminal Shell';
        else if (stationId === 'horizontal_monitor') hintText = 'Press [E] or Click to Open Desktop (Projects & CV)';
        else if (stationId === 'ctf_wall') hintText = 'Press [E] or Click to View CTF Writeups';
        else if (stationId === 'timeline_wall') hintText = 'Press [E] or Click to View CV & Roadmap';
        else if (stationId === 'server_rack') hintText = 'Press [E] or Click to Inspect Primary Server';
        else if (stationId === 'exit_door') hintText = 'Press [E] or Click to Dispatch Comms';

        if (this.onHoverChange) {
          this.onHoverChange({
            stationId,
            label: config?.label || 'Workstation',
            hint: hintText,
          });
        }
      }
    } else {
      this.hoveredStationId = null;
      if (this.onHoverChange) {
        this.onHoverChange(null);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  /* ----------------------------------------------------
     Disposal
  ---------------------------------------------------- */
  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('mousedown', this.onMouseDown);
    dom.removeEventListener('click', this.onClick);

    this.renderer.dispose();
    if (this.container.contains(dom)) {
      this.container.removeChild(dom);
    }
  }
}
