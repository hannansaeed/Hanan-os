import * as THREE from 'three';
import { StationId } from '../types';
import { STATIONS } from '../data/portfolioData';
import { CRTShader } from './shaders/crtShader';
import { ServerLedShader, DustParticleShader } from './shaders/serverLedShader';
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

  // Camera animation
  private currentCameraPos: THREE.Vector3;
  private targetCameraPos: THREE.Vector3;
  private currentCameraLook: THREE.Vector3;
  private targetCameraLook: THREE.Vector3;
  private targetFov: number = 55;
  private isTransitioning: boolean = false;
  private activeStation: StationId = 'overview';

  // Walk mode
  private isWalkMode: boolean = false;
  private moveForward = false;
  private moveBackward = false;
  private moveLeft = false;
  private moveRight = false;
  private walkSpeed = 2.8;
  private playerRotationY = 0;
  private isPointerLocked = false;

  // Interactive Meshes map
  private interactiveObjects: THREE.Object3D[] = [];
  private objectStationMap = new Map<THREE.Object3D, StationId>();
  private hoveredObject: THREE.Object3D | null = null;

  // Dynamic canvas textures
  private horizCanvas!: HTMLCanvasElement;
  private horizCtx!: CanvasRenderingContext2D;
  private horizTexture!: THREE.CanvasTexture;
  private horizMaterial!: THREE.ShaderMaterial;

  private vertCanvas!: HTMLCanvasElement;
  private vertCtx!: CanvasRenderingContext2D;
  private vertTexture!: THREE.CanvasTexture;
  private vertMaterial!: THREE.ShaderMaterial;

  // Dust particles & server LEDs
  private dustPoints!: THREE.Points;
  private serverLedMat!: THREE.ShaderMaterial;

  // Callbacks
  public onStationSelect?: (stationId: StationId) => void;
  public onHoverChange?: (hit: RaycastHitInfo | null) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    // Setup Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06080d);
    this.scene.fog = new THREE.FogExp2(0x06080d, 0.045);

    // Setup Camera
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);

    const initConfig = STATIONS.overview;
    this.camera.position.set(...initConfig.cameraPos);
    this.currentCameraPos = this.camera.position.clone();
    this.targetCameraPos = this.camera.position.clone();

    this.currentCameraLook = new THREE.Vector3(...initConfig.cameraTarget);
    this.targetCameraLook = this.currentCameraLook.clone();
    this.camera.lookAt(this.currentCameraLook);

    // Setup Renderer
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
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // Build the room components
    this.initCanvasScreens();
    this.setupLighting();
    this.buildRoomArchitecture();
    this.buildDeskWorkstation();
    this.buildServerRack();
    this.buildCTFWall();
    this.buildTimelineWall();
    this.buildExitDoor();
    this.buildDustParticles();

    // Event listeners
    this.bindEvents();

    // Start loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  /* ----------------------------------------------------
     Dynamic Canvas Screens for Monitors
  ---------------------------------------------------- */
  private initCanvasScreens() {
    // Horizontal monitor canvas (1024x512)
    this.horizCanvas = document.createElement('canvas');
    this.horizCanvas.width = 1024;
    this.horizCanvas.height = 512;
    this.horizCtx = this.horizCanvas.getContext('2d')!;
    this.horizTexture = new THREE.CanvasTexture(this.horizCanvas);
    this.horizTexture.minFilter = THREE.LinearFilter;
    this.horizTexture.magFilter = THREE.LinearFilter;

    this.horizMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.horizTexture },
        uTime: { value: 0.0 },
        uCurvature: { value: 0.05 },
        uScanlineIntensity: { value: 0.18 },
        uFlicker: { value: 0.015 },
        uBrightness: { value: 1.12 },
        uTint: { value: new THREE.Color(0.85, 0.95, 1.0) },
      },
      vertexShader: CRTShader.vertexShader,
      fragmentShader: CRTShader.fragmentShader,
    });

    // Vertical monitor canvas (512x1024)
    this.vertCanvas = document.createElement('canvas');
    this.vertCanvas.width = 512;
    this.vertCanvas.height = 1024;
    this.vertCtx = this.vertCanvas.getContext('2d')!;
    this.vertTexture = new THREE.CanvasTexture(this.vertCanvas);
    this.vertTexture.minFilter = THREE.LinearFilter;
    this.vertTexture.magFilter = THREE.LinearFilter;

    this.vertMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.vertTexture },
        uTime: { value: 0.0 },
        uCurvature: { value: 0.04 },
        uScanlineIntensity: { value: 0.22 },
        uFlicker: { value: 0.02 },
        uBrightness: { value: 1.15 },
        uTint: { value: new THREE.Color(0.88, 1.0, 0.92) },
      },
      vertexShader: CRTShader.vertexShader,
      fragmentShader: CRTShader.fragmentShader,
    });
  }

  private updateScreensContent(elapsed: number) {
    // 1. Render Horizontal Monitor screen
    const hc = this.horizCtx;
    hc.fillStyle = '#080d1a';
    hc.fillRect(0, 0, 1024, 512);

    // Top status bar
    hc.fillStyle = '#0f172a';
    hc.fillRect(0, 0, 1024, 48);
    hc.strokeStyle = '#1e293b';
    hc.lineWidth = 1;
    hc.beginPath();
    hc.moveTo(0, 48);
    hc.lineTo(1024, 48);
    hc.stroke();

    hc.font = 'bold 20px "JetBrains Mono", monospace';
    hc.fillStyle = '#38bdf8';
    hc.fillText('HANAN//OS v3.8.4', 24, 32);

    hc.font = '15px "JetBrains Mono", monospace';
    hc.fillStyle = '#94a3b8';
    hc.fillText('KERNEL: LINUX 6.9.1-SECURITY-EBPF', 260, 32);

    // Pulsing online dot
    const pulse = Math.sin(elapsed * 4) * 0.5 + 0.5;
    hc.fillStyle = `rgba(52, 211, 153, ${0.4 + pulse * 0.6})`;
    hc.beginPath();
    hc.arc(920, 24, 6, 0, Math.PI * 2);
    hc.fill();
    hc.fillStyle = '#34d399';
    hc.fillText('ONLINE', 936, 30);

    // Projects Grid Preview
    hc.font = 'bold 22px "Syne", sans-serif';
    hc.fillStyle = '#f8fafc';
    hc.fillText('FEATURED WORKSTATIONS & RESEARCH', 24, 90);

    const cards = [
      { title: 'Android Kernel IPC Monitor', tag: 'NDK / eBPF / Mobile', stat: '450k/min IPC' },
      { title: 'Sentinel Autonomous CTF', tag: 'Docker / Go / Jailbreak', stat: '1,200 Solvers' },
      { title: 'HANAN//OS WebGL Spatial', tag: 'Three.js / GLSL / Audio', stat: '60 FPS Clean' },
    ];

    cards.forEach((card, idx) => {
      const x = 24 + idx * 328;
      const y = 114;
      hc.fillStyle = '#0b1329';
      hc.strokeStyle = '#1e3a8a';
      hc.lineWidth = 1.5;
      hc.roundRect(x, y, 312, 170, 8);
      hc.fill();
      hc.stroke();

      hc.font = 'bold 17px "Plus Jakarta Sans", sans-serif';
      hc.fillStyle = '#f1f5f9';
      hc.fillText(card.title, x + 16, y + 36);

      hc.font = '13px "JetBrains Mono", monospace';
      hc.fillStyle = '#38bdf8';
      hc.fillText(card.tag, x + 16, y + 68);

      hc.fillStyle = '#0f172a';
      hc.roundRect(x + 16, y + 90, 280, 48, 4);
      hc.fill();

      hc.font = '13px "JetBrains Mono", monospace';
      hc.fillStyle = '#34d399';
      hc.fillText(`METRIC: ${card.stat}`, x + 28, y + 120);
    });

    // Bottom live terminal feed on screen
    hc.fillStyle = '#050914';
    hc.roundRect(24, 308, 976, 178, 6);
    hc.fill();
    hc.strokeStyle = '#1e293b';
    hc.stroke();

    hc.font = '14px "JetBrains Mono", monospace';
    hc.fillStyle = '#64748b';
    hc.fillText('[SYS-DAEMON] Stream audit hooks initialized. Dynamic sandbox active.', 40, 338);

    const lineOff = (Math.floor(elapsed * 2) % 4);
    const mockLogs = [
      `[eBPF-HOOK] probe_binder_transaction [OK] pid=${1042 + lineOff} latency=18µs`,
      `[SECURITY] TLS handshake verified: AES-256-GCM cipher suite active`,
      `[CTF-ENGINE] ephemeral jail spinning up: contestant_id=HTB-9982`,
      `[PQC-KEM] Kyber768 encapsulation benchmark: zero side-channel leakage`,
    ];
    mockLogs.forEach((l, i) => {
      hc.fillStyle = i === 3 ? '#38bdf8' : '#94a3b8';
      hc.fillText(`> ${l}`, 40, 370 + i * 26);
    });

    // Blinking cursor
    if (Math.floor(elapsed * 2) % 2 === 0) {
      hc.fillStyle = '#38bdf8';
      hc.fillRect(40 + hc.measureText(`> ${mockLogs[3]}`).width + 8, 442, 9, 16);
    }

    this.horizTexture.needsUpdate = true;

    // 2. Render Vertical Monitor screen (CTF & Security Terminal)
    const vc = this.vertCtx;
    vc.fillStyle = '#050c09';
    vc.fillRect(0, 0, 512, 1024);

    // Top banner
    vc.fillStyle = '#092117';
    vc.fillRect(0, 0, 512, 54);
    vc.font = 'bold 20px "JetBrains Mono", monospace';
    vc.fillStyle = '#34d399';
    vc.fillText('SECURITY MONITOR', 24, 36);

    // Threat level indicator
    vc.font = '13px "JetBrains Mono", monospace';
    vc.fillStyle = '#10b981';
    vc.fillText('THREAT DEFENSE: LEVEL 1', 24, 86);

    // Simulated Radar / Packet Flow
    vc.fillStyle = '#061a12';
    vc.beginPath();
    vc.arc(256, 190, 80, 0, Math.PI * 2);
    vc.fill();
    vc.strokeStyle = '#059669';
    vc.lineWidth = 1;
    vc.stroke();

    // Radar sweep
    const sweepAngle = elapsed * 2.5;
    vc.beginPath();
    vc.moveTo(256, 190);
    vc.arc(256, 190, 80, sweepAngle, sweepAngle + 0.35);
    vc.fillStyle = 'rgba(52, 211, 153, 0.25)';
    vc.fill();

    // CTF category stats
    vc.font = 'bold 16px "JetBrains Mono", monospace';
    vc.fillStyle = '#a7f3d0';
    vc.fillText('CTF DOMAIN COMPETENCY', 24, 310);

    const ctfSkills = [
      { name: 'Binary Exploitation (Pwn)', score: 96 },
      { name: 'Reverse Engineering', score: 92 },
      { name: 'Cryptography & PQC', score: 90 },
      { name: 'Web Exploitation', score: 94 },
      { name: 'Kernel & eBPF', score: 88 },
    ];

    ctfSkills.forEach((item, i) => {
      const barY = 340 + i * 50;
      vc.font = '13px "JetBrains Mono", monospace';
      vc.fillStyle = '#e2e8f0';
      vc.fillText(item.name, 24, barY);
      vc.fillStyle = '#34d399';
      vc.fillText(`${item.score}%`, 430, barY);

      // Track
      vc.fillStyle = '#06281a';
      vc.fillRect(24, barY + 8, 464, 8);
      // Fill
      vc.fillStyle = '#10b981';
      vc.fillRect(24, barY + 8, (464 * item.score) / 100, 8);
    });

    // Real-time network sniff feed
    vc.font = 'bold 16px "JetBrains Mono", monospace';
    vc.fillStyle = '#a7f3d0';
    vc.fillText('LIVE PACKET INGRESS', 24, 620);

    const packets = [
      `192.168.1.104:443 -> SYN [TLS 1.3] 1420b`,
      `10.0.8.22:9090 -> CTF_FLAG_SUBMIT [VERIFIED]`,
      `172.18.0.4:80 -> GET /auth/token [HTTP 200]`,
      `192.168.1.5:22 -> SSH-2.0-OpenSSH_9.2p1`,
      `10.244.1.88 -> eBPF Ringbuf Dump [CRC OK]`,
      `127.0.0.1:5432 -> SELECT pg_sleep(0) [CACHED]`,
    ];

    packets.forEach((p, i) => {
      const py = 660 + i * 36;
      vc.fillStyle = '#041d14';
      vc.fillRect(24, py - 20, 464, 28);
      vc.font = '12px "JetBrains Mono", monospace';
      vc.fillStyle = i === 1 ? '#34d399' : '#6ee7b7';
      vc.fillText(`[${(elapsed * 100 + i * 14).toFixed(0).slice(-4)}ms] ${p}`, 32, py);
    });

    // Certifications preview
    vc.font = 'bold 15px "JetBrains Mono", monospace';
    vc.fillStyle = '#34d399';
    vc.fillText('ACCREDITATION: OSCP · PNPT · SEC+ · BSCP', 24, 980);

    this.vertTexture.needsUpdate = true;
  }

  /* ----------------------------------------------------
     Lighting
  ---------------------------------------------------- */
  private setupLighting() {
    // Subtle cool room ambient fill
    const ambientLight = new THREE.AmbientLight(0x0c1424, 0.9);
    this.scene.add(ambientLight);

    // Hemisphere light for ground vs ceiling reflection
    const hemiLight = new THREE.HemisphereLight(0x1e293b, 0x090d16, 0.6);
    this.scene.add(hemiLight);

    // Desk overhead spotlight (warm cone lighting)
    const deskSpot = new THREE.SpotLight(0xfef08a, 2.8);
    deskSpot.position.set(0, 3.2, 0.4);
    deskSpot.target.position.set(0, 0.8, 0);
    deskSpot.angle = Math.PI / 4.2;
    deskSpot.penumbra = 0.6;
    deskSpot.decay = 1.8;
    deskSpot.distance = 7;
    deskSpot.castShadow = true;
    deskSpot.shadow.mapSize.width = 1024;
    deskSpot.shadow.mapSize.height = 1024;
    deskSpot.shadow.bias = -0.001;
    this.scene.add(deskSpot);
    this.scene.add(deskSpot.target);

    // Horizontal screen cyan fill light
    const horizGlow = new THREE.PointLight(0x38bdf8, 2.2, 3.2);
    horizGlow.position.set(-0.15, 1.45, 0.35);
    this.scene.add(horizGlow);

    // Vertical screen emerald fill light
    const vertGlow = new THREE.PointLight(0x34d399, 1.8, 2.8);
    vertGlow.position.set(1.15, 1.5, 0.35);
    this.scene.add(vertGlow);

    // Server rack blue/purple fill
    const serverLight = new THREE.PointLight(0x6366f1, 2.0, 4.0);
    serverLight.position.set(-3.6, 1.8, -3.6);
    this.scene.add(serverLight);

    // CTF Wall directional accent light
    const ctfLight = new THREE.SpotLight(0x38bdf8, 1.6);
    ctfLight.position.set(-2.5, 2.8, 0.5);
    ctfLight.target.position.set(-4.95, 1.8, 0.5);
    ctfLight.angle = Math.PI / 3.5;
    ctfLight.penumbra = 0.5;
    this.scene.add(ctfLight);
    this.scene.add(ctfLight.target);

    // Timeline Wall directional accent light
    const timelineLight = new THREE.SpotLight(0xa855f7, 1.6);
    timelineLight.position.set(2.5, 2.8, 0.5);
    timelineLight.target.position.set(4.95, 1.8, 0.5);
    timelineLight.angle = Math.PI / 3.5;
    timelineLight.penumbra = 0.5;
    this.scene.add(timelineLight);
    this.scene.add(timelineLight.target);

    // Entrance door soft cyan beacon
    const doorLight = new THREE.PointLight(0x0ea5e9, 1.2, 3.5);
    doorLight.position.set(0, 2.2, 4.9);
    this.scene.add(doorLight);
  }

  /* ----------------------------------------------------
     Room Architecture (Walls, Floor, Ceiling, Trusses)
  ---------------------------------------------------- */
  private buildRoomArchitecture() {
    const roomWidth = 10;
    const roomDepth = 11;
    const roomHeight = 3.6;

    // Floor: Dark polished concrete with subtle grid lines
    const floorGeo = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0e17,
      roughness: 0.35,
      metalness: 0.45,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Floor tile grid trim lines
    const gridHelper = new THREE.GridHelper(10, 20, 0x1e293b, 0x0f172a);
    gridHelper.position.y = 0.002;
    this.scene.add(gridHelper);

    // Ceiling: Dark industrial ceiling
    const ceilingGeo = new THREE.PlaneGeometry(roomWidth, roomDepth);
    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x080a0f,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.y = roomHeight;
    ceiling.rotation.x = Math.PI / 2;
    this.scene.add(ceiling);

    // Wall Material
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x0f1422,
      roughness: 0.75,
      metalness: 0.25,
    });

    // Back Wall (Z = -roomDepth / 2)
    const backWallGeo = new THREE.PlaneGeometry(roomWidth, roomHeight);
    const backWall = new THREE.Mesh(backWallGeo, wallMat);
    backWall.position.set(0, roomHeight / 2, -roomDepth / 2);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Acoustic panels on back wall
    for (let i = -3; i <= 3; i += 1.5) {
      const panelGeo = new THREE.BoxGeometry(1.1, 2.2, 0.04);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x090d16,
        roughness: 0.85,
        metalness: 0.1,
      });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.set(i, 2.1, -roomDepth / 2 + 0.02);
      this.scene.add(panel);
    }

    // Left Wall (X = -roomWidth / 2)
    const leftWallGeo = new THREE.PlaneGeometry(roomDepth, roomHeight);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-roomWidth / 2, roomHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Right Wall (X = roomWidth / 2)
    const rightWallGeo = new THREE.PlaneGeometry(roomDepth, roomHeight);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(roomWidth / 2, roomHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    // Front Wall with door opening (Z = roomDepth / 2)
    const frontWallLeft = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, roomHeight, 0.1),
      wallMat
    );
    frontWallLeft.position.set(-2.9, roomHeight / 2, roomDepth / 2);
    this.scene.add(frontWallLeft);

    const frontWallRight = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, roomHeight, 0.1),
      wallMat
    );
    frontWallRight.position.set(2.9, roomHeight / 2, roomDepth / 2);
    this.scene.add(frontWallRight);

    const frontWallTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, roomHeight - 2.5, 0.1),
      wallMat
    );
    frontWallTop.position.set(0, 2.5 + (roomHeight - 2.5) / 2, roomDepth / 2);
    this.scene.add(frontWallTop);

    // Baseboards / Trims along walls
    const baseboardMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      metalness: 0.8,
      roughness: 0.3,
    });
    const bbBack = new THREE.Mesh(new THREE.BoxGeometry(roomWidth, 0.12, 0.05), baseboardMat);
    bbBack.position.set(0, 0.06, -roomDepth / 2 + 0.025);
    this.scene.add(bbBack);
  }

  /* ----------------------------------------------------
     Desk Workstation (Desk, Dual Curved/Vertical Monitors,
     Keyboard, Phone, Props, Chair)
  ---------------------------------------------------- */
  private buildDeskWorkstation() {
    const deskGroup = new THREE.Group();
    deskGroup.position.set(0, 0, 0);

    // Desk top: Walnut / matte carbon composite
    const topGeo = new THREE.BoxGeometry(2.6, 0.06, 1.1);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0x111622,
      roughness: 0.45,
      metalness: 0.3,
    });
    const deskTop = new THREE.Mesh(topGeo, topMat);
    deskTop.position.set(0, 0.76, 0);
    deskTop.receiveShadow = true;
    deskTop.castShadow = true;
    deskGroup.add(deskTop);

    // Desk legs (Matte black dual T-frame)
    const legMat = new THREE.MeshStandardMaterial({
      color: 0x030712,
      roughness: 0.3,
      metalness: 0.85,
    });
    const legGeo = new THREE.BoxGeometry(0.08, 0.76, 0.7);

    const leftLeg = new THREE.Mesh(legGeo, legMat);
    leftLeg.position.set(-1.15, 0.38, 0);
    leftLeg.castShadow = true;
    deskGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, legMat);
    rightLeg.position.set(1.15, 0.38, 0);
    rightLeg.castShadow = true;
    deskGroup.add(rightLeg);

    // Feet crossbars
    const footGeo = new THREE.BoxGeometry(0.12, 0.04, 0.85);
    const footLeft = new THREE.Mesh(footGeo, legMat);
    footLeft.position.set(-1.15, 0.02, 0);
    deskGroup.add(footLeft);

    const footRight = new THREE.Mesh(footGeo, legMat);
    footRight.position.set(1.15, 0.02, 0);
    deskGroup.add(footRight);

    // Large desk mat / pad
    const padGeo = new THREE.BoxGeometry(1.6, 0.005, 0.65);
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x080c14,
      roughness: 0.9,
    });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(0, 0.793, 0.05);
    deskGroup.add(pad);

    // Heavy duty dual monitor arm mount
    const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.55, 16);
    const armPole = new THREE.Mesh(armGeo, legMat);
    armPole.position.set(0.2, 1.05, -0.42);
    deskGroup.add(armPole);

    /* 1. Horizontal Ultrawide Curved Monitor */
    const horizScreenGroup = new THREE.Group();
    horizScreenGroup.position.set(-0.15, 1.48, -0.25);

    // Monitor frame/chassis
    const frameGeo = new THREE.BoxGeometry(1.28, 0.62, 0.04);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.35,
      metalness: 0.8,
    });
    const horizFrame = new THREE.Mesh(frameGeo, frameMat);
    horizFrame.castShadow = true;
    horizScreenGroup.add(horizFrame);

    // Screen display quad (with CRT shader!)
    const horizScreenGeo = new THREE.PlaneGeometry(1.24, 0.58);
    const horizScreen = new THREE.Mesh(horizScreenGeo, this.horizMaterial);
    horizScreen.position.z = 0.022;
    horizScreenGroup.add(horizScreen);

    deskGroup.add(horizScreenGroup);
    this.registerInteractive(horizScreenGroup, 'horizontal_monitor');

    /* 2. Vertical Security Terminal Monitor */
    const vertScreenGroup = new THREE.Group();
    vertScreenGroup.position.set(1.05, 1.5, -0.15);
    vertScreenGroup.rotation.y = -Math.PI / 10; // Angled slightly inward

    const vertFrameGeo = new THREE.BoxGeometry(0.48, 0.88, 0.04);
    const vertFrame = new THREE.Mesh(vertFrameGeo, frameMat);
    vertFrame.castShadow = true;
    vertScreenGroup.add(vertFrame);

    const vertScreenGeo = new THREE.PlaneGeometry(0.44, 0.84);
    const vertScreen = new THREE.Mesh(vertScreenGeo, this.vertMaterial);
    vertScreen.position.z = 0.022;
    vertScreenGroup.add(vertScreen);

    deskGroup.add(vertScreenGroup);
    this.registerInteractive(vertScreenGroup, 'vertical_monitor');

    /* 3. Mechanical Keyboard (CLI Terminal interactive target) */
    const kbGroup = new THREE.Group();
    kbGroup.position.set(-0.1, 0.805, 0.16);

    const kbBaseGeo = new THREE.BoxGeometry(0.42, 0.022, 0.15);
    const kbBaseMat = new THREE.MeshStandardMaterial({
      color: 0x171923,
      metalness: 0.6,
      roughness: 0.4,
    });
    const kbBase = new THREE.Mesh(kbBaseGeo, kbBaseMat);
    kbBase.castShadow = true;
    kbGroup.add(kbBase);

    // RGB Underglow strip on keyboard
    const rgbStripGeo = new THREE.BoxGeometry(0.41, 0.005, 0.01);
    const rgbStripMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const rgbStrip = new THREE.Mesh(rgbStripGeo, rgbStripMat);
    rgbStrip.position.set(0, 0.005, 0.07);
    kbGroup.add(rgbStrip);

    deskGroup.add(kbGroup);
    this.registerInteractive(kbGroup, 'desk');

    /* 4. Android Cyber Phone */
    const phoneGroup = new THREE.Group();
    phoneGroup.position.set(0.45, 0.81, 0.18);
    phoneGroup.rotation.y = -Math.PI / 12;
    phoneGroup.rotation.x = -Math.PI / 14;

    const phoneGeo = new THREE.BoxGeometry(0.08, 0.012, 0.16);
    const phoneMat = new THREE.MeshStandardMaterial({
      color: 0x050505,
      metalness: 0.9,
      roughness: 0.2,
    });
    const phoneMesh = new THREE.Mesh(phoneGeo, phoneMat);
    phoneGroup.add(phoneMesh);

    // Glowing phone screen
    const phoneScreenGeo = new THREE.PlaneGeometry(0.072, 0.145);
    const phoneScreenMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9 });
    const phoneScreen = new THREE.Mesh(phoneScreenGeo, phoneScreenMat);
    phoneScreen.rotation.x = -Math.PI / 2;
    phoneScreen.position.y = 0.007;
    phoneGroup.add(phoneScreen);

    deskGroup.add(phoneGroup);
    this.registerInteractive(phoneGroup, 'desk');

    /* 5. Modern Ergonomic Mesh Chair */
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, 0.95);

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.55, 0.08, 0.52);
    const chairMat = new THREE.MeshStandardMaterial({
      color: 0x181e2b,
      roughness: 0.8,
      metalness: 0.2,
    });
    const seat = new THREE.Mesh(seatGeo, chairMat);
    seat.position.y = 0.52;
    seat.castShadow = true;
    chairGroup.add(seat);

    // Backrest
    const backGeo = new THREE.BoxGeometry(0.5, 0.65, 0.06);
    const back = new THREE.Mesh(backGeo, chairMat);
    back.position.set(0, 0.88, 0.23);
    back.rotation.x = 0.1;
    back.castShadow = true;
    chairGroup.add(back);

    // Stem & Casters
    const stemGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.45, 12);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x020617,
      metalness: 0.9,
      roughness: 0.2,
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.y = 0.26;
    chairGroup.add(stem);

    // 5-Star base
    const baseGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.04, 5);
    const base = new THREE.Mesh(baseGeo, stemMat);
    base.position.y = 0.06;
    chairGroup.add(base);

    deskGroup.add(chairGroup);

    this.scene.add(deskGroup);
  }

  /* ----------------------------------------------------
     Server Rack (Back-Left Corner)
  ---------------------------------------------------- */
  private buildServerRack() {
    const rackGroup = new THREE.Group();
    rackGroup.position.set(-4.1, 0, -4.1);
    rackGroup.rotation.y = Math.PI / 4; // Angled toward center of room

    // 42U Rack cabinet frame (Height: 2.2m, Width: 0.85m, Depth: 0.95m)
    const frameGeo = new THREE.BoxGeometry(0.85, 2.2, 0.95);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x07090e,
      roughness: 0.4,
      metalness: 0.75,
    });
    const cabinet = new THREE.Mesh(frameGeo, frameMat);
    cabinet.position.y = 1.1;
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    rackGroup.add(cabinet);

    // Front Faceplate LED array (using custom ServerLedShader)
    this.serverLedMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uColorA: ServerLedShader.uniforms.uColorA,
        uColorB: ServerLedShader.uniforms.uColorB,
        uColorC: ServerLedShader.uniforms.uColorC,
      },
      vertexShader: ServerLedShader.vertexShader,
      fragmentShader: ServerLedShader.fragmentShader,
    });

    const ledPanelGeo = new THREE.PlaneGeometry(0.72, 1.95);
    const ledPanel = new THREE.Mesh(ledPanelGeo, this.serverLedMat);
    ledPanel.position.set(0, 1.1, 0.48);
    rackGroup.add(ledPanel);

    // Glass door cover
    const glassGeo = new THREE.PlaneGeometry(0.78, 2.05);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.25,
      roughness: 0.1,
      metalness: 0.9,
      transmission: 0.7,
    });
    const glassDoor = new THREE.Mesh(glassGeo, glassMat);
    glassDoor.position.set(0, 1.1, 0.49);
    rackGroup.add(glassDoor);

    this.scene.add(rackGroup);
    this.registerInteractive(rackGroup, 'server_rack');
  }

  /* ----------------------------------------------------
     CTF Lab Wall (Left Wall: X = -4.95)
  ---------------------------------------------------- */
  private buildCTFWall() {
    const ctfGroup = new THREE.Group();
    ctfGroup.position.set(-4.92, 1.8, 0.5);
    ctfGroup.rotation.y = Math.PI / 2;

    // Header sign: "CTF // VULNERABILITY LAB"
    const signGeo = new THREE.BoxGeometry(3.6, 0.4, 0.03);
    const signMat = new THREE.MeshStandardMaterial({
      color: 0x090f1d,
      metalness: 0.8,
      roughness: 0.3,
    });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.y = 1.0;
    ctfGroup.add(sign);

    // Pinned challenge cards (Web, Reverse, Crypto, Forensics, Pwn)
    const cardGeo = new THREE.BoxGeometry(0.68, 0.88, 0.02);
    const cardColors = [0x0f2438, 0x102e26, 0x2b1c3d, 0x2e1e12, 0x1f2937];

    cardColors.forEach((color, i) => {
      const cardMat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.3,
        roughness: 0.6,
      });
      const card = new THREE.Mesh(cardGeo, cardMat);
      card.position.set(-1.4 + i * 0.7, 0.15, 0.015);
      ctfGroup.add(card);

      // Pinned pins/clips
      const pinGeo = new THREE.SphereGeometry(0.015, 8, 8);
      const pinMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(-1.4 + i * 0.7, 0.55, 0.035);
      ctfGroup.add(pin);
    });

    this.scene.add(ctfGroup);
    this.registerInteractive(ctfGroup, 'ctf_wall');
  }

  /* ----------------------------------------------------
     Timeline Wall (Right Wall: X = 4.95)
  ---------------------------------------------------- */
  private buildTimelineWall() {
    const timelineGroup = new THREE.Group();
    timelineGroup.position.set(4.92, 1.8, 0.5);
    timelineGroup.rotation.y = -Math.PI / 2;

    // Glowing timeline backbone rail
    const railGeo = new THREE.BoxGeometry(3.6, 0.02, 0.02);
    const railMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.y = 0;
    timelineGroup.add(rail);

    // 4 Milestone plaques (2023, 2024, 2025, 2026)
    const plaqueGeo = new THREE.BoxGeometry(0.72, 0.95, 0.02);
    const years = ['2023', '2024', '2025', '2026'];

    years.forEach((_, i) => {
      const plaqueMat = new THREE.MeshStandardMaterial({
        color: 0x140d24,
        metalness: 0.5,
        roughness: 0.4,
      });
      const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
      plaque.position.set(-1.35 + i * 0.9, 0.05, 0.015);
      timelineGroup.add(plaque);

      // Node dot on the rail
      const nodeGeo = new THREE.SphereGeometry(0.035, 12, 12);
      const nodeMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });
      const node = new THREE.Mesh(nodeGeo, nodeMat);
      node.position.set(-1.35 + i * 0.9, 0, 0.028);
      timelineGroup.add(node);
    });

    this.scene.add(timelineGroup);
    this.registerInteractive(timelineGroup, 'timeline_wall');
  }

  /* ----------------------------------------------------
     Exit Door (Comms & Contact Terminal)
  ---------------------------------------------------- */
  private buildExitDoor() {
    const doorGroup = new THREE.Group();
    doorGroup.position.set(0, 1.25, 5.46);

    // Reinforced door frame
    const frameGeo = new THREE.BoxGeometry(1.5, 2.5, 0.08);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x050811,
      metalness: 0.85,
      roughness: 0.35,
    });
    const door = new THREE.Mesh(frameGeo, frameMat);
    doorGroup.add(door);

    // Electronic keypad & illuminated comms interface
    const keypadGeo = new THREE.BoxGeometry(0.24, 0.42, 0.04);
    const keypadMat = new THREE.MeshStandardMaterial({
      color: 0x0b1329,
      metalness: 0.8,
      roughness: 0.2,
    });
    const keypad = new THREE.Mesh(keypadGeo, keypadMat);
    keypad.position.set(0.9, 0, 0);
    doorGroup.add(keypad);

    // Keypad neon indicator
    const ledGeo = new THREE.PlaneGeometry(0.18, 0.08);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.set(0.9, 0.12, 0.025);
    doorGroup.add(led);

    this.scene.add(doorGroup);
    this.registerInteractive(doorGroup, 'exit_door');
  }

  /* ----------------------------------------------------
     Atmospheric Dust Particles
  ---------------------------------------------------- */
  private buildDustParticles() {
    const count = 350;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const randoms = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 8.5;
      positions[i * 3 + 1] = Math.random() * 3.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 9.5;

      scales[i] = 0.5 + Math.random() * 1.5;
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
     Interactive Object Registration
  ---------------------------------------------------- */
  private registerInteractive(obj: THREE.Object3D, stationId: StationId) {
    this.interactiveObjects.push(obj);
    this.objectStationMap.set(obj, stationId);

    // Recursively register all children so raycaster catches any part
    obj.traverse((child) => {
      this.objectStationMap.set(child, stationId);
    });
  }

  /* ----------------------------------------------------
     Station Transition & Camera Movement
  ---------------------------------------------------- */
  public goToStation(stationId: StationId) {
    const target = STATIONS[stationId];
    if (!target) return;

    this.activeStation = stationId;
    this.targetCameraPos.set(...target.cameraPos);
    this.targetCameraLook.set(...target.cameraTarget);
    this.targetFov = target.fov || 55;
    this.isTransitioning = true;

    soundEngine.playWhoosh();
    if (this.onStationSelect) {
      this.onStationSelect(stationId);
    }
  }

  public getActiveStation(): StationId {
    return this.activeStation;
  }

  public setWalkMode(active: boolean) {
    this.isWalkMode = active;
  }

  public getWalkMode(): boolean {
    return this.isWalkMode;
  }

  /* ----------------------------------------------------
     Event Handlers & Raycasting
  ---------------------------------------------------- */
  private bindEvents() {
    window.addEventListener('resize', this.onWindowResize);

    const dom = this.renderer.domElement;
    dom.addEventListener('pointermove', this.onPointerMove);
    dom.addEventListener('click', this.onPointerClick);

    // Keyboard navigation
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private onPointerMove = (e: MouseEvent) => {
    // Start ambient on first mouse interaction
    soundEngine.startAmbient();

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast against interactive objects
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveObjects, true);

    if (intersects.length > 0) {
      let rootObj: THREE.Object3D | null = intersects[0].object;
      while (rootObj && !this.objectStationMap.has(rootObj)) {
        rootObj = rootObj.parent;
      }

      if (rootObj) {
        const stationId = this.objectStationMap.get(rootObj)!;
        const config = STATIONS[stationId];
        this.renderer.domElement.style.cursor = 'pointer';
        this.hoveredObject = rootObj;

        if (this.onHoverChange) {
          this.onHoverChange({
            stationId,
            label: config.label,
            hint: 'Click or press [E] to inspect',
          });
        }
        return;
      }
    }

    this.renderer.domElement.style.cursor = 'default';
    this.hoveredObject = null;
    if (this.onHoverChange) {
      this.onHoverChange(null);
    }
  };

  private onPointerClick = () => {
    soundEngine.playKeyClick();
    if (this.hoveredObject) {
      const stationId = this.objectStationMap.get(this.hoveredObject);
      if (stationId) {
        this.goToStation(stationId);
      }
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    // Avoid interfering if active element is an input or textarea
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
      return;
    }

    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') this.moveForward = true;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') this.moveBackward = true;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') this.moveLeft = true;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') this.moveRight = true;

    // [E] to inspect hovered station
    if ((e.key === 'e' || e.key === 'E') && this.hoveredObject) {
      const stationId = this.objectStationMap.get(this.hoveredObject);
      if (stationId) {
        this.goToStation(stationId);
      }
    }

    // Number keys 1-7 for instant station teleportation
    const num = parseInt(e.key);
    if (!isNaN(num) && num >= 0 && num <= 7) {
      const stationList: StationId[] = [
        'overview',
        'horizontal_monitor',
        'vertical_monitor',
        'desk',
        'ctf_wall',
        'timeline_wall',
        'server_rack',
        'exit_door',
      ];
      if (stationList[num]) {
        this.goToStation(stationList[num]);
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
     Render Loop & Animation
  ---------------------------------------------------- */
  private animate() {
    this.animFrameId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    // Update screen shaders uniforms
    if (this.horizMaterial.uniforms.uTime) {
      this.horizMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.vertMaterial.uniforms.uTime) {
      this.vertMaterial.uniforms.uTime.value = elapsed;
    }
    if (this.serverLedMat && this.serverLedMat.uniforms.uTime) {
      this.serverLedMat.uniforms.uTime.value = elapsed;
    }
    if (this.dustPoints && (this.dustPoints.material as THREE.ShaderMaterial).uniforms.uTime) {
      (this.dustPoints.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
    }

    // Update canvas screen feeds
    this.updateScreensContent(elapsed);

    // First person walk mode displacement
    if (this.isWalkMode) {
      const moveVector = new THREE.Vector3();
      if (this.moveForward) moveVector.z -= 1;
      if (this.moveBackward) moveVector.z += 1;
      if (this.moveLeft) moveVector.x -= 1;
      if (this.moveRight) moveVector.x += 1;

      if (moveVector.lengthSq() > 0) {
        moveVector.normalize();
        moveVector.multiplyScalar(this.walkSpeed * delta);
        this.camera.position.add(moveVector);

        // Keep player within room bounds
        this.camera.position.x = Math.max(-4.2, Math.min(4.2, this.camera.position.x));
        this.camera.position.z = Math.max(-4.5, Math.min(4.9, this.camera.position.z));
        this.camera.position.y = 1.75; // Eye height

        this.currentCameraPos.copy(this.camera.position);
      }
    } else {
      // Smooth interpolation toward target camera pose
      this.currentCameraPos.lerp(this.targetCameraPos, delta * 3.8);
      this.currentCameraLook.lerp(this.targetCameraLook, delta * 3.8);

      this.camera.position.copy(this.currentCameraPos);
      this.camera.lookAt(this.currentCameraLook);

      // Interpolate FOV
      if (Math.abs(this.camera.fov - this.targetFov) > 0.1) {
        this.camera.fov += (this.targetFov - this.camera.fov) * delta * 3.5;
        this.camera.updateProjectionMatrix();
      }

      if (this.currentCameraPos.distanceTo(this.targetCameraPos) < 0.05) {
        this.isTransitioning = false;
      }
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  /* ----------------------------------------------------
     Cleanup
  ---------------------------------------------------- */
  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointermove', this.onPointerMove);
    dom.removeEventListener('click', this.onPointerClick);

    this.renderer.dispose();
    if (this.container.contains(dom)) {
      this.container.removeChild(dom);
    }
  }
}
