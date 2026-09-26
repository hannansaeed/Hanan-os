import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
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
    // Standard default cursor (no custom pointer dot or grab cursor)
    this.renderer.domElement.style.cursor = 'default';
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

    // 3. Dual Servers beside workstation
    this.buildDualServers();

    // 4. Atmospheric dust particles
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

    // Server rack ambient glow
    const serverGlow = new THREE.PointLight(0x0284c7, 3.0, 5.0);
    serverGlow.position.set(-3.6, 2.2, -3.8);
    this.scene.add(serverGlow);

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

    // 5. Coffee Steam
    this.gltfLoader.load(
      '/assets/coffeeSteamModel.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 0.25,
              depthWrite: false,
            });
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
    const navyWallMat = new THREE.MeshStandardMaterial({
      color: 0x262457, // Slate Navy Blue on opposite side behind sofa
      roughness: 0.72,
      metalness: 0.05,
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

    // 1. EAST WALL → now WEST WALL (the blue/navy one)
    const eastWallGeo = new THREE.PlaneGeometry(10.23, 6.4);
    const eastWallMesh = new THREE.Mesh(eastWallGeo, navyWallMat);
    eastWallMesh.rotation.y = Math.PI / 2;        // was -Math.PI / 2 — flipped so normal faces +X (into room)
    eastWallMesh.position.set(-4.96, 3.2, -0.415); // was (5.54, 3.2, -0.415)
    eastWallMesh.receiveShadow = true;
    wallsGroup.add(eastWallMesh);

    const bbEast = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 10.23), baseboardMat);
    bbEast.position.set(-4.92, 0.09, -0.415);  // was (5.50, 0.09, -0.415)
    wallsGroup.add(bbEast);

    // 2. SOUTH WALL (Z = 4.45m, spans X: -4.96m to +5.54m) - RED WALL
    const southWallGeo = new THREE.PlaneGeometry(10.50, 6.4);
    const southWallMesh = new THREE.Mesh(southWallGeo, burgundyWallMat);
    southWallMesh.rotation.y = Math.PI; // Faces inward (-Z into the room)
    southWallMesh.position.set(0.287, 3.2, 4.45);
    southWallMesh.receiveShadow = true;
    wallsGroup.add(southWallMesh);

    const bbSouth = new THREE.Mesh(new THREE.BoxGeometry(10.50, 0.18, 0.06), baseboardMat);
    bbSouth.position.set(0.287, 0.09, 4.42);
    wallsGroup.add(bbSouth);

    // Dedicated Wall Illumination (Warm glow onto East and South walls)
    const eastWallLight = new THREE.PointLight(0xffedd5, 2.2, 9.0);
    eastWallLight.position.set(-3.62, 3.6, -0.415); // was (4.2, 3.6, -0.415)
    wallsGroup.add(eastWallLight);

    const southWallLight = new THREE.PointLight(0xffedd5, 2.2, 9.0);
    southWallLight.position.set(0.287, 3.6, 3.2);
    wallsGroup.add(southWallLight);

    // 3. SIMPLE FLUSH CEILING (Y = 6.4m, spans 10.50m x 10.23m)
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x141822,
      roughness: 0.85,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const ceilingGeo = new THREE.PlaneGeometry(10.50, 10.23);
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.rotation.x = Math.PI / 2; // Facing down
    ceilingMesh.position.set(0.287, 6.4, -0.415);
    ceilingMesh.receiveShadow = true;
    wallsGroup.add(ceilingMesh);

    // Recessed Pot Lights
    const potLightMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    const potTrimMat = new THREE.MeshStandardMaterial({ color: 0x222836, metalness: 0.8 });
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
    });

    this.scene.add(wallsGroup);
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
     Station Zooming & Transitions
  ---------------------------------------------------- */
  public goToStation(stationId: StationId) {
    const config = STATIONS[stationId];
    if (!config) return;

    this.activeStation = stationId;
    this.targetCameraPos.set(...config.cameraPos);
    this.targetCameraLook.set(...config.cameraTarget);
    this.targetFov = config.fov || 52;

    this.isInspecting = stationId !== 'overview';
    this.isWalkMode = !this.isInspecting;

    soundEngine.playWhoosh();
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
      this.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, this.pitch));

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
      this.onStationSelect?.(this.hoveredStationId);
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
        if (this.hoveredStationId !== stationId) {
          this.hoveredStationId = stationId;
          const config = STATIONS[stationId];

          let hintText = 'Press [E] or Click to Interact';
          if (stationId === 'vertical_monitor') hintText = 'Press [E] or Click to Run Terminal Shell';
          else if (stationId === 'horizontal_monitor') hintText = 'Press [E] or Click to Open Desktop (Projects & CV)';
          else if (stationId === 'server_rack') hintText = 'Press [E] or Click to Inspect Primary Server';
          else if (stationId === 'desk') hintText = 'Press [E] or Click to Inspect Workstation';

          this.onHoverChange?.({
            stationId,
            label: config?.label || 'Workstation',
            hint: hintText,
          });
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
