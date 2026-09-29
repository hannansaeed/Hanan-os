# HANAN//OS — Interactive 3D Cybersecurity Workstation & Portfolio

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-black?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS v4](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Web Audio API](https://img.shields.io/badge/Web_Audio_API-FFA500?style=for-the-badge&logo=soundcharts&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

> An immersive, spatial 3D interactive portfolio and cybersecurity research workstation built with **Three.js, WebGL, GLSL Shaders, and React 19**. Features custom baked room textures, raycasted dynamic canvas screens, an interactive Linux CLI terminal, and a full desktop operating system running directly inside the 3D environment.

---

## 🌟 Key Features

### 1. 🌐 Immersive 3D Spatial Environment
- **Procedural & Baked Lighting**: Custom GLTF room models paired with day/night/neutral baked lightmaps and dynamic point light shaders.
- **Cinematic Orbit Camera**: Smooth quaternion camera transitions between **Room Overview**, **Vertical CRT Terminal View**, and **Ultra-Wide Desktop OS View**.
- **Ambient Room FX**: Real-time coffee steam particles, pulsing Google Home RGB LED rings, and Elgato studio lighting.

### 2. 🖥️ Ultra-Wide Dynamic Canvas Desktop OS (2048 × 1152)
- **Direct 3D Texture Raycasting**: Mouse and touch interactions mapped directly to 3D geometry screen surfaces in real time.
- **Window Management**: Interactive floating Dock, Start Menu, draggable window frames, and theme switcher.
- **Applications Included**:
  - **About Me**: Verified background, B.S. in Information Technology and cyber defense focus.
  - **Notes Scratchpad**: Interactive text editor for security research logs.
  - **Curriculum Vitae (CV)**: Verified career credentials with one-click direct PDF opener for `/assets/cv.pdf`.
  - **Contacts & Channels**: Clickable vector brand cards for **Email**, **GitHub**, **LinkedIn**, **Discord** (`ID: 1079258412317163700`), **Instagram** (`@__not__batman`), and **PDF CV**.
  - **Photo Gallery**: High-resolution environment renders and custom wallpaper previews.
  - **Settings & Credits**: Acknowledgments and inspirations.

### 3. ⚡ Interactive CRT Terminal CLI (1024 × 1024)
- **Authentic Retro CRT Shading**: Scanlines, curvature distortion, bloom glow, and phosphor flicker shaders.
- **Command-Line Shell**:
  - `help` — Lists all available shell commands.
  - `ls` / `cat <file>` — Traverse directories and inspect markdown documentation.
  - `projects` — Inspect cybersecurity repositories and automated tools.
  - `cv` / `resume` — Launch the live portfolio CV and open `/assets/cv.pdf`.
  - `skills` / `certs` — Technical proficiency matrices and accreditations.
  - `nmap <target>` / `scan` — Simulated network reconnaissance and port scans.
  - `matrix` / `clear` / `exit` — Terminal utilities and visual modes.

### 4. 🛡️ Featured Cybersecurity & Systems Projects
- **Network Vulnerability Scanner**: Asynchronous Python scanning engine utilizing Nmap bindings and live CVE vulnerability mapping.
- **Web App Pentesting Toolkit**: Modular testing framework automating checks for SQL Injection, XSS, and CSRF aligned with the OWASP Top 10.
- **Security Alert & Incident Automation Bot**: Real-time Linux syslog parser (`auth.log`) with immediate Discord webhook incident dispatch.
- **Hardened Android Mobile Application**: Kotlin MVVM architecture featuring SQLCipher encrypted local database and Firebase Firestore security rules.

### 5. 🔊 Procedural Web Audio Synthesis
- Zero audio asset dependencies: Mechanical keyclicks, modem handshakes, retro UI beeps, CRT humming, and ambient room soundscape synthesized in real time via the Web Audio API.

---

## 🛠️ Tech Stack

- **Core Framework**: [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/)
- **3D Graphics & Shaders**: [Three.js](https://threejs.org/) + GLSL Fragment/Vertex Shaders + Draco GLTF Compression
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Audio**: Web Audio API (Synthesizer & Sound FX Engine)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Deployment**: Static Asset Bundler & Express Dev Proxy

---

## 📁 Project Structure

```
.
├── public/
│   ├── assets/
│   │   ├── cv.pdf                   # Hosted Curriculum Vitae PDF document
│   │   ├── roomModel.glb            # Draco-compressed 3D room model
│   │   ├── bakedDay.jpg             # Day lightmap
│   │   ├── bakedNight.jpg           # Night ambient lightmap
│   │   └── bakedNeutral.jpg         # Studio neutral lightmap
│   └── draco/                       # Draco WebAssembly decoders
├── src/
│   ├── audio/
│   │   └── soundEngine.ts           # Web Audio API procedural sound engine
│   ├── components/
│   │   ├── 3d/
│   │   │   └── ThreeCanvas.tsx      # Main Three.js canvas & interaction wrapper
│   │   ├── modals/                  # Interactive overlay modal components
│   │   └── ui/                      # HUD badges, audio toggles, focal controls
│   ├── data/
│   │   └── portfolioData.ts         # Portfolio projects, skills, and CV data
│   ├── scene/
│   │   └── RoomScene.ts             # 3D Scene setup, lighting, raycasting, OS & terminal renderers
│   ├── types/                       # TypeScript interfaces and types
│   ├── App.tsx                      # Root application entry
│   └── main.tsx                     # React DOM bootstrap
├── metadata.json                    # Project description and permissions
├── package.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm, yarn, or pnpm

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hannansaeed/hanan-os.git
   cd hanan-os
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for production**:
   ```bash
   npm run build
   ```

5. **Type check & lint**:
   ```bash
   npm run lint
   ```

---

## ⌨️ Controls & Navigation

| Control | Action |
| :--- | :--- |
| **Left Click + Drag** | Orbit around the 3D room environment |
| **Right Click + Drag** | Pan camera position |
| **Scroll Wheel** | Zoom in / Zoom out |
| **Click on Laptop Screen** | Focus camera directly on the Vertical CRT Terminal CLI |
| **Click on PC Monitor** | Focus camera directly on the Ultra-Wide Desktop OS |
| **Click on Door** | Return to overview / Exit active workstation mode |
| **ESC Key** | Reset camera to default room overview |

---

## 💡 Inspiration & Acknowledgments

- **Inspiration**: Joan Ramos, Bruno Simon, etc.
- **Special Thanks**: *"People who believe in me"* — Mentors, friends, family, and the global developer community.

---

## 📬 Contact & Links

- **Author**: Hanan Saeed
- **Role**: Cyber Security Researcher & Python Developer
- **University**: Bahauddin Zakariya University (BZU)
- **Portfolio & CV**: [hannansaeed.github.io/portfolio](https://hannansaeed.github.io/portfolio)
- **PDF Resume**: [`/assets/cv.pdf`](public/assets/cv.pdf)
- **GitHub**: [@hannansaeed](https://github.com/hannansaeed)
- **LinkedIn**: [in/hanan-saeed](https://linkedin.com/in/hanan-saeed)
- **Discord**: User ID `1079258412317163700` ([Direct Link](https://discord.com/users/1079258412317163700))
- **Instagram**: [@\_\_not\_\_batman](https://instagram.com/__not__batman)
- **Email**: [hanansaeed609@yahoo.com](mailto:hanansaeed609@yahoo.com)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
