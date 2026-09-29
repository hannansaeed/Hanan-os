import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { StationId, ProjectItem } from '../types';
import { STATIONS, PROJECTS, CTF_CHALLENGES, CERTIFICATIONS, SKILLS_SUMMARY, SERVER_METRICS } from '../data/portfolioData';
import { CRTShader } from './shaders/crtShader';
import { DustParticleShader } from './shaders/serverLedShader';
import { CoffeeSteamShader } from './shaders/coffeeSteamShader';
import { SkyWindowShader } from './shaders/skyWindowShader';
import { soundEngine } from '../audio/soundEngine';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import customWallpaper from '../assets/images/nullos_wallpaper_1790517912301.jpg';
import customArt1 from '../assets/images/custom_art1.jpg';
import customArt2 from '../assets/images/custom_art2.jpg';
import customArt3 from '../assets/images/custom_art3.jpg';

export interface RaycastHitInfo {
  stationId: StationId;
  label: string;
  hint: string;
}

let globalRenderer: THREE.WebGLRenderer | null = null;

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

  // Saved player walk state before zooming into any object
  private savedWalkPos = new THREE.Vector3(4.2, 3.2, 3.2);
  private savedWalkLook = new THREE.Vector3(-0.2, 2.0, -1.8);
  private savedYaw: number = 0;
  private savedPitch: number = 0;
  private hasSavedWalkState: boolean = false;

  // Interactive raycasting
  private interactiveObjects: THREE.Object3D[] = [];
  private objectStationMap = new Map<THREE.Object3D, StationId>();
  private hoveredStationId: StationId | null = null;
  private raycaster = new THREE.Raycaster();
  private centerCrosshair = new THREE.Vector2(0, 0);

  // Screen meshes for exact UV raycasting
  private pcScreenMesh: THREE.Mesh | null = null;
  private macScreenMesh: THREE.Mesh | null = null;

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
  private whiteboardUnsubscribe: (() => void) | null = null;
  private boardMesh!: THREE.Mesh;

  // 3D Objects & Models
  private topChairMesh: THREE.Object3D | null = null;
  private skyWindowMaterial!: THREE.ShaderMaterial;
  private dustPoints!: THREE.Points;
  private server1Leds: { mesh: THREE.Mesh; baseColor: number; blinkRate: number }[] = [];
  private server2Leds: { mesh: THREE.Mesh; baseColor: number; blinkRate: number }[] = [];

  /* ----------------------------------------------------
     INTERACTIVE 3D SCREEN STATES (DIRECT ON-SCREEN EXECUTION)
  ---------------------------------------------------- */
  // 1. Interactive Laptop CLI Terminal State
  private terminalInput: string = '';
  private terminalLines: Array<{ text: string; color: string; bold?: boolean }> = [
    { text: 'hanan@xcthine:~$ help', color: '#34d399' },
    { text: 'AVAILABLE SHELL COMMANDS:', color: '#38bdf8', bold: true },
    { text: '  whoami       - Identity & summary', color: '#94a3b8' },
    { text: '  ls           - List GitHub repositories & local files', color: '#94a3b8' },
    { text: '  cat <file>   - Detailed specifications of file', color: '#94a3b8' },
    { text: '  cv           - Curriculum Vitae', color: '#94a3b8' },
    { text: '  skills       - Low-level programming matrix', color: '#94a3b8' },
    { text: '  nmap <host>  - Simulated SYN stealth scan', color: '#94a3b8' },
    { text: '  neofetch     - Hardware & Kernel specs', color: '#94a3b8' },
    { text: '  clear        - Clear terminal buffer', color: '#94a3b8' }
  ];
  private terminalCmdHistory: string[] = [];
  private terminalCmdIndex: number = -1;
  private terminalWaitingForPassword: boolean = false;
  private terminalTheme: 'emerald' | 'rose' | 'amber' | 'violet' = 'emerald';
  private terminalMatrixActive: boolean = false;
  private terminalMatrixDrops: number[] = [];
  private terminalMatrixCols: number = 32;

  // 2. Interactive Monitor Desktop OS State (NullOS)
  private desktopWallpaperImg: HTMLImageElement | null = null;
  private desktopActiveWindow: 'about' | 'notes' | 'resume' | 'mail' | 'settings' | 'photos' | 'trash' | 'none' = 'none';
  private desktopStartMenuOpen: boolean = false;
  private desktopActiveProjectIdx: number = 0;
  private desktopProjectCategory: 'All' | 'Cybersecurity' | 'Systems' | 'Mobile' = 'All';
  private desktopRestartingService: string | null = null;
  private desktopNotesText: string = `# Research Vectors // DedSec Workstation\n\n- [x] eBPF ringbuf syscall auditing engine.\n- [x] Post-quantum KEM (Kyber-768) benchmark.\n- [/] Android AOSP Binder IPC fuzzer.\n- [ ] Zero-Knowledge Proof verify node.`;
  private desktopMousePos: { x: number; y: number } | null = null;
  private desktopAccentTheme: 'rose' | 'emerald' | 'amber' | 'violet' = 'rose';

  // Callbacks
  public onStationSelect?: (stationId: StationId) => void;
  public onHoverChange?: (hit: RaycastHitInfo | null) => void;
  public isPointerLockBlocked: boolean = false;
  private isPointerLocked: boolean = false;

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

    const initialDir = new THREE.Vector3().subVectors(this.currentCameraLook, this.camera.position).normalize();
    this.yaw = Math.atan2(-initialDir.x, -initialDir.z);
    this.pitch = Math.asin(Math.max(-0.99, Math.min(0.99, initialDir.y)));
    this.savedYaw = this.yaw;
    this.savedPitch = this.pitch;
    this.savedWalkPos.copy(this.camera.position);
    this.savedWalkLook.copy(this.currentCameraLook);

    // High quality WebGL Renderer with graceful context fallback and global context preservation
    if (!globalRenderer) {
      try {
        globalRenderer = new THREE.WebGLRenderer({
          antialias: true,
          powerPreference: 'high-performance',
          stencil: false,
          depth: true,
          failIfMajorPerformanceCaveat: false,
        });
      } catch {
        try {
          globalRenderer = new THREE.WebGLRenderer({
            antialias: false,
            powerPreference: 'default',
          });
        } catch (err) {
          console.error('WebGL Renderer Error:', err);
          throw new Error('WebGL is not supported or context lost in this browser environment.');
        }
      }
    }
    this.renderer = globalRenderer;
    this.renderer.debug.checkShaderErrors = false;

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
    const maxAniso = this.renderer?.capabilities?.getMaxAnisotropy?.() || 16;

    // 1. High-DPI Horizontal Desktop Screen (2048x1152 - 16:9 2K Canvas)
    this.horizCanvas = document.createElement('canvas');
    this.horizCanvas.width = 2048;
    this.horizCanvas.height = 1152;
    this.horizCtx = this.horizCanvas.getContext('2d', { alpha: false })!;
    this.horizTexture = new THREE.CanvasTexture(this.horizCanvas);
    this.horizTexture.minFilter = THREE.LinearFilter;
    this.horizTexture.magFilter = THREE.LinearFilter;
    this.horizTexture.generateMipmaps = false;
    this.horizTexture.anisotropy = maxAniso;

    // Load custom NullOS wallpaper
    this.desktopWallpaperImg = new Image();
    this.desktopWallpaperImg.crossOrigin = 'anonymous';
    this.desktopWallpaperImg.src = customWallpaper;
    this.desktopWallpaperImg.onload = () => {
      if (this.horizTexture) {
        this.horizTexture.needsUpdate = true;
      }
    };

    this.horizMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.horizTexture },
        uTime: { value: 0.0 },
        uCurvature: { value: 0.0 },
        uScanlineIntensity: { value: 0.02 },
        uFlicker: { value: 0.0 },
        uBrightness: { value: 1.05 },
        uTint: { value: new THREE.Color(1.0, 1.0, 1.0) },
      },
      vertexShader: CRTShader.vertexShader,
      fragmentShader: CRTShader.fragmentShader,
    });

    // 2. High-DPI Vertical Laptop Terminal Screen (2048x1152)
    this.vertCanvas = document.createElement('canvas');
    this.vertCanvas.width = 2048;
    this.vertCanvas.height = 1152;
    this.vertCtx = this.vertCanvas.getContext('2d', { alpha: false })!;
    this.vertTexture = new THREE.CanvasTexture(this.vertCanvas);
    this.vertTexture.minFilter = THREE.LinearFilter;
    this.vertTexture.magFilter = THREE.LinearFilter;
    this.vertTexture.generateMipmaps = false;
    this.vertTexture.anisotropy = maxAniso;

    this.vertMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.vertTexture },
        uTime: { value: 0.0 },
        uCurvature: { value: 0.0 },
        uScanlineIntensity: { value: 0.03 },
        uFlicker: { value: 0.0 },
        uBrightness: { value: 1.08 },
        uTint: { value: new THREE.Color(1.0, 1.0, 1.0) },
      },
      vertexShader: CRTShader.vertexShader,
      fragmentShader: CRTShader.fragmentShader,
    });

    // 3. Primary Server 1 Status LCD Screen (512x128)
    this.serverLcdCanvas = document.createElement('canvas');
    this.serverLcdCanvas.width = 512;
    this.serverLcdCanvas.height = 128;
    this.serverLcdCtx = this.serverLcdCanvas.getContext('2d', { alpha: false })!;
    this.serverLcdTexture = new THREE.CanvasTexture(this.serverLcdCanvas);
    this.serverLcdTexture.minFilter = THREE.LinearFilter;
    this.serverLcdTexture.magFilter = THREE.LinearFilter;

    // 4. Interactive Whiteboard Canvas (1536x960, 1.6 aspect ratio)
    this.whiteboardCanvas = document.createElement('canvas');
    this.whiteboardCanvas.width = 1536;
    this.whiteboardCanvas.height = 960;
    this.whiteboardCtx = this.whiteboardCanvas.getContext('2d')!;
    this.whiteboardTexture = new THREE.CanvasTexture(this.whiteboardCanvas);
    this.initWhiteboardCanvas();

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

    // 5. Sky & Drifting Clouds Window Backdrop Material
    this.skyWindowMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
      },
      vertexShader: SkyWindowShader.vertexShader,
      fragmentShader: SkyWindowShader.fragmentShader,
      side: THREE.DoubleSide,
    });
  }

  private updateScreensContent(elapsed: number) {
    this.renderDesktopOnMonitor(elapsed);
    this.renderTerminalOnLaptop(elapsed);

    // 3. SERVER 1 STATUS LCD SCREEN
    const sc = this.serverLcdCtx;
    sc.fillStyle = '#05121f';
    sc.fillRect(0, 0, 512, 128);
    sc.font = 'bold 22px "JetBrains Mono", monospace';
    sc.fillStyle = '#38bdf8';
    sc.fillText('NODE-01 // CORE MAINFRAME', 20, 36);
    sc.font = '18px "JetBrains Mono", monospace';
    sc.fillStyle = '#34d399';
    sc.fillText(`IP: 10.13.37.1  CPU: ${(36 + Math.sin(elapsed) * 3).toFixed(1)}°C`, 20, 72);
    sc.fillStyle = '#94a3b8';
    sc.fillText(`LOAD: 0.14  SANDBOXES: 4 ACTIVE`, 20, 104);
    this.serverLcdTexture.needsUpdate = true;
  }

  /* ----------------------------------------------------
     1. HORIZONTAL DESKTOP OS (NullOS - Joan OS / macOS Style Web Desktop)
  ---------------------------------------------------- */
  private renderDesktopOnMonitor(elapsed: number) {
    const hc = this.horizCtx;

    // 1. Draw Custom Planet Wallpaper or Ambient Glow Fallback
    if (this.desktopWallpaperImg && this.desktopWallpaperImg.complete && this.desktopWallpaperImg.naturalWidth > 0) {
      hc.drawImage(this.desktopWallpaperImg, 0, 0, 2048, 1152);
    } else {
      const bgGrad = hc.createLinearGradient(0, 0, 2048, 1152);
      bgGrad.addColorStop(0, '#0b0f19');
      bgGrad.addColorStop(0.35, '#0f172a');
      bgGrad.addColorStop(0.7, '#1e1b4b');
      bgGrad.addColorStop(1, '#090d16');
      hc.fillStyle = bgGrad;
      hc.fillRect(0, 0, 2048, 1152);

      // Glowing Ambient Cosmic Waves
      hc.save();
      hc.filter = 'blur(40px)';
      
      const wave1 = hc.createRadialGradient(700, 600, 80, 700, 600, 550);
      wave1.addColorStop(0, 'rgba(14, 165, 233, 0.22)');
      wave1.addColorStop(0.6, 'rgba(56, 189, 248, 0.08)');
      wave1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      hc.fillStyle = wave1;
      hc.beginPath();
      hc.arc(700, 600, 550, 0, Math.PI * 2);
      hc.fill();

      const wave2 = hc.createRadialGradient(1400, 480, 100, 1400, 480, 600);
      wave2.addColorStop(0, 'rgba(139, 92, 246, 0.25)');
      wave2.addColorStop(0.5, 'rgba(168, 85, 247, 0.08)');
      wave2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      hc.fillStyle = wave2;
      hc.beginPath();
      hc.arc(1400, 480, 600, 0, Math.PI * 2);
      hc.fill();

      hc.restore();
    }

    // 2. Top Translucent Menu Bar (y: 0 to 54)
    hc.fillStyle = 'rgba(15, 23, 42, 0.78)';
    hc.fillRect(0, 0, 2048, 54);
    hc.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    hc.lineWidth = 1;
    hc.beginPath();
    hc.moveTo(0, 54);
    hc.lineTo(2048, 54);
    hc.stroke();

    // Top Bar - Left (Apple/OS Icon + App Name + Menu Items)
    hc.font = 'bold 20px sans-serif';
    hc.fillStyle = '#f8fafc';
    hc.fillText('', 24, 34);

    hc.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
    hc.fillStyle = '#ffffff';
    hc.fillText('NullOS', 56, 35);

    const menuItems = ['File', 'Edit', 'View', 'Go', 'Window', 'Help'];
    menuItems.forEach((item, idx) => {
      hc.font = '16px "Plus Jakarta Sans", sans-serif';
      hc.fillStyle = '#cbd5e1';
      hc.fillText(item, 155 + idx * 82, 35);
    });

    // Top Bar - Right Status & Clock
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayStr = days[now.getDay()];
    const monStr = months[now.getMonth()];
    const timeStr = `${dayStr} ${now.getDate()} ${monStr}  ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    hc.font = '16px "Plus Jakarta Sans", sans-serif';
    hc.fillStyle = '#e2e8f0';
    hc.textAlign = 'right';
    hc.fillText(`100% 🔋   📶   🔍   🎛️   ${timeStr}`, 2020, 35);
    hc.textAlign = 'left';

    // 3. Desktop Folders & Files (Right Side / Clean Grid)
    const desktopFiles = [
      { id: 'about', name: 'About Me', icon: '👤', tag: 'Bio' },
      { id: 'notes', name: 'Notes', icon: '📝', tag: 'Markdown' },
      { id: 'resume', name: 'Resume.pdf', icon: '📄', tag: 'PDF' },
      { id: 'mail', name: 'Mail', icon: '✉️', tag: 'Contact' },
      { id: 'settings', name: 'Settings', icon: '⚙️', tag: 'Config' },
      { id: 'photos', name: 'Gallery', icon: '🖼️', tag: 'Photos' },
      { id: 'trash', name: 'Trash Bin', icon: '🗑️', tag: 'Trash' },
    ];

    desktopFiles.forEach((file, idx) => {
      const fx = 1910;
      const fy = 90 + idx * 135;

      // Icon emoji
      hc.font = '48px sans-serif';
      hc.textAlign = 'center';
      hc.fillText(file.icon, fx, fy + 48);

      // Name with drop shadow
      hc.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
      hc.fillStyle = '#ffffff';
      hc.shadowColor = 'rgba(0, 0, 0, 0.9)';
      hc.shadowBlur = 8;
      hc.fillText(file.name, fx, fy + 88);
      hc.shadowBlur = 0;
      hc.textAlign = 'left';
    });

    // 4. Bottom Floating Joan OS Style Dock (y: 1046 to 1134)
    const dockIcons = [
      { id: 'about', name: 'About', icon: '👤', bg: '#0284c7' },
      { id: 'notes', name: 'Notes', icon: '📝', bg: '#eab308' },
      { id: 'resume', name: 'Resume', icon: '📄', bg: '#2563eb' },
      { id: 'mail', name: 'Mail', icon: '✉️', bg: '#059669' },
      { id: 'photos', name: 'Gallery', icon: '🖼️', bg: '#ec4899' },
      { id: 'settings', name: 'Settings', icon: '⚙️', bg: '#64748b' },
      { id: 'divider', isDivider: true },
      { id: 'trash', name: 'Trash', icon: '🗑️', bg: '#334155' },
    ];

    const dockW = 680;
    const dockH = 88;
    const dockX = (2048 - dockW) / 2;
    const dockY = 1046;

    hc.fillStyle = 'rgba(15, 23, 42, 0.72)';
    hc.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    hc.lineWidth = 1.5;
    hc.beginPath();
    hc.roundRect(dockX, dockY, dockW, dockH, 24);
    hc.fill();
    hc.stroke();

    let currentDockX = dockX + 24;
    dockIcons.forEach((dItem) => {
      if (dItem.isDivider) {
        hc.fillStyle = 'rgba(255, 255, 255, 0.2)';
        hc.fillRect(currentDockX + 8, dockY + 16, 1.5, 56);
        currentDockX += 26;
        return;
      }
      const ix = currentDockX;
      const iy = dockY + 14;
      const isize = 60;

      hc.fillStyle = dItem.bg || '#1e293b';
      hc.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      hc.lineWidth = 1;
      hc.beginPath();
      hc.roundRect(ix, iy, isize, isize, 16);
      hc.fill();
      hc.stroke();

      hc.font = '32px sans-serif';
      hc.textAlign = 'center';
      hc.fillText(dItem.icon || '📱', ix + 30, iy + 42);
      hc.textAlign = 'left';

      currentDockX += 74;
    });

    // 5. Active App Window Renderer (Finder, Launchpad, Safari, Notes, Photos, Settings, Projects, CV, CTF, Servers, Trash)
    if (this.desktopActiveWindow !== 'none') {
      const wx = 240;
      const wy = 70;
      const ww = 1568;
      const wh = 950;

      // Window Glass Background
      hc.save();
      hc.shadowColor = 'rgba(0, 0, 0, 0.6)';
      hc.shadowBlur = 50;
      hc.shadowOffsetX = 0;
      hc.shadowOffsetY = 24;

      hc.fillStyle = 'rgba(15, 23, 42, 0.94)';
      hc.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      hc.lineWidth = 1.5;
      hc.beginPath();
      hc.roundRect(wx, wy, ww, wh, 18);
      hc.fill();
      hc.stroke();
      hc.restore();

      // Titlebar (Cyber / Terminal Style)
      hc.fillStyle = 'rgba(15, 23, 42, 0.98)';
      hc.strokeStyle = 'rgba(56, 189, 248, 0.4)';
      hc.lineWidth = 1.5;
      hc.beginPath();
      hc.roundRect(wx, wy, ww, 58, [18, 18, 0, 0]);
      hc.fill();
      hc.stroke();

      // Title Text
      hc.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
      hc.fillStyle = '#38bdf8';
      hc.fillText(`HANAN // ${this.desktopActiveWindow.toUpperCase()}`, wx + 28, wy + 36);

      // Normal Windows/Ubuntu Close Button [ X ]
      const btnX = wx + ww - 52;
      const btnY = wy + 13;
      const btnW = 36;
      const btnH = 32;

      hc.fillStyle = 'rgba(239, 68, 68, 0.2)';
      hc.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      hc.lineWidth = 1;
      hc.beginPath();
      hc.roundRect(btnX, btnY, btnW, btnH, 6);
      hc.fill();
      hc.stroke();

      hc.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      hc.fillStyle = '#f87171';
      hc.textAlign = 'center';
      hc.fillText('✕', btnX + btnW / 2, btnY + 22);
      hc.textAlign = 'left';

      // Window Content Area
      const cx = wx + 36;
      const cy = wy + 80;
      const cw = ww - 72;

      if (this.desktopActiveWindow === 'about') {
        hc.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
        hc.fillStyle = '#38bdf8';
        hc.fillText('About Me — Hanan', cx, cy + 28);
        const aboutLines = [
          '● Lead Security Systems Architect & Full-Stack Engineer',
          '● Passionate about low-level Rust, eBPF kernel auditing & post-quantum cryptography',
          '● Building immersive 3D web applications with Three.js & React',
          '● Dedicated to clean architecture, performance, and cyber defense research',
        ];
        aboutLines.forEach((l, idx) => {
          hc.font = '18px "Plus Jakarta Sans", sans-serif';
          hc.fillStyle = '#e2e8f0';
          hc.fillText(l, cx + 24, cy + 90 + idx * 50);
        });
      } else if (this.desktopActiveWindow === 'notes') {
        hc.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
        hc.fillStyle = '#eab308';
        hc.fillText('Notes & Research Scratchpad', cx, cy + 28);
        hc.fillStyle = 'rgba(15, 23, 42, 0.85)';
        hc.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        hc.beginPath();
        hc.roundRect(cx, cy + 60, cw, 720, 12);
        hc.fill();
        hc.stroke();

        hc.font = '18px monospace';
        hc.fillStyle = '#fde047';
        this.desktopNotesText.split('\n').forEach((l, idx) => {
          hc.fillText(l, cx + 24, cy + 105 + idx * 30);
        });
      } else if (this.desktopActiveWindow === 'resume') {
        hc.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
        hc.fillStyle = '#38bdf8';
        hc.fillText('Hanan Saeed — Curriculum Vitae (CV)', cx, cy + 28);

        hc.font = '16px "Plus Jakarta Sans", sans-serif';
        hc.fillStyle = '#94a3b8';
        hc.fillText('Cyber Security Researcher & Python Developer | B.S. Information Technology (BZU)', cx, cy + 58);

        // Open live CV Button (Interactive button at top right)
        const openBtnX = cx + cw - 260;
        const openBtnY = cy + 12;
        hc.fillStyle = 'rgba(14, 165, 233, 0.25)';
        hc.strokeStyle = '#38bdf8';
        hc.lineWidth = 1.5;
        hc.beginPath();
        hc.roundRect(openBtnX, openBtnY, 250, 44, 10);
        hc.fill();
        hc.stroke();

        hc.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
        hc.fillStyle = '#ffffff';
        hc.textAlign = 'center';
        hc.fillText('📄 Open CV (PDF) ↗', openBtnX + 125, openBtnY + 28);
        hc.textAlign = 'left';

        // Content cards
        const resumeSections = [
          {
            title: '🎓 Education',
            color: '#34d399',
            items: [
              '• B.S. in Information Technology — Bahauddin Zakariya University (BZU) [10/2023 – Present]',
              '  Specialization: Offensive cyber vectors, automated vulnerability testing, security architecture',
              '• Pre-Engineering / ICS — Govt. Graduate College of Science [09/2021 – 09/2023]',
            ],
          },
          {
            title: '🛡️ Core Security Research & Tooling Experience',
            color: '#38bdf8',
            items: [
              '• Network Vulnerability Scanner: Python async engine utilizing Nmap bindings & live CVE database mapper',
              '• Web App Pentesting Toolkit: Modular SQLi/XSS/CSRF testing framework aligned with OWASP Top 10',
              '• Security Alert & Incident Bot: Real-time Linux syslog telemetry parser & Discord security dispatcher',
              '• Hardened Android Application: Kotlin + Firebase real-time datastore with SQLCipher encryption',
            ],
          },
          {
            title: '⚡ Technical Skills & Certifications',
            color: '#fbbf24',
            items: [
              '• Languages: Python, Kotlin, C/C++, TypeScript, Bash, SQL, Dart',
              '• Security: Vulnerability Assessment, Web App Security, OWASP Top 10, Network Reconnaissance, Cryptography',
              '• Certifications: Certified Ethical Hacker Training, BZU Offensive Cyber Research & Tooling',
            ],
          },
          {
            title: '🌐 Verified CV Documents & Links',
            color: '#a78bfa',
            items: [
              '• Direct Hosted PDF: /assets/cv.pdf',
              '• Live Web Portfolio: https://hannansaeed.github.io/portfolio',
              '• GitHub: https://github.com/hannansaeed  |  LinkedIn: https://linkedin.com/in/hanan-saeed',
            ],
          },
        ];

        let curY = cy + 90;
        resumeSections.forEach((sec) => {
          const cardH = 34 + sec.items.length * 28;
          hc.fillStyle = 'rgba(15, 23, 42, 0.7)';
          hc.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          hc.beginPath();
          hc.roundRect(cx, curY, cw, cardH, 12);
          hc.fill();
          hc.stroke();

          hc.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
          hc.fillStyle = sec.color;
          hc.fillText(sec.title, cx + 20, curY + 28);

          sec.items.forEach((it, iIdx) => {
            hc.font = it.startsWith('•') ? 'bold 15px "Plus Jakarta Sans", sans-serif' : '14px monospace';
            hc.fillStyle = it.includes('https://') ? '#38bdf8' : '#e2e8f0';
            hc.fillText(it, cx + 24, curY + 58 + iIdx * 28);
          });

          curY += cardH + 16;
        });
      } else if (this.desktopActiveWindow === 'mail') {
        hc.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
        hc.fillStyle = '#10b981';
        hc.fillText('Mail & Contact Links', cx, cy + 28);
        const contacts = [
          { label: '📧 Email:', val: 'hanansaeed609@yahoo.com' },
          { label: '🐙 GitHub:', val: 'github.com/hannansaeed' },
          { label: '💼 LinkedIn:', val: 'linkedin.com/in/hanan-saeed' },
          { label: '🐦 Instagram:', val: '__not__batman' },
        ];
        contacts.forEach((c, idx) => {
          const iy = cy + 70 + idx * 90;
          hc.fillStyle = 'rgba(30, 41, 59, 0.65)';
          hc.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          hc.beginPath();
          hc.roundRect(cx, iy, cw, 75, 10);
          hc.fill();
          hc.stroke();

          hc.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
          hc.fillStyle = '#34d399';
          hc.fillText(c.label, cx + 24, iy + 45);
          hc.font = '18px monospace';
          hc.fillStyle = '#f8fafc';
          hc.fillText(c.val, cx + 220, iy + 45);
        });
      } else if (this.desktopActiveWindow === 'settings') {
        hc.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
        hc.fillStyle = '#38bdf8';
        hc.fillText('Settings — Resources, Inspiration & Special Thanks', cx, cy + 28);
        
        const infoBlocks = [
          { title: '📚 Resources', desc: 'React, Vite, Tailwind CSS, TypeScript, Three.js WebGL & Google AI Studio.' },
          { title: '💡 Inspiration', desc: 'Cyberpunk workstations, macOS desktop aesthetics, and immersive 3D simulation.' },
          { title: '✨ Special Thanks', desc: 'Open source contributors, mentors, and the AI Studio developer community.' },
        ];
        infoBlocks.forEach((ib, idx) => {
          const by = cy + 70 + idx * 135;
          hc.fillStyle = 'rgba(30, 41, 59, 0.65)';
          hc.strokeStyle = 'rgba(255, 255, 255, 0.08)';
          hc.beginPath();
          hc.roundRect(cx, by, cw, 115, 10);
          hc.fill();
          hc.stroke();

          hc.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
          hc.fillStyle = '#fbbf24';
          hc.fillText(ib.title, cx + 24, by + 38);
          hc.font = '16px "Plus Jakarta Sans", sans-serif';
          hc.fillStyle = '#cbd5e1';
          hc.fillText(ib.desc, cx + 24, by + 78);
        });
      } else if (this.desktopActiveWindow === 'photos') {
        hc.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
        hc.fillStyle = '#ec4899';
        hc.fillText('Photos Gallery — Wallpapers & Renders', cx, cy + 28);
        const photos = [
          { name: 'Cosmic Planet Wallpaper', tag: 'Wallpaper' },
          { name: 'Night Bake Room', tag: 'Environment' },
          { name: 'Three.js Journey Logo', tag: 'Asset' },
        ];
        photos.forEach((ph, idx) => {
          const px = cx + idx * 480;
          const py = cy + 70;
          hc.fillStyle = 'rgba(30, 41, 59, 0.7)';
          hc.strokeStyle = 'rgba(255, 255, 255, 0.1)';
          hc.beginPath();
          hc.roundRect(px, py, 450, 310, 14);
          hc.fill();
          hc.stroke();

          hc.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
          hc.fillStyle = '#f8fafc';
          hc.fillText(ph.name, px + 24, py + 250);
          hc.font = '14px monospace';
          hc.fillStyle = '#ec4899';
          hc.fillText(ph.tag, px + 24, py + 280);
        });
      } else if (this.desktopActiveWindow === 'trash') {
        hc.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
        hc.fillStyle = '#94a3b8';
        hc.fillText('Trash Bin (3 items)', cx, cy + 28);
        ['old_config.json', 'debug_trace.bak', 'tmp_cache.tmp'].forEach((t, idx) => {
          const ty = cy + 70 + idx * 75;
          hc.fillStyle = 'rgba(30, 41, 59, 0.5)';
          hc.strokeStyle = 'rgba(255, 255, 255, 0.06)';
          hc.beginPath();
          hc.roundRect(cx, ty, cw, 60, 8);
          hc.fill();
          hc.stroke();
          hc.font = '18px monospace';
          hc.fillStyle = '#cbd5e1';
          hc.fillText(`🗑️  ${t}`, cx + 24, ty + 37);
        });
      }
    }

    // 6. Draw Mouse Cursor if hovering on desktop (ONLY in overview/distance mode to avoid twin cursor in zoomed-in 2D mode)
    if (this.desktopMousePos && this.activeStation === 'overview') {
      hc.fillStyle = '#ffffff';
      hc.strokeStyle = '#000000';
      hc.lineWidth = 2;
      hc.beginPath();
      hc.moveTo(this.desktopMousePos.x, this.desktopMousePos.y);
      hc.lineTo(this.desktopMousePos.x + 20, this.desktopMousePos.y + 20);
      hc.lineTo(this.desktopMousePos.x + 8, this.desktopMousePos.y + 20);
      hc.lineTo(this.desktopMousePos.x + 14, this.desktopMousePos.y + 34);
      hc.lineTo(this.desktopMousePos.x + 8, this.desktopMousePos.y + 36);
      hc.lineTo(this.desktopMousePos.x + 2, this.desktopMousePos.y + 22);
      hc.lineTo(this.desktopMousePos.x, this.desktopMousePos.y + 26);
      hc.closePath();
      hc.fill();
      hc.stroke();
    }

    this.horizTexture.needsUpdate = true;
  }

  /* ----------------------------------------------------
     2. VERTICAL LAPTOP CLI TERMINAL (High-DPI 1024x2048 Direct On Laptop Screen)
  ---------------------------------------------------- */
  private renderTerminalOnLaptop(elapsed: number) {
    const vc = this.vertCtx;
    const themeColor =
      this.terminalTheme === 'rose'
        ? '#38bdf8'
        : this.terminalTheme === 'amber'
        ? '#f59e0b'
        : this.terminalTheme === 'violet'
        ? '#c084fc'
        : '#34d399';

    // 1. Terminal Canvas Background (2048x1152)
    vc.fillStyle = '#04080f';
    vc.fillRect(0, 0, 2048, 1152);

    // 2. Optional Matrix Code Rain Mode
    if (this.terminalMatrixActive) {
      if (this.terminalMatrixDrops.length === 0) {
        this.terminalMatrixDrops = Array(this.terminalMatrixCols).fill(1);
      }

      vc.fillStyle = 'rgba(4, 8, 15, 0.15)';
      vc.fillRect(0, 0, 2048, 1152);

      vc.fillStyle = themeColor;
      vc.font = '24px monospace';
      const chars = '0123456789ABCDEF@#$%&*+-=<>~ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ';

      for (let i = 0; i < this.terminalMatrixDrops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * 32;
        const y = this.terminalMatrixDrops[i] * 32;

        vc.fillText(char, x, y);

        if (y > 2048 && Math.random() > 0.975) {
          this.terminalMatrixDrops[i] = 0;
        }
        this.terminalMatrixDrops[i]++;
      }
    }

    // 3. Top Translucent Header (Removed)

    // 4. Terminal Output Buffer (Scrolling Lines)
    let lineY = 60;
    const maxVisibleLines = 18;
    const visibleLines = this.terminalLines.slice(-maxVisibleLines);

    visibleLines.forEach((l) => {
      vc.font = l.bold ? 'bold 36px "JetBrains Mono", monospace' : '32px "JetBrains Mono", monospace';
      if (l.text.startsWith('hanan@xcthine:~$ ')) {
        const prompt = 'hanan@xcthine:~$ ';
        const cmdText = l.text.slice(prompt.length);
        vc.fillStyle = themeColor;
        vc.fillText(prompt, 72, lineY);
        const promptWidth = vc.measureText(prompt).width;
        vc.fillStyle = '#ffffff';
        vc.fillText(cmdText, 72 + promptWidth, lineY);
      } else {
        vc.fillStyle = l.color;
        vc.fillText(l.text, 72, lineY);
      }
      lineY += 50;
    });

    // 5. Active Command Prompt & Blinking Cursor
    vc.font = 'bold 36px "JetBrains Mono", monospace';
    vc.fillStyle = themeColor;
    const promptPrefix = 'hanan@xcthine:~$ ';
    vc.fillText(promptPrefix, 72, lineY);

    const prefixWidth = vc.measureText(promptPrefix).width;
    vc.fillStyle = themeColor;
    vc.fillText(this.terminalInput, 72 + prefixWidth, lineY);

    const inputWidth = vc.measureText(this.terminalInput).width;
    if (Math.floor(elapsed * 2.5) % 2 === 0) {
      vc.fillStyle = themeColor;
      vc.fillRect(72 + prefixWidth + inputWidth + 8, lineY - 32, 20, 36);
    }

    // 6. Minimal Quick Command Helper (Removed)

    this.vertTexture.needsUpdate = true;
  }

  /* ----------------------------------------------------
     PUBLIC INTERACTIVE COMMAND EXECUTION (TERMINAL & DESKTOP)
  ---------------------------------------------------- */
  private pushTerminalLines(...lines: Array<{ text: string; color: string; bold?: boolean }>) {
    const maxChars = 85;
    for (const l of lines) {
      if (l.text.length <= maxChars || l.text.startsWith('hanan@xcthine:~$ ')) {
        this.terminalLines.push(l);
        continue;
      }

      const words = l.text.split(' ');
      let currentLine = '';

      for (const word of words) {
        if ((currentLine + word).length > maxChars) {
          if (currentLine) {
            this.terminalLines.push({ text: currentLine.trimEnd(), color: l.color, bold: l.bold });
          }
          currentLine = word + ' ';
        } else {
          currentLine += word + ' ';
        }
      }
      if (currentLine) {
        this.terminalLines.push({ text: currentLine.trimEnd(), color: l.color, bold: l.bold });
      }
    }
  }

  public async executeTerminalCommand(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed) return;

    soundEngine.playKeyClick();
    this.terminalCmdHistory.push(trimmed);
    this.terminalCmdIndex = -1;

    // Echo input line
    if (!this.terminalWaitingForPassword) {
      this.pushTerminalLines({
        text: `hanan@xcthine:~$ ${trimmed}`,
        color: '#ffffff',
        bold: true,
      });
    }

    const parts = trimmed.split(' ').filter(Boolean);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    if (this.terminalWaitingForPassword) {
      if (trimmed === '3241010300') {
        this.pushTerminalLines(
          { text: 'Root access granted.', color: '#34d399', bold: true },
          { text: 'Purging filesystem and wiping whiteboard memory in cloud & local cache...', color: '#38bdf8' }
        );
        this.terminalWaitingForPassword = false;
        await this.clearWhiteboard();
        this.pushTerminalLines({ text: 'System cache & whiteboard completely cleared.', color: '#10b981' });
      } else {
        this.pushTerminalLines({ text: 'sudo: 1 incorrect password attempt.', color: '#f43f5e' });
        this.terminalWaitingForPassword = false;
      }
      this.vertTexture.needsUpdate = true;
      return;
    }

    switch (cmd) {
      case 'help':
      case '?':
        this.pushTerminalLines(
          { text: '  whoami       - Identity & summary', color: '#94a3b8' },
          { text: '  ls           - List GitHub repositories & files', color: '#94a3b8' },
          { text: '  cat <file>   - Detailed specifications of file', color: '#94a3b8' },
          { text: '  cv           - Curriculum Vitae', color: '#94a3b8' },
          { text: '  skills       - Low-level programming matrix', color: '#94a3b8' },
          { text: '  nmap <host>  - Simulated SYN stealth scan', color: '#94a3b8' },
          { text: '  neofetch     - Hardware & Kernel specs', color: '#94a3b8' },
          { text: '  clear        - Clear terminal buffer', color: '#94a3b8' }
        );
        break;

      case 'clear':
      case 'cls':
        this.terminalLines = [];
        break;

      case 'whoami':
        this.pushTerminalLines(
          { text: 'UID: 1000(hanan) GID: 1000(Xcthine)', color: '#34d399', bold: true },
          { text: 'Role: Cybersecurity Research & Systems Architect', color: '#e2e8f0' },
          { text: 'Specialization: eBPF Telemetry · Binary Exploitation · Post-Quantum TLS', color: '#38bdf8' }
        );
        break;

      case 'about':
      case 'bio':
        this.pushTerminalLines(
          { text: 'BIO // HANAN:', color: '#38bdf8', bold: true },
          { text: 'I build and break low-level systems and cryptographic protocols.', color: '#cbd5e1' },
          { text: 'Specialized in Rust, eBPF, AOSP IPC boundary auditing, and Kyber-768.', color: '#cbd5e1' }
        );
        break;

      case 'ls':
        this.pushTerminalLines({ text: `REPOSITORIES & FILES:`, color: '#38bdf8', bold: true });
        this.pushTerminalLines(
          { text: '📁 Cyfex', color: '#34d399' },
          { text: '📁 Hanan-os', color: '#34d399' },
          { text: '📁 Portfolio', color: '#34d399' },
          { text: '📁 Sheffer', color: '#34d399' },
          { text: '📁 Zeel', color: '#34d399' },
          { text: '📄 about.md', color: '#cbd5e1' },
          { text: '📄 cv.txt', color: '#cbd5e1' },
          { text: '📄 skills.json', color: '#cbd5e1' },
          { text: '📄 notes.txt', color: '#cbd5e1' }
        );
        this.pushTerminalLines({ text: 'Run: cat <name> to inspect details.', color: '#64748b' });
        break;

      case 'cat':
        if (!args[0]) {
          this.pushTerminalLines({ text: 'Usage: cat <filename> (e.g. cat Cyfex, cat about.md)', color: '#f59e0b' });
        } else {
          const fileToRead = args[0].toLowerCase();
          if (fileToRead === 'cyfex' || fileToRead === 'cyfex.md') {
            this.pushTerminalLines(
              { text: 'Cyfex [Android & Mobile Security]', color: '#34d399', bold: true },
              { text: 'The best and broadest on-device Android threat monitoring and security platform using Jetpack Compose and privileged system telemetry (Shizuku) for explainable, zero-cloud risk scoring.', color: '#e2e8f0' },
              { text: 'Tech: Kotlin, Jetpack Compose, Shizuku API, Android Security', color: '#38bdf8' }
            );
          } else if (fileToRead === 'hanan-os' || fileToRead === 'hanan-os.md') {
            this.pushTerminalLines(
              { text: 'Hanan-os [Web & Graphics]', color: '#34d399', bold: true },
              { text: 'In production 3D portfolio. Procedural rooms, real-time dynamic canvas display textures, CRT post-processing shaders, Web Audio API synthesis.', color: '#e2e8f0' },
              { text: 'Tech: Three.js, WebGL, GLSL, React, TypeScript', color: '#38bdf8' }
            );
          } else if (fileToRead === 'portfolio' || fileToRead === 'portfolio.md') {
            this.pushTerminalLines(
              { text: 'Portfolio [Web & CLI UI]', color: '#34d399', bold: true },
              { text: 'A premium, cybersecurity portfolio built with pure HTML/CSS/JS, featuring a glassmorphism terminal UI, Matrix animation, and an interactive Linux-style CLI.', color: '#e2e8f0' },
              { text: 'Tech: HTML5, CSS3, JavaScript', color: '#38bdf8' }
            );
          } else if (fileToRead === 'sheffer' || fileToRead === 'sheffer.md') {
            this.pushTerminalLines(
              { text: 'Sheffer [Mobile & Real-time Chat]', color: '#34d399', bold: true },
              { text: 'A real-time, cross-platform shared space and instant messaging application built using Flutter and powered by Firebase backend services.', color: '#e2e8f0' },
              { text: 'Tech: Flutter, Dart, Firebase Auth, Firestore', color: '#38bdf8' }
            );
          } else if (fileToRead === 'zeel' || fileToRead === 'zeel.md') {
            this.pushTerminalLines(
              { text: 'Zeel [Automation & Tooling]', color: '#34d399', bold: true },
              { text: 'A modular, extensible Discord bot built with Python and discord.py, utilizing a clean Cogs architecture for easy feature deployment.', color: '#e2e8f0' },
              { text: 'Tech: Python, discord.py, Cogs Architecture', color: '#38bdf8' }
            );
          } else if (fileToRead === 'about.md') {
            this.pushTerminalLines(
              { text: 'about.md // Biography', color: '#34d399', bold: true },
              { text: 'Senior Systems & Cybersecurity Research Engineer.', color: '#e2e8f0' },
              { text: 'Specialized in kernel telemetry probes (eBPF), binary exploitation, glibc heap internals, and post-quantum cryptographic primitives.', color: '#e2e8f0' }
            );
          } else if (fileToRead === 'cv.txt' || fileToRead === 'cv.md' || fileToRead === 'cv' || fileToRead === 'resume') {
            this.safeOpenLink('/assets/cv.pdf');
            this.pushTerminalLines(
              { text: 'cv.txt // Curriculum Vitae — Hanan Saeed', color: '#38bdf8', bold: true },
              { text: 'Role: Cyber Security Researcher & Python Developer', color: '#34d399' },
              { text: 'Education: B.S. in Information Technology (BZU, 2023 - Present)', color: '#e2e8f0' },
              { text: 'Specialization: Vulnerability Assessment, Offensive Security Tooling, Python Automation', color: '#e2e8f0' },
              { text: 'Key Projects: Network Vuln Scanner · Web Pentest Toolkit · Incident Bot · Secure Mobile App', color: '#e2e8f0' },
              { text: 'PDF Document: /assets/cv.pdf (also at /cv.pdf)', color: '#a78bfa' },
              { text: 'Live Web Portfolio: https://hannansaeed.github.io/portfolio', color: '#38bdf8' },
              { text: '[Opened /assets/cv.pdf in browser tab]', color: '#10b981' }
            );
          } else if (fileToRead === 'skills.json') {
            this.pushTerminalLines(
              { text: 'skills.json // Skills Matrix', color: '#34d399', bold: true },
              { text: 'Languages: Rust, C/C++, TypeScript, Python, Go, x86_64 ASM', color: '#e2e8f0' },
              { text: 'Security: eBPF / XDP, Kernel Debugging, Heap Exploitation, Fuzzing', color: '#e2e8f0' }
            );
          } else if (fileToRead === 'notes.txt') {
            this.pushTerminalLines(
              { text: 'notes.txt // TODO & Research', color: '#34d399', bold: true },
              { text: '[x] eBPF ringbuf syscall auditing engine.', color: '#e2e8f0' },
              { text: '[x] Post-quantum Key Encapsulation Mechanism benchmark.', color: '#e2e8f0' }
            );
          } else {
            this.pushTerminalLines({ text: `File '${args[0]}' not found.`, color: '#f43f5e' });
          }
        }
        break;

      case 'cv':
      case 'resume':
        this.safeOpenLink('/assets/cv.pdf');
        this.pushTerminalLines(
          { text: 'CURRICULUM VITAE — HANAN SAEED', color: '#38bdf8', bold: true },
          { text: '● Title: Cyber Security Researcher & Python Developer', color: '#34d399' },
          { text: '● Education: B.S. in Information Technology (BZU, 2023 - Present)', color: '#e2e8f0' },
          { text: '● Core Focus: Vulnerability Assessment, OWASP Testing, Python Security Tooling', color: '#e2e8f0' },
          { text: '● Hosted PDF CV: /assets/cv.pdf (or /cv.pdf)', color: '#a78bfa' },
          { text: '● Live Web Portfolio: https://hannansaeed.github.io/portfolio', color: '#38bdf8' },
          { text: '● GitHub: https://github.com/hannansaeed  |  LinkedIn: https://linkedin.com/in/hanan-saeed', color: '#cbd5e1' },
          { text: '[Warping browser to /assets/cv.pdf ↗]', color: '#10b981', bold: true }
        );
        break;

      case 'skills':
        this.pushTerminalLines(
          { text: 'TECHNICAL PROFICIENCY MATRIX:', color: '#38bdf8', bold: true },
          { text: `Languages: ${SKILLS_SUMMARY.languages.join(' · ')}`, color: '#34d399' },
          { text: `Security: ${SKILLS_SUMMARY.offensive.join(' · ')}`, color: '#fbbf24' },
          { text: `Systems: ${SKILLS_SUMMARY.systems.join(' · ')}`, color: '#c084fc' }
        );
        break;

      case 'certs':
        this.pushTerminalLines({ text: 'VERIFIED SECURITY CREDENTIALS:', color: '#38bdf8', bold: true });
        CERTIFICATIONS.forEach((c) => {
          this.pushTerminalLines({ text: `● [${c.badgeCode}] ${c.name} (${c.issuer})`, color: '#34d399' });
        });
        break;

      case 'nmap':
        const target = args[0] || '10.13.37.1';
        this.pushTerminalLines(
          { text: `Starting Nmap 7.94 against ${target}...`, color: '#38bdf8' },
          { text: '22/tcp   open  ssh (OpenSSH 9.6p1)', color: '#34d399' },
          { text: '80/tcp   open  http (nginx/1.24.0)', color: '#34d399' },
          { text: '443/tcp  open  https (TLS 1.3 / Kyber-768)', color: '#34d399' },
          { text: '9090/tcp open  ebpf-telemetry-daemon', color: '#34d399' },
          { text: 'Nmap done: 1 host up, 4 open ports.', color: '#38bdf8' }
        );
        break;

      case 'neofetch':
        this.pushTerminalLines(
          { text: 'OS: HANAN Hardened Linux x86_64', color: '#38bdf8', bold: true },
          { text: 'Host: Xcthine Workstation Node 01', color: '#cbd5e1' },
          { text: `TechStack: ${SKILLS_SUMMARY.languages.join(' · ')} · ${SKILLS_SUMMARY.systems.join(' · ')}`, color: '#cbd5e1' },
          { text: 'Kernel: 6.8.9-dedsec-ebpf-probes', color: '#cbd5e1' },
          { text: 'CPU: AMD Ryzen 9 7950X', color: '#cbd5e1' }
        );
        break;

      case 'sudo':
        const sudoRest = args.join(' ').trim().toLowerCase();
        if (sudoRest.startsWith('rm') && (sudoRest.includes('-rf') || sudoRest.includes('-r') || sudoRest.includes('-f'))) {
          this.pushTerminalLines({ text: '[sudo] password for hanan:', color: '#ffffff' });
          this.terminalWaitingForPassword = true;
        } else {
          this.pushTerminalLines({ text: `Command not found or permission denied: ${trimmed}`, color: '#f43f5e' });
        }
        break;

      case 'rm':
        const rmRest = args.join(' ').trim().toLowerCase();
        if (rmRest.includes('-rf') || rmRest.includes('-r') || rmRest.includes('-f') || rmRest.includes('whiteboard')) {
          this.pushTerminalLines({ text: 'rm: cannot remove root system/whiteboard data: Permission denied (try: sudo rm -rf /)', color: '#f43f5e' });
        } else {
          this.pushTerminalLines({ text: 'rm: missing operand (try: sudo rm -rf /)', color: '#f43f5e' });
        }
        break;

      default:
        this.pushTerminalLines({
          text: `zsh: command not found: ${cmd}. Type 'help' for available commands.`,
          color: '#f43f5e',
        });
    }

    this.vertTexture.needsUpdate = true;
  }

  /* ----------------------------------------------------
     DESKTOP MOUSE CLICK & HOVER HANDLERS (High-DPI 2048x1152 Raycast)
  ---------------------------------------------------- */
  public handleDesktopClick(x: number, y: number) {
    soundEngine.playKeyClick();

    // 0. Bottom Dock Click Handling (y: 1046..1134)
    const dockW = 680;
    const dockH = 88;
    const dockX = (2048 - dockW) / 2;
    const dockY = 1046;
    if (y >= dockY && y <= dockY + dockH && x >= dockX && x <= dockX + dockW) {
      let curX = dockX + 24;
      const dockList = ['about', 'notes', 'resume', 'mail', 'photos', 'settings', 'trash'];
      for (const id of dockList) {
        if (x >= curX && x <= curX + 60) {
          if (id === 'resume') {
            this.desktopActiveWindow = 'resume';
            this.desktopStartMenuOpen = false;
            this.safeOpenLink('/assets/cv.pdf');
            soundEngine.playChirp('success');
          } else {
            this.desktopActiveWindow = id as any;
            this.desktopStartMenuOpen = false;
          }
          return;
        }
        curX += 74;
      }
    }

    // 1. Taskbar Start Button (x: 24..204, y: 1076..1140)
    if (x >= 24 && x <= 204 && y >= 1076 && y <= 1140) {
      this.desktopStartMenuOpen = !this.desktopStartMenuOpen;
      return;
    }

    // 2. Start Menu Items (if open)
    if (this.desktopStartMenuOpen) {
      this.desktopStartMenuOpen = false;
      return;
    }

    // 3. Right Desktop Shortcut Icons (x: 1830..1990, y: 50..1000)
    if (x >= 1830 && x <= 1990) {
      const ids = ['about', 'notes', 'resume', 'mail', 'settings', 'photos', 'trash'];
      ids.forEach((id, idx) => {
        const fy = 50 + idx * 135;
        if (y >= fy && y <= fy + 120) {
          if (id === 'resume') {
            this.desktopActiveWindow = 'resume';
            this.safeOpenLink('/assets/cv.pdf');
            soundEngine.playChirp('success');
          } else {
            this.desktopActiveWindow = id as any;
          }
        }
      });
      return;
    }

    // 4. Window Controls (Titlebar close button at top right of window: btnX = wx + ww - 52)
    if (this.desktopActiveWindow !== 'none') {
      const wx = 240;
      const wy = 70;
      const ww = 1568;

      // Close Button (Windows/Ubuntu style at wx + ww - 52 .. wx + ww - 16, wy + 13 .. wy + 45)
      if (x >= wx + ww - 52 && x <= wx + ww - 16 && y >= wy + 13 && y <= wy + 45) {
        this.desktopActiveWindow = 'none';
        return;
      }

      // Inside Resume Window: Open Live CV Button
      if (this.desktopActiveWindow === 'resume') {
        const cx = wx + 36;
        const cy = wy + 80;
        const cw = ww - 72;
        const openBtnX = cx + cw - 260;
        const openBtnY = cy + 12;
        if (x >= openBtnX && x <= openBtnX + 250 && y >= openBtnY && y <= openBtnY + 44) {
          soundEngine.playChirp('success');
          this.safeOpenLink('/assets/cv.pdf');
          return;
        }
      }

      // Inside Settings Window: Theme Selection
      if (this.desktopActiveWindow === 'settings') {
        const cx = wx + 24;
        const cy = wy + 80;
        const themes: Array<'rose' | 'emerald' | 'amber' | 'violet'> = ['rose', 'emerald', 'amber', 'violet'];
        themes.forEach((th, ti) => {
          const bx = cx + 36 + ti * 260;
          if (x >= bx && x <= bx + 240 && y >= cy + 100 && y <= cy + 180) {
            this.desktopAccentTheme = th;
            soundEngine.playChirp('success');
          }
        });
      }
    }
  }

  public handleDesktopMouseMove(x: number, y: number) {
    this.desktopMousePos = { x, y };
  }

  public setDesktopActiveWindow(win: 'about' | 'notes' | 'resume' | 'mail' | 'settings' | 'photos' | 'trash' | 'none') {
    this.desktopActiveWindow = win;
    soundEngine.playKeyClick();
  }

  /* ----------------------------------------------------
     Interactive Whiteboard Canvas Methods
  ---------------------------------------------------- */
  public resetWhiteboardToBlank() {
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

    if (this.whiteboardTexture) {
      this.whiteboardTexture.needsUpdate = true;
    }
  }

  private initWhiteboardCanvas() {
    if (!this.whiteboardCtx) return;

    this.resetWhiteboardToBlank();

    // Set up Real-Time Cloud Synchronization using Firestore!
    try {
      const docRef = doc(db, 'whiteboards', 'global');
      this.whiteboardUnsubscribe = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.dataUrl && typeof data.dataUrl === 'string' && data.dataUrl.trim().length > 0) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              if (this.whiteboardCtx) {
                // Clear and redraw dots before drawing cloud image to avoid stacking grid dots
                this.resetWhiteboardToBlank();
                this.whiteboardCtx.drawImage(img, 0, 0, 1536, 960);
                if (this.whiteboardTexture) {
                  this.whiteboardTexture.needsUpdate = true;
                }
                console.log('[Whiteboard] Cloud drawing synchronized successfully in real-time.');
              }
            };
            img.src = data.dataUrl;
          } else {
            // Empty dataUrl in cloud doc -> blank board
            this.resetWhiteboardToBlank();
            try {
              localStorage.removeItem('hananos_whiteboard_drawing');
            } catch {}
          }
        } else {
          // If document was deleted or does not exist in cloud -> reset whiteboard to blank
          this.resetWhiteboardToBlank();
          try {
            localStorage.removeItem('hananos_whiteboard_drawing');
          } catch {}
        }
      }, (error) => {
        console.error('[Whiteboard] Firestore onSnapshot error:', error);
      });
    } catch (e) {
      console.warn('Real-time cloud sync is unavailable. Falling back to offline-only mode.', e);
      // Safe offline fallback
      const localSaved = localStorage.getItem('hananos_whiteboard_drawing');
      if (localSaved) {
        const img = new Image();
        img.onload = () => {
          if (this.whiteboardCtx) {
            this.resetWhiteboardToBlank();
            this.whiteboardCtx.drawImage(img, 0, 0, 1536, 960);
            if (this.whiteboardTexture) {
              this.whiteboardTexture.needsUpdate = true;
            }
          }
        };
        img.src = localSaved;
      }
    }
  }

  private drawDefaultWhiteboardContent() {
    // Whiteboard fully blank
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

    // Cold monitor glows (rose & emerald)
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
    ceilingWest.position.set(-4.2, 5.0, 0.5);
    this.scene.add(ceilingWest);

    const ceilingEast = new THREE.PointLight(0xffecd6, 1.8, 10.0);
    ceilingEast.position.set(4.2, 5.0, 0.5);
    this.scene.add(ceilingEast);

    // Realistic architectural wall-wash SpotLight on the Burgundy West Wall (Exactly one super warm light with visible light ray shape)
    const westSpot = new THREE.SpotLight(0xff8a26, 48.0, 14.0, Math.PI / 2.8, 0.4, 1.0); // Penumbra 0.4 for clear, distinct light ray shape
    westSpot.position.set(-3.1, 5.8, 0.8); // Shifted further to 0.8 Z to move the light more to the left relative to the wall
    const target = new THREE.Object3D();
    target.position.set(-4.96, 2.7, 0.8); // Target position
    this.scene.add(target);
    westSpot.target = target;
    this.scene.add(westSpot);

    // Helper to generate physical, highly-detailed spotlight fixtures pointing at their targets
    const createPhysicalSpotlightFixture = (srcX: number, srcY: number, srcZ: number, tgtX: number, tgtY: number, tgtZ: number) => {
      // 1. Ceiling plate
      const plateGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.03, 16);
      const plateMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0xff8a26,
        emissiveIntensity: 0.005 // Barely visible heat glow
      });
      const plate = new THREE.Mesh(plateGeo, plateMat);
      plate.position.set(srcX, 6.38, srcZ);
      this.scene.add(plate);

      // 2. Hanging/swivel metal rod
      const rodGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8);
      const rodMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.8,
        emissive: 0xff8a26,
        emissiveIntensity: 0.005
      });
      const rod = new THREE.Mesh(rodGeo, rodMat);
      rod.position.set(srcX, 6.18, srcZ);
      this.scene.add(rod);

      // 3. Swivel joint ball
      const jointGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const joint = new THREE.Mesh(jointGeo, plateMat);
      joint.position.set(srcX, 5.99, srcZ);
      this.scene.add(joint);

      // 4. Spotlight head assembly
      const headGroup = new THREE.Group();
      headGroup.position.set(srcX, 5.9, srcZ);

      // Main lamp cylinder
      const bodyGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.22, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.2,
        emissive: 0xff8a26,
        emissiveIntensity: 0.04 // Extremely subtle, natural metallic warmth (10-20% of previous 0.22)
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.rotation.x = -Math.PI / 2; // Lie along local Z axis (top cap pointing forward along +Z)
      headGroup.add(body);

      // Glowing lens/bulb on the pointing face - matching the rich warm golden light color
      const bulbGeo = new THREE.CircleGeometry(0.065, 16);
      const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffa352 });
      const bulb = new THREE.Mesh(bulbGeo, bulbMat);
      bulb.position.z = 0.111; // pointing forward on +Z cap
      headGroup.add(bulb);

      // Direct the head assembly towards the exact spot target
      const targetPos = new THREE.Vector3(tgtX, tgtY, tgtZ);
      headGroup.lookAt(targetPos);

      this.scene.add(headGroup);

      // 5. Extremely soft, subtle local spill light to lift any solid black shadows on the metal casing
      const spillLight = new THREE.PointLight(0xff8a26, 0.45, 1.2); // Scaled down to ~12% intensity (0.45 instead of 3.5)
      spillLight.position.set(srcX, 5.75, srcZ);
      this.scene.add(spillLight);
    };

    // Spawn physical fixture for our single west wall spot (Shifted further to 0.8 Z to match the light)
    createPhysicalSpotlightFixture(-3.1, 5.8, 0.8, -4.96, 2.7, 0.8);
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
        // Target the chair's actual spindle empty (Empty.012) rather than the scene root (0,0,0)
        // so the chair rotates on its own center instead of orbiting the room origin
        const chairSpindle = gltf.scene.getObjectByName('Empty.012') || gltf.scene.children[0] || gltf.scene;
        this.topChairMesh = chairSpindle;
        this.scene.add(gltf.scene);
      },
      undefined,
      () => {
        // Fallback chair if GLTF fails
        const chair = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.08, 0.45),
          new THREE.MeshStandardMaterial({ color: 0x1e2430 })
        );
        chair.position.set(0.8, 1.8, -2.5);
        this.topChairMesh = chair;
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
            this.pcScreenMesh = child;
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
        this.pcScreenMesh = fallbackScreen;
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
            this.macScreenMesh = child;
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
        this.macScreenMesh = fallbackVert;
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

    // 1. WEST WALL - ALL SOLID RED BURGUNDY INTERIOR WALL (X = -4.96m, fully solid, untouched)
    const westWallGeo = new THREE.PlaneGeometry(10.23, 6.6);
    const westWallMesh = new THREE.Mesh(westWallGeo, burgundyWallMat);
    westWallMesh.rotation.y = Math.PI / 2; // Normal faces +X (into the room)
    westWallMesh.position.set(-4.96, 3.1, -0.415);
    westWallMesh.receiveShadow = true;
    wallsGroup.add(westWallMesh);

    const bbWest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 10.23), baseboardMat);
    bbWest.position.set(-4.92, 0.09, -0.415);
    wallsGroup.add(bbWest);

    /* ----------------------------------------------------
       WALL OUTSIDE THE ROOM BEHIND THE WINDOW (BLUE SKY & DRIFTING CLOUDS):
       - Placed strictly OUTSIDE the East window opening (X = +6.50m)
       - Large panoramic exterior sky backdrop facing -X into the window
       - Corner exterior sky wing at North (Z = -6.20m)
       - Unobstructed view of drifting clouds and daytime sky through the window
    ---------------------------------------------------- */
    const extSkyEastGeo = new THREE.PlaneGeometry(28.0, 16.0);
    const extSkyEastMesh = new THREE.Mesh(extSkyEastGeo, this.skyWindowMaterial);
    extSkyEastMesh.rotation.y = -Math.PI / 2; // Faces -X directly into the room through the East window
    extSkyEastMesh.position.set(6.50, 3.5, 0.0);
    wallsGroup.add(extSkyEastMesh);

    const extSkyNorthGeo = new THREE.PlaneGeometry(28.0, 16.0);
    const extSkyNorthMesh = new THREE.Mesh(extSkyNorthGeo, this.skyWindowMaterial);
    extSkyNorthMesh.rotation.y = 0; // Faces +Z directly into the room
    extSkyNorthMesh.position.set(2.0, 3.5, -6.20);
    wallsGroup.add(extSkyNorthMesh);

    // Cool starlight & moonlight ambient glow spilling through the East window from the starry sky
    const windowMoonlight = new THREE.DirectionalLight(0xa5b4fc, 0.85);
    windowMoonlight.position.set(8.5, 5.5, 0.0);
    windowMoonlight.target.position.set(2.0, 2.0, 0.0);
    wallsGroup.add(windowMoonlight);
    wallsGroup.add(windowMoonlight.target);

    const windowAtmosphere = new THREE.PointLight(0x818cf8, 1.1, 9.0);
    windowAtmosphere.position.set(5.2, 3.2, 0.8);
    wallsGroup.add(windowAtmosphere);

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
      { id: 'social_linkedin' as StationId, type: 'linkedin', z: 2.2, y: 4.5, isInteractive: true, imageUrl: '' },
      { id: 'social_github' as StationId, type: 'github', z: 1.2, y: 3.6, isInteractive: true, imageUrl: '' },
      { id: 'social_steam' as StationId, type: 'steam', z: 2.2, y: 2.7, isInteractive: true, imageUrl: '' },
      // Three new custom non-interactive frames pointing to swap-ready user assets with graceful fallbacks
      { id: 'custom_art1' as any, type: 'custom1', z: 0.2, y: 3.6, isInteractive: false, imageUrl: customArt1 },
      { id: 'custom_art2' as any, type: 'custom2', z: -0.8, y: 4.5, isInteractive: false, imageUrl: customArt2 },
      { id: 'custom_art3' as any, type: 'custom3', z: -0.8, y: 2.7, isInteractive: false, imageUrl: customArt3 },
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
      } else if (item.type === 'custom1') {
        // Custom Art 1: Minimalist glowing wave spectrum / peaks (Procedural fallback)
        ctx.restore();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(60, 60, 392, 392);
        
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.7)'; // amber wave
        ctx.lineWidth = 4;
        ctx.beginPath();
        for (let x = 70; x < 440; x++) {
          const y = 256 + Math.sin(x * 0.02) * 80 + Math.cos(x * 0.05) * 30;
          if (x === 70) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)'; // rose wave
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 70; x < 440; x++) {
          const y = 256 + Math.cos(x * 0.015) * 60 + Math.sin(x * 0.04) * 40;
          if (x === 70) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else if (item.type === 'custom2') {
        // Custom Art 2: Abstract cyber nodes network map (Procedural fallback)
        ctx.restore();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(60, 60, 392, 392);

        const nodes = [
          { x: 150, y: 180, r: 24, c: '#34d399' },
          { x: 342, y: 160, r: 30, c: '#38bdf8' },
          { x: 236, y: 340, r: 20, c: '#a78bfa' },
          { x: 360, y: 340, r: 16, c: '#f43f5e' }
        ];

        // Draw connections
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(nodes[1].x, nodes[1].y);
        ctx.lineTo(nodes[2].x, nodes[2].y);
        ctx.lineTo(nodes[0].x, nodes[0].y);
        ctx.lineTo(nodes[2].x, nodes[2].y);
        ctx.lineTo(nodes[3].x, nodes[3].y);
        ctx.stroke();

        // Draw node circles
        nodes.forEach(n => {
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.strokeStyle = n.c;
          ctx.stroke();
          
          ctx.beginPath();
          ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      } else if (item.type === 'custom3') {
        // Custom Art 3: Tech matrix glyph cluster (Procedural fallback)
        ctx.restore();
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(60, 60, 392, 392);

        ctx.font = 'bold 30px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(71, 85, 105, 0.4)';
        ctx.fillText('0 1 0 0 1', 130, 180);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText('1 1 0 1 0', 130, 240);
        ctx.fillStyle = '#f43f5e';
        ctx.fillText('0 0 1 1 0', 130, 300);
        ctx.fillStyle = '#10b981';
        ctx.fillText('X C T H N', 130, 360);

        // Draw clean bounding corner brackets
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(100, 140);
        ctx.lineTo(100, 100);
        ctx.lineTo(140, 100);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(412, 360);
        ctx.lineTo(412, 400);
        ctx.lineTo(372, 400);
        ctx.stroke();
      }

      const canvasTexture = new THREE.CanvasTexture(canvas);
      canvasTexture.colorSpace = THREE.SRGBColorSpace;
      const maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();
      canvasTexture.anisotropy = maxAnisotropy;
      canvasTexture.minFilter = THREE.LinearMipmapLinearFilter;
      canvasTexture.magFilter = THREE.LinearFilter;
      canvasTexture.needsUpdate = true;

      const matteMat = new THREE.MeshBasicMaterial({ map: canvasTexture });

      // Dynamically load user's JPG/PNG images if placed in assets/ folder, falling back to procedural canvas
      if (item.type.startsWith('custom')) {
        const loader = new THREE.TextureLoader();
        loader.load(
          item.imageUrl,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.anisotropy = maxAnisotropy;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            matteMat.map = tex;
            matteMat.needsUpdate = true;
          },
          undefined,
          () => {
            // Fallback to loading a PNG image with the same base name
            const pngUrl = item.imageUrl.replace('.jpg', '.png');
            loader.load(
              pngUrl,
              (texPng) => {
                texPng.colorSpace = THREE.SRGBColorSpace;
                texPng.anisotropy = maxAnisotropy;
                texPng.minFilter = THREE.LinearMipmapLinearFilter;
                texPng.magFilter = THREE.LinearFilter;
                matteMat.map = texPng;
                matteMat.needsUpdate = true;
              },
              undefined,
              () => {
                // Keep procedural canvas art if both files are absent
              }
            );
          }
        );
      }

      const matteGeo = new THREE.PlaneGeometry(0.72, 0.72);
      const matteMesh = new THREE.Mesh(matteGeo, matteMat);
      matteMesh.position.set(0, 0, 0.032);
      group.add(matteMesh);

      // Position on West Wall (X = -4.93, facing +X into the room)
      group.position.set(-4.93, item.y, item.z);
      group.rotation.y = Math.PI / 2;

      this.scene.add(group);

      if (item.isInteractive) {
        this.registerInteractive(group, item.id);
      }
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

  public async clearWhiteboard() {
    this.resetWhiteboardToBlank();

    try {
      localStorage.removeItem('hananos_whiteboard_drawing');
    } catch {
      // Storage fallback
    }

    // Cloud reset: delete the Firestore global whiteboard document
    try {
      await deleteDoc(doc(db, 'whiteboards', 'global'));
      console.log('[Whiteboard] Deleted global cloud document.');
    } catch (error) {
      try {
        await setDoc(doc(db, 'whiteboards', 'global'), {
          dataUrl: '',
          updatedAt: new Date().toISOString()
        });
      } catch (err2) {
        console.warn('Failed to clear cloud whiteboard:', error, err2);
      }
    }
  }

  public async saveWhiteboardToStorage() {
    if (this.whiteboardCanvas) {
      try {
        let dataUrl = this.whiteboardCanvas.toDataURL('image/webp', 0.85);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = this.whiteboardCanvas.toDataURL('image/png');
        }
        // If string exceeds 800KB, use JPEG compression to guarantee staying under Firestore 1MB limit
        if (dataUrl.length > 800000) {
          dataUrl = this.whiteboardCanvas.toDataURL('image/jpeg', 0.8);
        }

        try {
          localStorage.setItem('hananos_whiteboard_drawing', dataUrl);
        } catch {
          // LocalStorage quota fallback
        }

        // Save to Firebase Firestore Cloud
        await setDoc(doc(db, 'whiteboards', 'global'), {
          dataUrl,
          updatedAt: new Date().toISOString()
        });
        console.log('[Whiteboard] Saved to Firebase Cloud successfully (' + Math.round(dataUrl.length / 1024) + ' KB)');
      } catch (err) {
        console.warn('Failed to save whiteboard drawing to cloud storage:', err);
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

    if (stationId !== 'overview') {
      // Zooming INTO an interactive object / station
      // Save current walk position and look direction so we return right here on zoom out!
      if (this.isWalkMode || !this.hasSavedWalkState) {
        this.savedWalkPos.copy(this.camera.position);
        this.savedWalkLook.copy(this.currentCameraLook);
        this.savedYaw = this.yaw;
        this.savedPitch = this.pitch;
        this.hasSavedWalkState = true;
      }

      this.activeStation = stationId;
      this.targetCameraPos.set(...config.cameraPos);
      this.targetCameraLook.set(...config.cameraTarget);
      this.targetFov = config.fov || 52;

      this.isInspecting = true;
      this.isWalkMode = false;
      this.isTransitioningBack = false;
      this.exitPointerLock();
    } else {
      // Zooming OUT back to walk mode!
      this.activeStation = 'overview';
      this.isInspecting = false;
      this.isTransitioningBack = true;

      if (this.hasSavedWalkState) {
        // Return to EXACT position and look direction the user zoomed in from!
        this.targetCameraPos.copy(this.savedWalkPos);
        this.targetCameraLook.copy(this.savedWalkLook);
        this.targetFov = 56;
      } else {
        // Default overview spawn position
        this.targetCameraPos.set(...config.cameraPos);
        this.targetCameraLook.set(...config.cameraTarget);
        this.targetFov = config.fov || 52;
      }
    }

    soundEngine.playWhoosh();
  }

  public stepBackToWalk() {
    this.goToStation('overview');
  }

  public startFromBoot() {
    this.isInspecting = false;
    this.isTransitioningBack = false;
    this.isWalkMode = true;
    this.activeStation = 'overview';
    this.targetCameraPos.set(4.2, 3.2, 3.2);
    this.targetCameraLook.set(-0.2, 2.0, -1.8);
    this.targetFov = 56;
    this.requestPointerLock();
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
    if (this.isPointerLockBlocked) return;
    if (document.pointerLockElement !== this.renderer.domElement) {
      try {
        this.renderer.domElement.focus();
        const res = this.renderer.domElement.requestPointerLock() as unknown;
        if (res && typeof (res as Promise<void>).catch === 'function') {
          (res as Promise<void>).catch(() => {
            // Silently handle expected pointer lock rejection (e.g. iframe unfocused)
          });
        }
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

    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('mozpointerlockchange', this.onPointerLockChange);
    document.addEventListener('webkitpointerlockchange', this.onPointerLockChange);

    dom.addEventListener('click', this.onClick);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onPointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
  };

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

    if (this.isWalkMode && !this.isPointerLocked) {
      this.requestPointerLock();
    }
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.isWalkMode) {
      const isCurrentlyLocked =
        this.isPointerLocked || document.pointerLockElement === this.renderer.domElement;

      // When the cursor is free on the screen (e.g. after pressing Esc), do not move the 3D environment!
      if (!isCurrentlyLocked) {
        this.prevMouseX = e.clientX;
        this.prevMouseY = e.clientY;
        return;
      }

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
    } else if (this.activeStation === 'horizontal_monitor' && this.pcScreenMesh) {
      // Direct on-screen mouse tracking on horizontal desktop monitor (2048x1152)
      const rect = this.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(mouse, this.camera);
      const hits = this.raycaster.intersectObject(this.pcScreenMesh, true);
      if (hits.length > 0 && hits[0].uv) {
        const uv = hits[0].uv;
        const cx = uv.x * 2048;
        const cy = (1 - uv.y) * 1152;
        this.handleDesktopMouseMove(cx, cy);
      }
    }
  };

  private onMouseUp = () => {
    this.isMouseDown = false;
  };

  private safeOpenLink(url: string) {
    try {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      }
    } catch {
      try {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      } catch {
        // Fallback for sandboxed context
      }
    }
  }

  private onClick = (e: MouseEvent) => {
    soundEngine.startAmbient();
    soundEngine.playKeyClick();

    // 1. Direct on-screen click on Desktop Horizontal Monitor (2048x1152)
    if (this.activeStation === 'horizontal_monitor' && this.pcScreenMesh) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(mouse, this.camera);
      const hits = this.raycaster.intersectObject(this.pcScreenMesh, true);
      if (hits.length > 0 && hits[0].uv) {
        const uv = hits[0].uv;
        const cx = uv.x * 2048;
        const cy = (1 - uv.y) * 1152;
        this.handleDesktopClick(cx, cy);
        return;
      }
    }

    // 2. Direct on-screen click on Laptop Terminal Screen (1024x2048)
    if (this.activeStation === 'vertical_monitor' && this.macScreenMesh) {
      const rect = this.renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      this.raycaster.setFromCamera(mouse, this.camera);
      const hits = this.raycaster.intersectObject(this.macScreenMesh, true);
      if (hits.length > 0 && hits[0].uv) {
        const uv = hits[0].uv;
        const tx = uv.x * 1024;
        const ty = (1 - uv.y) * 2048;
        if (ty >= 1920) {
          // Clicked bottom quick command chips
          const quickCmds = ['help', 'whoami', 'projects', 'cv', 'ctf', 'nmap', 'matrix', 'clear'];
          const chipIdx = Math.floor((tx - 20) / 122);
          if (chipIdx >= 0 && chipIdx < quickCmds.length) {
            this.executeTerminalCommand(quickCmds[chipIdx]);
          }
        }
        return;
      }
    }

    if (this.hoveredStationId) {
      if (
        this.hoveredStationId === 'social_linkedin' ||
        this.hoveredStationId === 'social_github' ||
        this.hoveredStationId === 'social_steam'
      ) {
        let url = 'https://linkedin.com/in/hanan-saeed';
        if (this.hoveredStationId === 'social_github') url = 'https://github.com/hannansaeed';
        if (this.hoveredStationId === 'social_steam') url = 'https://steamcommunity.com/id/xcthine';

        this.safeOpenLink(url);
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

    // 1. Direct keyboard typing into Laptop Terminal Screen
    if (this.activeStation === 'vertical_monitor') {
      if (e.key === 'Escape') {
        this.stepBackToWalk();
        return;
      }

      if (e.key === 'Enter') {
        this.executeTerminalCommand(this.terminalInput);
        this.terminalInput = '';
        return;
      }

      if (e.key === 'Backspace') {
        this.terminalInput = this.terminalInput.slice(0, -1);
        this.vertTexture.needsUpdate = true;
        soundEngine.playKeyClick();
        return;
      }

      if (e.key === 'ArrowUp') {
        if (this.terminalCmdHistory.length > 0) {
          if (this.terminalCmdIndex === -1) {
            this.terminalCmdIndex = this.terminalCmdHistory.length - 1;
          } else if (this.terminalCmdIndex > 0) {
            this.terminalCmdIndex--;
          }
          this.terminalInput = this.terminalCmdHistory[this.terminalCmdIndex] || '';
          this.vertTexture.needsUpdate = true;
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        if (this.terminalCmdIndex !== -1) {
          if (this.terminalCmdIndex < this.terminalCmdHistory.length - 1) {
            this.terminalCmdIndex++;
            this.terminalInput = this.terminalCmdHistory[this.terminalCmdIndex] || '';
          } else {
            this.terminalCmdIndex = -1;
            this.terminalInput = '';
          }
          this.vertTexture.needsUpdate = true;
        }
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        const available = ['help', 'whoami', 'projects', 'project', 'cv', 'skills', 'certs', 'ctf', 'nmap', 'matrix', 'neofetch', 'theme', 'clear'];
        const match = available.find((cmd) => cmd.startsWith(this.terminalInput.toLowerCase().trim()));
        if (match) {
          this.terminalInput = match;
          this.vertTexture.needsUpdate = true;
        }
        return;
      }

      if ((e.key === 'l' || e.key === 'L') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.executeTerminalCommand('clear');
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.terminalInput += e.key;
        this.vertTexture.needsUpdate = true;
        soundEngine.playKeyClick();
        return;
      }
    }

    // 2. Direct keyboard shortcuts on Desktop Horizontal Monitor
    if (this.activeStation === 'horizontal_monitor') {
      if (e.key === 'Escape') {
        this.stepBackToWalk();
        return;
      }
      if (e.key === '1') { this.setDesktopActiveWindow('about'); return; }
      if (e.key === '2') { this.setDesktopActiveWindow('notes'); return; }
      if (e.key === '3') { this.setDesktopActiveWindow('resume'); return; }
      if (e.key === '4') { this.setDesktopActiveWindow('mail'); return; }
      if (e.key === '5') { this.setDesktopActiveWindow('settings'); return; }
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
        let url = 'https://linkedin.com/in/hanan-saeed';
        if (this.hoveredStationId === 'social_github') url = 'https://github.com/hannansaeed';
        if (this.hoveredStationId === 'social_steam') url = 'https://steamcommunity.com/id/xcthine';

        this.safeOpenLink(url);
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
    if (this.horizMaterial?.uniforms?.uTime) {
      this.horizMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.vertMaterial?.uniforms?.uTime) {
      this.vertMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.coffeeSteamMaterial?.uniforms?.uTime) {
      this.coffeeSteamMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.skyWindowMaterial?.uniforms?.uTime) {
      this.skyWindowMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.dustPoints && (this.dustPoints.material as THREE.ShaderMaterial)?.uniforms?.uTime) {
      (this.dustPoints.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    }

    // 2. Swivel chair top back and forth between cabinets/guitar and octopus toy on sofa
    if (this.topChairMesh) {
      // Swivel between facing the cabinets & guitar on West wall and the octopus toy on sofa on South side
      // Reversed 180 degrees so the front of the seat faces the targets across the open room
      const midAngle = 0.693; // Center point (~39.7° facing into room towards South-West)
      const halfSpan = 0.825; // Swing amplitude (~47.3° to each side)
      this.topChairMesh.rotation.y = midAngle + Math.sin(elapsed * 0.35) * halfSpan;
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
        this.camera.position.copy(this.targetCameraPos);
        this.currentCameraPos.copy(this.targetCameraPos);

        if (this.hasSavedWalkState) {
          this.yaw = this.savedYaw;
          this.pitch = this.savedPitch;
          const lookDir = new THREE.Vector3(
            -Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            -Math.cos(this.yaw) * Math.cos(this.pitch)
          );
          this.currentCameraLook.copy(this.camera.position).add(lookDir);
          this.targetCameraLook.copy(this.currentCameraLook);
          this.camera.lookAt(this.currentCameraLook);
        } else {
          const dir = new THREE.Vector3().subVectors(this.targetCameraLook, this.targetCameraPos).normalize();
          this.yaw = Math.atan2(-dir.x, -dir.z);
          this.pitch = Math.asin(Math.max(-0.99, Math.min(0.99, dir.y)));
        }
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

    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    document.removeEventListener('mozpointerlockchange', this.onPointerLockChange);
    document.removeEventListener('webkitpointerlockchange', this.onPointerLockChange);

    if (this.whiteboardUnsubscribe) {
      this.whiteboardUnsubscribe();
      this.whiteboardUnsubscribe = null;
    }

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
      if (dom && this.container.contains(dom)) {
        this.container.removeChild(dom);
      }
    }
  }
}
