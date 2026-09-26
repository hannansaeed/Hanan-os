import * as THREE from 'three';

export const ServerLedShader = {
  uniforms: {
    uTime: { value: 0.0 },
    uColorA: { value: new THREE.Color(0x38bdf8) }, // Cyan led
    uColorB: { value: new THREE.Color(0x34d399) }, // Emerald led
    uColorC: { value: new THREE.Color(0xf59e0b) }, // Amber led
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uColorC;
    varying vec2 vUv;

    // Pseudo-random
    float hash(float n) {
      return fract(sin(n) * 43758.5453123);
    }

    void main() {
      // Grid of server rack indicators
      vec2 grid = vUv * vec2(16.0, 48.0);
      vec2 cellId = floor(grid);
      vec2 cellUv = fract(grid);

      // Distance to circle center
      float dist = length(cellUv - vec2(0.5));
      if (dist > 0.38) {
        // Dark server faceplate chassis
        gl_FragColor = vec4(0.04, 0.05, 0.06, 1.0);
        return;
      }

      float id = cellId.x * 48.0 + cellId.y;
      float speed = 2.0 + hash(id) * 8.0;
      float blink = step(0.45, sin(uTime * speed + hash(id * 7.13) * 6.28));
      
      // Determine color
      float colorType = hash(id * 13.9);
      vec3 ledColor = uColorA;
      if (colorType > 0.7) ledColor = uColorB;
      else if (colorType > 0.45) ledColor = uColorC;

      float intensity = blink * (1.0 - smoothstep(0.15, 0.38, dist));
      intensity = max(intensity, 0.12); // Small glow even when off

      vec3 finalColor = ledColor * intensity * 2.2;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

export const DustParticleShader = {
  uniforms: {
    uTime: { value: 0.0 },
    uColor: { value: new THREE.Color(0x94a3b8) },
  },
  vertexShader: `
    uniform float uTime;
    attribute float aScale;
    attribute float aRandom;
    varying float vAlpha;

    void main() {
      vec3 pos = position;
      // Gentle air drift
      pos.y += sin(uTime * 0.4 + aRandom * 12.0) * 0.2;
      pos.x += cos(uTime * 0.2 + aRandom * 8.0) * 0.15;
      pos.z += sin(uTime * 0.3 + aRandom * 5.0) * 0.15;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      gl_PointSize = (aScale * 14.0) / -mvPosition.z;
      vAlpha = 0.35 + 0.35 * sin(uTime * 1.5 + aRandom * 20.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    varying float vAlpha;

    void main() {
      // Soft round particle
      float d = length(gl_PointCoord - vec2(0.5));
      if (d > 0.5) discard;
      float strength = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(uColor, strength * vAlpha);
    }
  `
};
