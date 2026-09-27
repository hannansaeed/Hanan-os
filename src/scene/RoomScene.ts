import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { StationId } from '../types';
import { STATIONS } from '../data/portfolioData';
import { CRTShader } from './shaders/crtShader';
import { DustParticleShader } from './shaders/serverLedShader';
import { CoffeeSteamShader } from './shaders/coffeeSteamShader';
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

  // Loaders
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private textureLoader: THREE.TextureLoader;

  // Camera & Navigation state
  private currentCameraPos: THREE.Vector3;
  private targetCameraPos: THREE.Vector3;
  private currentCameraLook: THREE.Vector3;
  private targetCameraLook: THREE.Vector3;
  private targetFov: number = 56;
  private activeStation: StationId = 'overview';
  private isInspecting: boolean = false;
  private isTransitioningBack: boolean = false;

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
  private coffeeSteamMaterial!: THREE.ShaderMaterial;

  // Dynamic canvas for Primary Server 1 Status LCD
  private serverLcdCanvas!: HTMLCanvasElement;
  private serverLcdCtx!: CanvasRenderingContext2D;
  private serverLcdTexture!: THREE.CanvasTexture;

  // Dynamic canvas for Interactive Whiteboard
  private whiteboardCanvas!: HTMLCanvasElement;
  private whiteboardCtx!: CanvasRenderingContext2D;
  private whiteboardTexture!: THREE.CanvasTexture;
  private boardMesh!: THREE.Mesh;

  // 3D Objects & Models
  private topChairMesh: THREE.Object3D | null = null;
  private dustPoints!: THREE.Points;
  private server1Leds: { mesh: THREE.Mesh; baseColor: number; blinkRate: number }[] = [];
  private server2Leds: { mesh: THREE.Mesh; baseColor: number; blinkRate: number }[] = [];

  // Callbacks
  public onStationSelect?: (stationId: StationId) => void;
  public onHoverChange?: (hit: RaycastHitInfo | null) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // Scene & Dark Atmospheric Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090c15);
    this.scene.fog = new THREE.FogExp2(0x090c15, 0.012);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 100);

    // Initial position: overview looking into the room
    this.camera.position.set(4.2, 3.8, 3.2);
    this.currentCameraPos = this.camera.position.clone();
    this.targetCameraPos = this.camera.position.clone();

    this.currentCameraLook = new THREE.Vector3(-0.2, 1.8, -1.8);
    this.targetCameraLook = this.currentCameraLook.clone();
    this.camera.lookAt(this.currentCameraLook);

    // High quality WebGL Renderer with graceful context fallback
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
        failIfMajorPerformanceCaveat: false,
      });
    } catch {
      try {
        this.renderer = new THREE.WebGLRenderer({
          antialias: false,
          powerPreference: 'default',
        });
      } catch (err) {
        console.error('WebGL Renderer Error:', err);
        throw new Error('WebGL is not supported or context lost in this browser environment.');
      }
    }

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    // Standard default cursor
    this.renderer.domElement.style.cursor = 'default';

    // Handle WebGL context loss and restoration
    this.renderer.domElement.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault();
        if (this.animFrameId !== null) {
          cancelAnimationFrame(this.animFrameId);
          this.animFrameId = null;
        }
      },
      false
    );

    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      () => {
        this.animate();
      },
      false
    );

    container.appendChild(this.renderer.domElement);

    // Setup DRACO and GLTF loaders
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/gltf/');
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
    this.textureLoader = new THREE.TextureLoader();

    // Initialize systems
    this.initCanvasScreens();
    this.setupLighting();

    // 1. Load the authentic room model (roomModel.glb + topChairModel.glb with bakedNight.jpg)
    this.loadBakedRoomModel();

    // 2. Add the remaining two walls and ceiling to complete the 4-walled room
    this.buildComplementaryWalls();
    this.buildSocialFrames();
    this.buildBlankWhiteboard();

    // 3. Atmospheric dust particles
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
        uCurvature: { value: 0.03 },
        uScanlineIntensity: { value: 0.12 },
        uFlicker: { value: 0.01 },
        uBrightness: { value: 1.2 },
        uTint: { value: new THREE.Color(0.96, 0.98, 1.0) },
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
        uCurvature: { value: 0.03 },
        uScanlineIntensity: { value: 0.16 },
        uFlicker: { value: 0.015 },
        uBrightness: { value: 1.25 },
        uTint: { value: new THREE.Color(0.9, 1.0, 0.92) },
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

    // 4. Interactive Whiteboard Canvas (1536x960, 1.6 aspect ratio)
    this.whiteboardCanvas = document.createElement('canvas');
    this.whiteboardCanvas.width = 1536;
    this.whiteboardCanvas.height = 960;
    this.whiteboardCtx = this.whiteboardCanvas.getContext('2d')!;
    this.initWhiteboardCanvas();
    this.whiteboardTexture = new THREE.CanvasTexture(this.whiteboardCanvas);

    // 4. Coffee Steam Material (Organic Wispy Steam Shader)
    this.coffeeSteamMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uColor: { value: CoffeeSteamShader.uniforms.uColor.value.clone() },
        uOpacity: { value: 0.12 },
      },
      vertexShader: CoffeeSteamShader.vertexShader,
      fragmentShader: CoffeeSteamShader.fragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });
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
    hc.font = 'bold 34px "Syne", sans-serif';
    hc.fillStyle = 'rgba(244, 63, 94, 0.2)';
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

    // Action banner
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

    if (Math.floor(elapsed * 2) % 2 === 0) {
      vc.fillStyle = '#34d399';
      vc.fillRect(24 + vc.measureText('hanan@workstation-os:~$ ').width, lineY - 24, 8, 15);
    }

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
     Interactive Whiteboard Canvas Methods
  ---------------------------------------------------- */
  private initWhiteboardCanvas() {
    if (!this.whiteboardCtx) return;

    // Fill enamel off-white surface
    this.whiteboardCtx.fillStyle = '#fcfcfd';
    this.whiteboardCtx.fillRect(0, 0, 1536, 960);

    // Faint grey grid dots
    this.whiteboardCtx.fillStyle = 'rgba(203, 213, 225, 0.45)';
    for (let x = 40; x < 1536; x += 48) {
      for (let y = 40; y < 960; y += 48) {
        this.whiteboardCtx.beginPath();
        this.whiteboardCtx.arc(x, y, 1.5, 0, Math.PI * 2);
        this.whiteboardCtx.fill();
      }
    }

    const saved = localStorage.getItem('hananos_whiteboard_drawing');
    if (saved) {
      const img = new Image();
      img.onload = () => {
        this.whiteboardCtx.drawImage(img, 0, 0);
        if (this.whiteboardTexture) {
          this.whiteboardTexture.needsUpdate = true;
        }
      };
      img.src = saved;
    } else {
      this.drawDefaultWhiteboardContent();
    }
  }

  private drawDefaultWhiteboardContent() {
    const ctx = this.whiteboardCtx;

    // Title banner
    ctx.font = 'bold 30px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('HANAN//OS RESEARCH WHITEBOARD', 60, 75);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText('// Press [E] to zoom in & sketch diagrams, notes, or equations', 60, 105);

    // Architecture diagram box 1
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#2563eb';
    ctx.fillStyle = '#eff6ff';
    ctx.beginPath();
    ctx.roundRect(60, 150, 230, 110, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('Client Web App', 90, 192);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Vite + Three.js', 90, 222);

    // Connecting Arrow
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(290, 205);
    ctx.lineTo(390, 205);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(390, 205);
    ctx.lineTo(375, 197);
    ctx.lineTo(375, 213);
    ctx.closePath();
    ctx.fill();

    // Box 2
    ctx.strokeStyle = '#dc2626';
    ctx.fillStyle = '#fef2f2';
    ctx.beginPath();
    ctx.roundRect(390, 150, 240, 110, 12);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#991b1b';
    ctx.fillText('eBPF Kernel Agent', 410, 192);
    ctx.font = '14px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('Syscall Telemetry', 410, 222);

    // Yellow Sticky Note
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 6;

    ctx.fillStyle = '#fef08a';
    ctx.fillRect(720, 140, 220, 170);

    ctx.shadowColor = 'transparent';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#854d0e';
    ctx.fillText('VISITOR NOTES:', 740, 175);
    ctx.font = '14px sans-serif';
    ctx.fillText('• Press [E] to draw!', 740, 210);
    ctx.fillText('• Sketches stay saved', 740, 238);
    ctx.fillText('  in 3D room', 740, 260);
    ctx.restore();
  }

  /* ----------------------------------------------------
     Atmospheric Lighting (Warm Cozy Architectural Room)
  ---------------------------------------------------- */
  private setupLighting() {
    // Ambient & Hemisphere with warm cozy tone
    const ambientLight = new THREE.AmbientLight(0xffebd6, 1.25);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfff7ed, 0x3d2817, 1.4);
    this.scene.add(hemiLight);

    // Upward ceiling illumination (highlights timber beams and wood grain)
    const ceilingUpLight = new THREE.DirectionalLight(0xffecd6, 0.9);
    ceilingUpLight.position.set(0, 1.0, 3.0);
    ceilingUpLight.target.position.set(0, 5.6, 3.0);
    this.scene.add(ceilingUpLight);
    this.scene.add(ceilingUpLight.target);

    // Warm desk pendant lights
    const pendant1 = new THREE.PointLight(0xff9933, 3.8, 8.0);
    pendant1.position.set(-0.6, 4.2, -3.8);
    this.scene.add(pendant1);

    const pendant2 = new THREE.PointLight(0xff9933, 3.8, 8.0);
    pendant2.position.set(1.4, 4.2, -3.8);
    this.scene.add(pendant2);

    // Warm desk lamp focused on workstation
    const deskLamp = new THREE.PointLight(0xffeedd, 3.4, 5.0);
    deskLamp.position.set(0.8, 3.6, -4.0);
    this.scene.add(deskLamp);

    // Cold monitor glows (cyan & emerald)
    const blueMonitorGlow = new THREE.PointLight(0x38bdf8, 2.5, 3.5);
    blueMonitorGlow.position.set(0.31, 3.4, -4.2);
    this.scene.add(blueMonitorGlow);

    const greenMonitorGlow = new THREE.PointLight(0x34d399, 2.5, 3.5);
    greenMonitorGlow.position.set(2.22, 2.8, -4.0);
    this.scene.add(greenMonitorGlow);

    // Warm ceiling pot lights across the expanded room
    const ceilingWarm1 = new THREE.PointLight(0xffedd5, 2.2, 14.0);
    ceilingWarm1.position.set(0.5, 5.2, 3.5);
    this.scene.add(ceilingWarm1);

    const ceilingWarm2 = new THREE.PointLight(0xffedd5, 2.2, 14.0);
    ceilingWarm2.position.set(0.5, 5.2, 9.0);
    this.scene.add(ceilingWarm2);

    const ceilingWest = new THREE.PointLight(0xffecd6, 1.8, 10.0);
    ceilingWest.position.set(-6.0, 5.0, 0.5);
    this.scene.add(ceilingWest);

    const ceilingEast = new THREE.PointLight(0xffecd6, 1.8, 10.0);
    ceilingEast.position.set(6.0, 5.0, 0.5);
    this.scene.add(ceilingEast);
  }

  /* ----------------------------------------------------
     Load Bruno Simon Baked Room Model & Models
  ---------------------------------------------------- */
  private loadBakedRoomModel() {
    // Load baked night texture
    const bakedNightTexture = this.textureLoader.load('/assets/bakedNight.jpg');
    bakedNightTexture.flipY = false;
    bakedNightTexture.colorSpace = THREE.SRGBColorSpace;

    const bakedMaterial = new THREE.MeshBasicMaterial({ map: bakedNightTexture });

    // 1. Central Workstation Room Model (Loaded once in the room center)
    this.gltfLoader.load(
      '/assets/roomModel.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = bakedMaterial;
            child.receiveShadow = true;
          }
        });
        this.scene.add(gltf.scene);
      },
      undefined,
      (err) => {
        console.warn('Using procedural room fallback:', err);
        this.buildProceduralRoomFallback();
      }
    );

    // 2. Swiveling Chair Top
    this.gltfLoader.load(
      '/assets/topChairModel.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = bakedMaterial;
          }
        });
        this.topChairMesh = gltf.scene;
        this.scene.add(this.topChairMesh);
      },
      undefined,
      () => {
        // Fallback chair if GLTF fails
        const chair = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.08, 0.45),
          new THREE.MeshStandardMaterial({ color: 0x1e2430 })
        );
        chair.position.set(0.8, 1.8, -2.5);
        this.scene.add(chair);
      }
    );

    // 3. Horizontal PC Screen with dynamic desktop CRT shader
    this.gltfLoader.load(
      '/assets/pcScreenModel.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = this.horizMaterial;
          }
        });
        this.scene.add(gltf.scene);
        this.registerInteractive(gltf.scene, 'horizontal_monitor');
      },
      undefined,
      () => {
        // Fallback horizontal screen
        const fallbackScreen = new THREE.Mesh(
          new THREE.PlaneGeometry(1.3, 0.65),
          this.horizMaterial
        );
        fallbackScreen.position.set(0.31, 3.36, -4.59);
        this.scene.add(fallbackScreen);
        this.registerInteractive(fallbackScreen, 'horizontal_monitor');
      }
    );

    // 4. Vertical / Second Screen with live terminal CRT shader
    this.gltfLoader.load(
      '/assets/macScreenModel.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = this.vertMaterial;
          }
        });
        this.scene.add(gltf.scene);
        this.registerInteractive(gltf.scene, 'vertical_monitor');
      },
      undefined,
      () => {
        // Fallback vertical screen
        const fallbackVert = new THREE.Mesh(
          new THREE.PlaneGeometry(0.55, 0.95),
          this.vertMaterial
        );
        fallbackVert.position.set(2.22, 2.62, -4.29);
        fallbackVert.rotation.y = -Math.PI / 10;
        this.scene.add(fallbackVert);
        this.registerInteractive(fallbackVert, 'vertical_monitor');
      }
    );

    // 5. Coffee Steam (Volumetric cross-quad setup centered over the mug)
    this.gltfLoader.load(
      '/assets/coffeeSteamModel.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = this.coffeeSteamMaterial;
          }
        });

        // Add original plane (0 deg)
        this.scene.add(gltf.scene);

        // Calculate bounding box center of the steam mesh
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = new THREE.Vector3();
        box.getCenter(center);

        // Helper to clone and rotate around the steam center axis C
        const addRotatedSteam = (angle: number) => {
          const clone = gltf.scene.clone(true);
          clone.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.material = this.coffeeSteamMaterial;
            }
          });
          clone.position.sub(center);
          clone.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
          clone.position.add(center);
          clone.rotation.y += angle;
          this.scene.add(clone);
        };

        // Add 60 deg and 120 deg cross planes for 3D volumetric coverage from every side
        addRotatedSteam(Math.PI / 3);
        addRotatedSteam((2 * Math.PI) / 3);
      },
      undefined,
      () => {}
    );

    // 6. Elgato Key Light (Solid studio panel light mounted above monitor)
    this.gltfLoader.load(
      '/assets/elgatoLightModel.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Apply solid warm key light panel material to diffuser screen, baked material to frame
            const name = child.name.toLowerCase();
            if (name.includes('light') || name.includes('panel') || name.includes('screen') || name.includes('plane')) {
              child.material = new THREE.MeshBasicMaterial({
                color: 0xfffaf0,
                transparent: false,
                side: THREE.DoubleSide,
              });
            } else {
              child.material = bakedMaterial;
            }
          }
        });
        this.scene.add(gltf.scene);
      },
      undefined,
      () => {}
    );

    // 7. Loupedeck Buttons
    this.gltfLoader.load(
      '/assets/loupedeckButtonsModel.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = bakedMaterial;
          }
        });
        this.scene.add(gltf.scene);
      },
      undefined,
      () => {}
    );

    // 8. Google Home LEDs
    this.gltfLoader.load(
      '/assets/googleHomeLedsModel.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
          }
        });
        this.scene.add(gltf.scene);
      },
      undefined,
      () => {}
    );
  }

  /* ----------------------------------------------------
     Procedural Room Fallback (Ensures desk if GLB fails)
  ---------------------------------------------------- */
  private buildProceduralRoomFallback() {
    const desk = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.1, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x3d281a, roughness: 0.4 })
    );
    desk.position.set(0.5, 2.2, -4.2);
    this.scene.add(desk);
  }

  /* ----------------------------------------------------
     DUAL SERVERS (Replacing single infra rack)
     - Server 1: Primary Core Node (INTERACTABLE)
     - Server 2: Secondary Storage Array (COMPANION NODE)
  ---------------------------------------------------- */
  private buildDualServers() {
    const serversRoot = new THREE.Group();
    // Positioned in the open corner of the room
    serversRoot.position.set(-3.6, 0, -3.8);

    const cartMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.85, roughness: 0.3 });

    // 4 vertical rack posts
    const postGeo = new THREE.BoxGeometry(0.06, 2.2, 0.06);
    [
      [-0.45, 1.1, -0.4],
      [0.45, 1.1, -0.4],
      [-0.45, 1.1, 0.4],
      [0.45, 1.1, 0.4],
    ].forEach(([px, py, pz]) => {
      const post = new THREE.Mesh(postGeo, cartMat);
      post.position.set(px, py, pz);
      serversRoot.add(post);
    });

    // 3 shelves
    const shelfGeo = new THREE.BoxGeometry(0.96, 0.03, 0.86);
    [0.15, 1.1, 1.95].forEach((sy) => {
      const shelf = new THREE.Mesh(shelfGeo, cartMat);
      shelf.position.y = sy;
      serversRoot.add(shelf);
    });

    // 4 caster wheels
    for (const [wx, wz] of [[-0.45, -0.4], [0.45, -0.4], [-0.45, 0.4], [0.45, 0.4]]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12), cartMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.05, wz);
      serversRoot.add(wheel);
    }

    /* --------------------------------------------------
       SERVER 1: PRIMARY CORE MAINFRAME (INTERACTABLE!)
    -------------------------------------------------- */
    const server1Group = new THREE.Group();
    server1Group.position.set(0, 1.45, 0);

    const s1ChassisMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.9,
      roughness: 0.25,
    });
    // 3U Chassis
    const s1Chassis = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.34, 0.72), s1ChassisMat);
    s1Chassis.castShadow = true;
    server1Group.add(s1Chassis);

    // Front Metal Handles & Mounting Ears
    const earMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.95, roughness: 0.2 });
    [-0.43, 0.43].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.34, 0.02), earMat);
      ear.position.set(ex, 0, 0.36);
      server1Group.add(ear);

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), earMat);
      handle.position.set(ex, 0, 0.41);
      server1Group.add(handle);
    });

    // 12 Hot-Swap Drive Caddies (2 rows x 6 cols)
    const caddyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.35 });
    const latchMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7 });

    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 6; col++) {
        const cx = -0.32 + col * 0.128;
        const cy = -0.07 + row * 0.11;

        const tray = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.09, 0.02), caddyMat);
        tray.position.set(cx, cy, 0.362);
        server1Group.add(tray);

        const latch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.01), latchMat);
        latch.position.set(cx, cy - 0.025, 0.374);
        server1Group.add(latch);

        // Green activity LED
        const ledGreen = new THREE.Mesh(
          new THREE.SphereGeometry(0.004, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x22c55e })
        );
        ledGreen.position.set(cx - 0.035, cy + 0.026, 0.375);
        server1Group.add(ledGreen);
        this.server1Leds.push({ mesh: ledGreen, baseColor: 0x22c55e, blinkRate: 3 + Math.random() * 8 });

        // Blue status LED
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

    // Status LCD Screen
    const lcdScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.06),
      new THREE.MeshBasicMaterial({ map: this.serverLcdTexture })
    );
    lcdScreen.position.set(-0.16, 0.11, 0.365);
    server1Group.add(lcdScreen);

    // Power switch & Ethernet ports
    const s1Power = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.008, 12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    s1Power.rotation.x = Math.PI / 2;
    s1Power.position.set(0.12, 0.11, 0.365);
    server1Group.add(s1Power);

    [0x06b6d4, 0x10b981].forEach((col, idx) => {
      const port = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.016, 0.015),
        new THREE.MeshStandardMaterial({ color: 0xd97706 })
      );
      port.position.set(0.2 + idx * 0.045, 0.11, 0.365);
      server1Group.add(port);

      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.2 + idx * 0.045, 0.11, 0.38),
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
    // Register Server 1 as INTERACTABLE
    this.registerInteractive(server1Group, 'server_rack');

    /* --------------------------------------------------
       SERVER 2: SECONDARY STORAGE ARRAY (COMPANION NODE)
    -------------------------------------------------- */
    const server2Group = new THREE.Group();
    server2Group.position.set(0, 0.62, 0);

    // 4U Storage Chassis
    const s2Chassis = new THREE.Mesh(
      new THREE.BoxGeometry(0.82, 0.44, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x0b1120, metalness: 0.85, roughness: 0.35 })
    );
    s2Chassis.castShadow = true;
    server2Group.add(s2Chassis);

    [-0.43, 0.43].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 0.02), earMat);
      ear.position.set(ex, 0, 0.36);
      server2Group.add(ear);
    });

    // 24 Dense Storage Drive Trays (4 rows x 6 cols)
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 6; col++) {
        const cx = -0.32 + col * 0.128;
        const cy = -0.15 + row * 0.095;

        const tray = new THREE.Mesh(new THREE.BoxGeometry(0.116, 0.08, 0.015), caddyMat);
        tray.position.set(cx, cy, 0.362);
        server2Group.add(tray);

        const led = new THREE.Mesh(
          new THREE.SphereGeometry(0.0035, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        led.position.set(cx - 0.035, cy + 0.02, 0.372);
        server2Group.add(led);
        this.server2Leds.push({ mesh: led, baseColor: 0x38bdf8, blinkRate: 4 + Math.random() * 10 });
      }
    }

    // Fiber Optic Cables looping between Server 2 and Server 1
    for (let f = 0; f < 2; f++) {
      const fiberCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.25 + f * 0.05, 0.18, 0.37),
        new THREE.Vector3(-0.28 + f * 0.05, 0.45, 0.45),
        new THREE.Vector3(-0.24 + f * 0.05, 0.65, 0.42),
        new THREE.Vector3(-0.22 + f * 0.05, 0.78, 0.37),
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
     Complementary Walls & Ceiling (Completes the 4-Walled Room):
     - East Wall at X = 5.54m (Burgundy #5c2324, matching TV wall)
     - South Wall at Z = 4.70m (Blue / Slate Navy #262457, on opposite side behind sofa)
     - Flush Ceiling (Overhead at Y = 6.4m)
  ---------------------------------------------------- */
  private buildComplementaryWalls() {
    const wallsGroup = new THREE.Group();

    // 2 EXACT WALL COLORS MATCHING THE 3D MODEL:
    // White wall matching cabinet color tone
    const whiteWallMat = new THREE.MeshStandardMaterial({
      color: 0xc4c9d4, // Soft off-white/cream-grey matching the cabinet doors
      roughness: 0.9,
      metalness: 0.01,
      side: THREE.DoubleSide,
    });

    const burgundyWallMat = new THREE.MeshStandardMaterial({
      color: 0x5c2324, // Warm Burgundy Red matching TV wall
      roughness: 0.72,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    const baseboardMat = new THREE.MeshStandardMaterial({
      color: 0x1c130e,
      roughness: 0.6,
    });

    // 1. WEST WALL - RED WALL (matching room style)
    const eastWallGeo = new THREE.PlaneGeometry(10.23, 6.6);
    const eastWallMesh = new THREE.Mesh(eastWallGeo, burgundyWallMat);
    eastWallMesh.rotation.y = Math.PI / 2;        // Normal faces +X (into room)
    eastWallMesh.position.set(-4.96, 3.1, -0.415);
    eastWallMesh.receiveShadow = true;
    wallsGroup.add(eastWallMesh);

    const bbEast = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 10.23), baseboardMat);
    bbEast.position.set(-4.92, 0.09, -0.415);
    wallsGroup.add(bbEast);

    // 2. SOUTH WALL (Z = 4.45m, spans X: -4.96m to +5.54m) - RED WALL
    const southWallGeo = new THREE.PlaneGeometry(10.50, 6.6);
    const southWallMesh = new THREE.Mesh(southWallGeo, burgundyWallMat);
    southWallMesh.rotation.y = Math.PI; // Faces inward (-Z into the room)
    southWallMesh.position.set(0.287, 3.1, 4.45);
    southWallMesh.receiveShadow = true;
    wallsGroup.add(southWallMesh);

    const bbSouth = new THREE.Mesh(new THREE.BoxGeometry(10.50, 0.18, 0.06), baseboardMat);
    bbSouth.position.set(0.287, 0.09, 4.42);
    wallsGroup.add(bbSouth);

    const southWallLight = new THREE.PointLight(0xffedd5, 1.0, 9.0);
    southWallLight.position.set(0.287, 3.6, 3.2);
    wallsGroup.add(southWallLight);

    // Floor fill lights to lift contact shadows at floor-wall intersections
    const floorFillLeft = new THREE.PointLight(0xffedd5, 1.2, 8.0);
    floorFillLeft.position.set(-4.2, 0.2, -0.5);
    wallsGroup.add(floorFillLeft);

    const floorFillSouth = new THREE.PointLight(0xffedd5, 1.2, 8.0);
    floorFillSouth.position.set(0.287, 0.2, 3.8);
    wallsGroup.add(floorFillSouth);

    // 3. ATMOSPHERIC NIGHT STUDIO CEILING (Y = 6.4m, spans 10.50m x 10.23m)
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x0b0f19, // Deep midnight navy slate matching the studio night vibe
      roughness: 0.9,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    const ceilingGeo = new THREE.PlaneGeometry(10.50, 10.23);
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2; // Facing down
    ceilingMesh.position.set(0.287, 6.4, -0.415);
    ceilingMesh.receiveShadow = true;
    wallsGroup.add(ceilingMesh);

    // Recessed Pot Lights with warm down-lighting
    const potLightMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    const potTrimMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
    const potPositions: [number, number][] = [
      [0.287, 2.0], [0.287, -2.8],
      [-2.5, -0.4], [3.2, -0.4],
    ];
    potPositions.forEach(([px, pz]) => {
      const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 16), potTrimMat);
      trim.position.set(px, 6.38, pz);
      wallsGroup.add(trim);

      const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), potLightMat);
      bulb.rotation.x = Math.PI / 2;
      bulb.position.set(px, 6.36, pz);
      wallsGroup.add(bulb);

      // Warm overhead downlight for atmospheric studio glow
      const downLight = new THREE.PointLight(0xffedd5, 1.2, 6.0);
      downLight.position.set(px, 6.2, pz);
      wallsGroup.add(downLight);
    });

    this.scene.add(wallsGroup);
  }

  /* ----------------------------------------------------
     Procedural Social Media Interactive Frames (West Wall)
     - Synchronous 2D canvas textures for LinkedIn, GitHub, and Steam on cream matte
  ---------------------------------------------------- */
  private buildSocialFrames() {
    const socialLinks = [
      { id: 'social_linkedin' as StationId, type: 'linkedin', z: 2.2, y: 4.5 },
      { id: 'social_github' as StationId, type: 'github', z: 1.2, y: 3.6 },
      { id: 'social_steam' as StationId, type: 'steam', z: 2.2, y: 2.7 },
    ];

    socialLinks.forEach((item) => {
      const group = new THREE.Group();

      // 1. Dark Wood Outer Frame
      const frameGeo = new THREE.BoxGeometry(0.85, 0.85, 0.06);
      const frameMat = new THREE.MeshStandardMaterial({
        color: 0x322622,
        roughness: 0.7,
        metalness: 0.1,
      });
      const frameMesh = new THREE.Mesh(frameGeo, frameMat);
      frameMesh.castShadow = true;
      group.add(frameMesh);

      // 2. Inner Canvas displaying Cream Matte + Logo synchronously
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      // Warm off-white / cream matte background
      const artPaperBg = '#e5ded3';
      ctx.fillStyle = artPaperBg;
      ctx.fillRect(0, 0, 512, 512);

      // Inner frame edge shadow (top & left inner shadows)
      const gradTop = ctx.createLinearGradient(0, 0, 0, 36);
      gradTop.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
      gradTop.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradTop;
      ctx.fillRect(0, 0, 512, 36);

      const gradLeft = ctx.createLinearGradient(0, 0, 36, 0);
      gradLeft.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
      gradLeft.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradLeft;
      ctx.fillRect(0, 0, 36, 512);

      // Soft paper bevel border
      ctx.strokeStyle = 'rgba(100, 85, 70, 0.15)';
      ctx.lineWidth = 12;
      ctx.strokeRect(6, 6, 500, 500);

      // Drop shadow for logo element depth inside frame
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 8;

      // Render crisp logo directly onto 2D canvas context
      if (item.type === 'linkedin') {
        // LinkedIn Logo (Light Blue Rounded Square + White 'in' with aligned baseline)
        ctx.fillStyle = '#0a66c2';
        ctx.beginPath();
        ctx.roundRect(100, 100, 312, 312, 54);
        ctx.fill();

        ctx.restore(); // Disable shadow for inner text fill
        ctx.fillStyle = '#ffffff';
        // 'i' dot
        ctx.beginPath();
        ctx.arc(170, 182, 22, 0, Math.PI * 2);
        ctx.fill();

        // 'i' stem (top: 225, bottom: 350)
        ctx.fillRect(148, 225, 44, 125);

        // 'n' (top: 225, bottom: 350, perfectly aligned with 'i')
        ctx.beginPath();
        ctx.moveTo(218, 225);
        ctx.lineTo(260, 225);
        ctx.lineTo(260, 250);
        ctx.bezierCurveTo(275, 222, 298, 220, 318, 220);
        ctx.bezierCurveTo(350, 220, 350, 250, 350, 275);
        ctx.lineTo(350, 350);
        ctx.lineTo(308, 350);
        ctx.lineTo(308, 272);
        ctx.bezierCurveTo(308, 256, 302, 250, 288, 250);
        ctx.bezierCurveTo(272, 250, 260, 262, 260, 278);
        ctx.lineTo(260, 350);
        ctx.lineTo(218, 350);
        ctx.closePath();
        ctx.fill();
      } else if (item.type === 'github') {
        // GitHub Logo (Dark Circle + Cutout matching outer art paper background)
        ctx.fillStyle = '#171a21';
        ctx.beginPath();
        ctx.arc(256, 256, 160, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // Disable shadow for inner fill
        ctx.fillStyle = artPaperBg; // Exactly matches outer paper color
        const path = new Path2D(
          'M256 120c-75.1 0-136 60.9-136 136 0 60.1 39 111.1 93.1 129.1 6.8 1.3 9.3-3 9.3-6.6 0-3.3-.1-14.2-.2-25.8-37.8 8.2-45.8-16-45.8-16-6.2-15.7-15.1-19.9-15.1-19.9-12.3-8.4.9-8.2.9-8.2 13.6 1 20.8 14 20.8 14 12.1 20.7 31.8 14.7 39.5 11.2 1.2-8.8 4.7-14.7 8.6-18.1-30.2-3.4-61.9-15.1-61.9-67.2 0-14.8 5.3-27 14-36.5-1.4-3.4-6.1-17.3 1.3-36 0 0 11.4-3.6 37.4 13.9 10.8-3 22.5-4.5 34.1-4.6 11.6.1 23.3 1.6 34.1 4.6 26-17.6 37.3-13.9 37.3-13.9 7.4 18.7 2.7 32.6 1.3 36 8.7 9.5 14 21.7 14 36.5 0 52.2-31.8 63.7-62.1 67.1 4.9 4.2 9.2 12.5 9.2 25.2 0 18.2-.2 32.9-.2 37.4 0 3.7 2.5 8 9.4 6.6C393.1 367 432 316.1 432 256c0-75.1-60.9-136-136-136z'
        );
        ctx.fill(path);
      } else if (item.type === 'steam') {
        // Steam Logo (Dark Circle + Official White Steam Piston Vector)
        ctx.fillStyle = '#171a21';
        ctx.beginPath();
        ctx.arc(256, 256, 160, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // Disable shadow for inner white Piston fill
        ctx.fillStyle = '#ffffff';
        const steamPath = new Path2D(
          'M256 120c-75.1 0-136 60.9-136 136 0 62.1 41.5 114.5 98.4 131l24.6-35.5c-5.4-2.1-10.2-5.4-14-9.6l-32 13.1c-1.5.6-3.1.9-4.8.9-7.1 0-12.8-5.7-12.8-12.8 0-5.4 3.4-10.1 8.1-11.9l33.1-13.6c2.3-13.2 12.2-23.5 25.1-25.9l18.4-44.7c-17.5-6.7-26.1-26.3-19.4-43.8 6.7-17.5 26.3-26.1 43.8-19.4 17.5 6.7 26.1 26.3 19.4 43.8-5.1 13.4-18.3 22.2-32.6 22.2h-1.7l-17.9 43.5c.8.1 1.7.1 2.5.1 15.1 0 27.4-12.3 27.4-27.4 0-1.5-.1-2.9-.4-4.3l36.6 15.1c7.9 3.3 11.7 12.4 8.5 20.3-3.3 7.9-12.4 11.7-20.3 8.5l-35.8-14.7c-6.1 7-15 11.1-24.6 11.1-6.7 0-13.1-2-18.6-5.7l-25.7 37.1c24.7 7.1 50.7 6.6 75.1-1.4C354.7 354.7 392 308.8 392 256c0-75.1-60.9-136-136-136zm50.4 108.4c-8.8 0-15.8-7.1-15.8-15.8 0-8.8 7.1-15.8 15.8-15.8s15.8 7.1 15.8 15.8c0 8.7-7.1 15.8-15.8 15.8z'
        );
        ctx.fill(steamPath);
      }

      const canvasTexture = new THREE.CanvasTexture(canvas);
      canvasTexture.colorSpace = THREE.SRGBColorSpace;
      canvasTexture.needsUpdate = true;

      const matteMat = new THREE.MeshBasicMaterial({ map: canvasTexture });
      const matteGeo = new THREE.PlaneGeometry(0.72, 0.72);
      const matteMesh = new THREE.Mesh(matteGeo, matteMat);
      matteMesh.position.set(0, 0, 0.032);
      group.add(matteMesh);

      // Position on West Wall (X = -4.93, facing +X into the room)
      group.position.set(-4.93, item.y, item.z);
      group.rotation.y = Math.PI / 2;

      this.scene.add(group);
      this.registerInteractive(group, item.id);
    });
  }

  /* ----------------------------------------------------
     Blank Whiteboard (Mounted on South Wall)
     - Photorealistic enamel whiteboard surface with clearcoat gloss
     - Extruded anodized aluminum frame with black rubber trim gasket
     - Dark grey corner caps with metallic mounting rivets
     - Wall Z-mounting brackets at top & bottom
     - Detailed marker tray with end plugs, 4 dry-erase markers & felt eraser
  ---------------------------------------------------- */
  private buildBlankWhiteboard() {
    const wbGroup = new THREE.Group();

    const boardWidth = 2.4;
    const boardHeight = 1.5;
    const boardDepth = 0.03;

    // 1. High-Gloss Whiteboard Enamel Panel Surface (Clearcoat Physical Material)
    const boardMat = new THREE.MeshPhysicalMaterial({
      map: this.whiteboardTexture,
      roughness: 0.12,
      metalness: 0.02,
      clearcoat: 0.8,
      clearcoatRoughness: 0.06,
      reflectivity: 0.9,
    });
    this.boardMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(boardWidth, boardHeight),
      boardMat
    );
    this.boardMesh.position.set(0, 0, boardDepth / 2 + 0.002);
    this.boardMesh.receiveShadow = true;
    wbGroup.add(this.boardMesh);

    // Galvanized Steel Backing Board
    const backingMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.5,
      roughness: 0.4,
    });
    const backingMesh = new THREE.Mesh(
      new THREE.BoxGeometry(boardWidth, boardHeight, boardDepth),
      backingMat
    );
    backingMesh.castShadow = true;
    wbGroup.add(backingMesh);

    // 2. Extruded Anodized Silver Aluminum Frame Rails
    const alumMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      metalness: 0.92,
      roughness: 0.2,
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.9,
    });

    const railThickness = 0.048;
    const railDepth = 0.045;

    // Top & Bottom Rails
    [boardHeight / 2 + railThickness / 2, -boardHeight / 2 - railThickness / 2].forEach((yPos) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(boardWidth, railThickness, railDepth),
        alumMat
      );
      rail.position.set(0, yPos, railDepth / 2 - 0.008);
      rail.castShadow = true;
      wbGroup.add(rail);

      // Inner Rubber Trim Gasket
      const gasket = new THREE.Mesh(
        new THREE.BoxGeometry(boardWidth, 0.008, 0.012),
        rubberMat
      );
      gasket.position.set(0, yPos > 0 ? yPos - railThickness / 2 - 0.004 : yPos + railThickness / 2 + 0.004, boardDepth / 2 + 0.004);
      wbGroup.add(gasket);
    });

    // Left & Right Rails
    [-boardWidth / 2 - railThickness / 2, boardWidth / 2 + railThickness / 2].forEach((xPos) => {
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(railThickness, boardHeight + railThickness * 2, railDepth),
        alumMat
      );
      rail.position.set(xPos, 0, railDepth / 2 - 0.008);
      rail.castShadow = true;
      wbGroup.add(rail);

      // Inner Rubber Trim Gasket
      const gasket = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, boardHeight, 0.012),
        rubberMat
      );
      gasket.position.set(xPos > 0 ? xPos - railThickness / 2 - 0.004 : xPos + railThickness / 2 + 0.004, 0, boardDepth / 2 + 0.004);
      wbGroup.add(gasket);
    });

    // 3. Dark Molded Corner Caps with Metallic Mounting Rivets
    const capMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.6,
      metalness: 0.1,
    });

    const rivetMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      metalness: 0.95,
      roughness: 0.15,
    });

    const capSize = 0.075;
    const corners = [
      [-boardWidth / 2 - railThickness / 2, boardHeight / 2 + railThickness / 2],
      [boardWidth / 2 + railThickness / 2, boardHeight / 2 + railThickness / 2],
      [-boardWidth / 2 - railThickness / 2, -boardHeight / 2 - railThickness / 2],
      [boardWidth / 2 + railThickness / 2, -boardHeight / 2 - railThickness / 2],
    ];

    corners.forEach(([cx, cy]) => {
      const cornerMesh = new THREE.Mesh(
        new THREE.BoxGeometry(capSize, capSize, railDepth + 0.008),
        capMat
      );
      cornerMesh.position.set(cx, cy, railDepth / 2 - 0.004);
      cornerMesh.castShadow = true;
      wbGroup.add(cornerMesh);

      // Center Screw / Rivet
      const rivet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.006, 0.006, 0.008, 16),
        rivetMat
      );
      rivet.rotation.x = Math.PI / 2;
      rivet.position.set(cx, cy, railDepth + 0.002);
      wbGroup.add(rivet);
    });

    // 4. Wall Mounting Z-Brackets
    [-boardWidth * 0.35, boardWidth * 0.35].forEach((bx) => {
      [boardHeight / 2 + railThickness + 0.015, -boardHeight / 2 - railThickness - 0.015].forEach((by) => {
        const bracket = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, 0.03, 0.012),
          alumMat
        );
        bracket.position.set(bx, by, 0.004);
        wbGroup.add(bracket);
      });
    });

    // 5. Full-Length Aluminum Accessory Tray
    const trayWidth = boardWidth * 0.88;
    const trayDepth = 0.095;
    const trayHeight = 0.018;

    const trayGroup = new THREE.Group();

    // Tray Base Plate
    const trayBase = new THREE.Mesh(
      new THREE.BoxGeometry(trayWidth, trayHeight, trayDepth),
      alumMat
    );
    trayBase.position.set(0, -boardHeight / 2 - railThickness - trayHeight / 2, trayDepth / 2 + 0.008);
    trayBase.castShadow = true;
    trayGroup.add(trayBase);

    // Front Lip Rail
    const frontLip = new THREE.Mesh(
      new THREE.BoxGeometry(trayWidth, 0.026, 0.008),
      alumMat
    );
    frontLip.position.set(0, -boardHeight / 2 - railThickness + 0.006, trayDepth + 0.012);
    frontLip.castShadow = true;
    trayGroup.add(frontLip);

    // Tray Black Plastic End Plugs
    [-trayWidth / 2 - 0.004, trayWidth / 2 + 0.004].forEach((px) => {
      const endPlug = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.028, trayDepth + 0.008),
        capMat
      );
      endPlug.position.set(px, -boardHeight / 2 - railThickness + 0.002, trayDepth / 2 + 0.008);
      trayGroup.add(endPlug);
    });

    wbGroup.add(trayGroup);

    // 6. Accessories: Detailed Contoured Felt Eraser & EXPO Dry Erase Markers
    const accessoriesGroup = new THREE.Group();

    // Contoured Eraser
    const eraserGroup = new THREE.Group();
    const eraserTopHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.028, 0.055),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    eraserTopHandle.castShadow = true;

    const eraserFeltPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.152, 0.008, 0.057),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 })
    );
    eraserFeltPad.position.y = -0.016;

    eraserGroup.add(eraserTopHandle);
    eraserGroup.add(eraserFeltPad);
    eraserGroup.position.set(-0.45, -boardHeight / 2 - railThickness + 0.022, trayDepth / 2 + 0.008);
    eraserGroup.rotation.y = -0.08;
    accessoriesGroup.add(eraserGroup);

    // EXPO Markers (Black, Blue, Red, Green)
    const markerColors = [
      { capColor: 0x18181b, offset: -0.15, angle: 0.05 },
      { capColor: 0x2563eb, offset: 0.02, angle: -0.02 },
      { capColor: 0xd97706, offset: 0.18, angle: 0.08 },
      { capColor: 0x16a34a, offset: 0.35, angle: -0.04 },
    ];

    markerColors.forEach(({ capColor, offset, angle }) => {
      const marker = new THREE.Group();

      // White Body
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.12, 16),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 })
      );
      body.rotation.z = Math.PI / 2;
      body.castShadow = true;
      marker.add(body);

      // Color Ring Band
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0092, 0.0092, 0.015, 16),
        new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.3 })
      );
      band.rotation.z = Math.PI / 2;
      band.position.x = 0.025;
      marker.add(band);

      // Tapered Cap with Pocket Clip
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.010, 0.0095, 0.045, 16),
        new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.35 })
      );
      cap.rotation.z = Math.PI / 2;
      cap.position.x = 0.075;
      cap.castShadow = true;
      marker.add(cap);

      const clip = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.004, 0.005),
        new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.35 })
      );
      clip.position.set(0.07, 0.012, 0);
      marker.add(clip);

      marker.position.set(offset, -boardHeight / 2 - railThickness + 0.018, trayDepth / 2 + 0.008);
      marker.rotation.y = angle;
      accessoriesGroup.add(marker);
    });

    wbGroup.add(accessoriesGroup);

    // Position on South Wall (Z = 4.40, facing inward -Z into room)
    wbGroup.position.set(0.0, 3.5, 4.40);
    wbGroup.rotation.y = Math.PI;

    this.scene.add(wbGroup);
    this.registerInteractive(wbGroup, 'whiteboard');
  }

  /* ----------------------------------------------------
     Dust particles (Atmospheric floating particles)
  ---------------------------------------------------- */
  private buildDustParticles() {
    const count = 250;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = -4.5 + Math.random() * 9.0;
      positions[i * 3 + 1] = 0.5 + Math.random() * 3.5;
      positions[i * 3 + 2] = -4.5 + Math.random() * 5.5;
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
     Public Whiteboard Canvas Interface
  ---------------------------------------------------- */
  public getWhiteboardCanvas(): HTMLCanvasElement {
    return this.whiteboardCanvas;
  }

  public notifyWhiteboardUpdated() {
    if (this.whiteboardTexture) {
      this.whiteboardTexture.needsUpdate = true;
    }
  }

  public clearWhiteboard() {
    if (!this.whiteboardCtx) return;
    this.whiteboardCtx.fillStyle = '#fcfcfd';
    this.whiteboardCtx.fillRect(0, 0, this.whiteboardCanvas.width, this.whiteboardCanvas.height);

    // Draw background dot grid
    this.whiteboardCtx.fillStyle = 'rgba(203, 213, 225, 0.45)';
    for (let x = 40; x < 1536; x += 48) {
      for (let y = 40; y < 960; y += 48) {
        this.whiteboardCtx.beginPath();
        this.whiteboardCtx.arc(x, y, 1.5, 0, Math.PI * 2);
        this.whiteboardCtx.fill();
      }
    }

    if (this.whiteboardTexture) {
      this.whiteboardTexture.needsUpdate = true;
    }
    localStorage.removeItem('hananos_whiteboard_drawing');
  }

  public saveWhiteboardToStorage() {
    if (this.whiteboardCanvas) {
      try {
        const dataUrl = this.whiteboardCanvas.toDataURL('image/png');
        localStorage.setItem('hananos_whiteboard_drawing', dataUrl);
      } catch (err) {
        console.warn('Failed to save whiteboard drawing to localStorage:', err);
      }
    }
  }

  public raycastWhiteboard(normX: number, normY: number): { x: number; y: number } | null {
    if (!this.boardMesh) return null;

    this.raycaster.setFromCamera(new THREE.Vector2(normX, normY), this.camera);
    const intersects = this.raycaster.intersectObject(this.boardMesh, true);

    if (intersects.length > 0 && intersects[0].uv) {
      const uv = intersects[0].uv;
      const x = uv.x * 1536;
      const y = (1 - uv.y) * 960;
      return { x, y };
    }
    return null;
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
    this.targetFov = config.fov || 52;

    if (stationId === 'overview') {
      this.isInspecting = false;
      this.isWalkMode = false;
      this.isTransitioningBack = true;
    } else {
      this.isInspecting = true;
      this.isWalkMode = false;
      this.isTransitioningBack = false;
      this.exitPointerLock();
    }

    soundEngine.playWhoosh();
  }

  public stepBackToWalk() {
    this.goToStation('overview');
  }

  public setWalkMode(active: boolean) {
    this.isWalkMode = active;
    if (active) {
      this.isInspecting = false;
      this.requestPointerLock();
    } else {
      this.exitPointerLock();
    }
  }

  public requestPointerLock = () => {
    if (this.isWalkMode && document.pointerLockElement !== this.renderer.domElement) {
      try {
        this.renderer.domElement.requestPointerLock();
      } catch {
        // Pointer lock request fallback
      }
    }
  };

  public exitPointerLock = () => {
    if (document.pointerLockElement === this.renderer.domElement) {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore exit error
      }
    }
  };

  public getWalkMode(): boolean {
    return this.isWalkMode;
  }

  public getActiveStation(): StationId {
    return this.activeStation;
  }

  /* ----------------------------------------------------
     Event Handlers (FPS Game Navigation & Pointer Lock Mouse Look)
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

    if (this.isWalkMode) {
      this.requestPointerLock();
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.isWalkMode) {
      // Direct mouse movement tracking like in FPS video games
      let deltaX = e.movementX;
      let deltaY = e.movementY;

      if (deltaX === undefined || deltaY === undefined) {
        deltaX = e.clientX - this.prevMouseX;
        deltaY = e.clientY - this.prevMouseY;
      }

      if (deltaX !== 0 || deltaY !== 0) {
        this.yaw -= deltaX * 0.0022;
        this.pitch -= deltaY * 0.0022;
        this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));

        const lookDir = new THREE.Vector3(
          -Math.sin(this.yaw) * Math.cos(this.pitch),
          Math.sin(this.pitch),
          -Math.cos(this.yaw) * Math.cos(this.pitch)
        );

        this.currentCameraLook.copy(this.camera.position).add(lookDir);
        this.targetCameraLook.copy(this.currentCameraLook);
        this.camera.lookAt(this.currentCameraLook);
      }

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
      if (
        this.hoveredStationId === 'social_linkedin' ||
        this.hoveredStationId === 'social_github' ||
        this.hoveredStationId === 'social_steam'
      ) {
        let url = 'https://linkedin.com';
        if (this.hoveredStationId === 'social_github') url = 'https://github.com';
        if (this.hoveredStationId === 'social_steam') url = 'https://store.steampowered.com';

        window.open(url, '_blank', 'noopener,noreferrer');
        soundEngine.playChirp('success');
        return;
      }

      this.goToStation(this.hoveredStationId);
      this.onStationSelect?.(this.hoveredStationId);
    } else if (this.isWalkMode) {
      this.requestPointerLock();
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
      if (
        this.hoveredStationId === 'social_linkedin' ||
        this.hoveredStationId === 'social_github' ||
        this.hoveredStationId === 'social_steam'
      ) {
        let url = 'https://linkedin.com';
        if (this.hoveredStationId === 'social_github') url = 'https://github.com';
        if (this.hoveredStationId === 'social_steam') url = 'https://store.steampowered.com';

        window.open(url, '_blank', 'noopener,noreferrer');
        soundEngine.playChirp('success');
        return;
      }

      this.goToStation(this.hoveredStationId);
      this.onStationSelect?.(this.hoveredStationId);
    }

    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 0 && num <= 7) {
      const stations: StationId[] = [
        'overview',
        'horizontal_monitor',
        'vertical_monitor',
        'desk',
        'server_rack',
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
    if (this.coffeeSteamMaterial && this.coffeeSteamMaterial.uniforms.uTime) {
      this.coffeeSteamMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.dustPoints && (this.dustPoints.material as THREE.ShaderMaterial).uniforms.uTime) {
      (this.dustPoints.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    }

    // 2. Swivel chair top gently
    if (this.topChairMesh) {
      this.topChairMesh.rotation.y = Math.sin(elapsed * 0.5) * 0.12;
    }

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

    // 6. First-Person Movement
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

        // 4-walled room boundaries and free space
        this.camera.position.x = Math.max(-4.2, Math.min(4.8, this.camera.position.x));
        this.camera.position.z = Math.max(-4.6, Math.min(4.0, this.camera.position.z));
        this.camera.position.y = 3.2; // comfortable standing eye level

        // Collision buffer around central workstation desk
        if (
          this.camera.position.x > -2.2 &&
          this.camera.position.x < 3.2 &&
          this.camera.position.z > -5.2 &&
          this.camera.position.z < -3.2
        ) {
          this.camera.position.z = -3.2;
        }

        // Collision buffer around dual server racks
        if (
          this.camera.position.x > -4.8 &&
          this.camera.position.x < -2.4 &&
          this.camera.position.z > -5.0 &&
          this.camera.position.z < -2.6
        ) {
          if (this.camera.position.z < -3.8) {
            this.camera.position.x = -2.3;
          } else {
            this.camera.position.z = -2.5;
          }
        }

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
      this.currentCameraPos.lerp(this.targetCameraPos, delta * 4.8);
      this.currentCameraLook.lerp(this.targetCameraLook, delta * 4.8);

      this.camera.position.copy(this.currentCameraPos);
      this.camera.lookAt(this.currentCameraLook);

      if (Math.abs(this.camera.fov - this.targetFov) > 0.1) {
        this.camera.fov += (this.targetFov - this.camera.fov) * delta * 4.0;
        this.camera.updateProjectionMatrix();
      }

      if (this.isTransitioningBack && this.currentCameraPos.distanceTo(this.targetCameraPos) < 0.15) {
        this.isTransitioningBack = false;
        this.isWalkMode = true;
        const dir = new THREE.Vector3().subVectors(this.targetCameraLook, this.targetCameraPos).normalize();
        this.yaw = Math.atan2(-dir.x, -dir.z);
        this.pitch = Math.asin(Math.max(-0.99, Math.min(0.99, dir.y)));
        this.requestPointerLock();
      }
    }

    // 7. Raycast check for interactive objects (ONLY in overview walk mode)
    if (this.isInspecting || this.activeStation !== 'overview') {
      if (this.hoveredStationId !== null) {
        this.hoveredStationId = null;
        this.onHoverChange?.(null);
      }
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this.raycaster.setFromCamera(this.centerCrosshair, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0 && intersects[0].distance < 6.5) {
      let root: THREE.Object3D | null = intersects[0].object;
      while (root && !this.objectStationMap.has(root)) {
        root = root.parent;
      }

      if (root) {
        const stationId = this.objectStationMap.get(root)!;
        if (this.hoveredStationId !== stationId) {
          this.hoveredStationId = stationId;
          const config = STATIONS[stationId];

          let hintText = 'Press [E] or Click to Interact';
          if (stationId === 'vertical_monitor') hintText = 'Press [E] or Click to Run Terminal Shell';
          else if (stationId === 'horizontal_monitor') hintText = 'Press [E] or Click to Open Desktop (Projects & CV)';
          else if (stationId === 'server_rack') hintText = 'Press [E] or Click to Inspect Primary Server';
          else if (stationId === 'desk') hintText = 'Press [E] or Click to Inspect Workstation';
          else if (stationId === 'social_linkedin') hintText = 'Click to Open LinkedIn Profile ↗';
          else if (stationId === 'social_github') hintText = 'Click to Open GitHub Profile ↗';
          else if (stationId === 'social_steam') hintText = 'Click to Open Steam Profile ↗';

          this.onHoverChange?.({
            stationId,
            label: config?.label || 'Workstation',
            hint: hintText,
          });
        }
      } else {
        if (this.hoveredStationId !== null) {
          this.hoveredStationId = null;
          this.onHoverChange?.(null);
        }
      }
    } else {
      if (this.hoveredStationId !== null) {
        this.hoveredStationId = null;
        this.onHoverChange?.(null);
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
      this.animFrameId = null;
    }
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    const dom = this.renderer?.domElement;
    if (dom) {
      dom.removeEventListener('mousedown', this.onMouseDown);
      dom.removeEventListener('click', this.onClick);
    }

    if (this.dracoLoader) {
      this.dracoLoader.dispose();
    }

    if (this.scene) {
      this.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        if ((obj as THREE.Mesh).material) {
          const mat = (obj as THREE.Mesh).material;
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose());
          } else if (mat) {
            mat.dispose();
          }
        }
      });
    }

    if (this.renderer) {
      this.renderer.forceContextLoss();
      this.renderer.dispose();
      if (dom && this.container.contains(dom)) {
        this.container.removeChild(dom);
      }
    }
  }
}
