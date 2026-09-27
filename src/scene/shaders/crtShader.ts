import * as THREE from 'three';

export const CRTShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0.0 },
    uCurvature: { value: 0.0 },
    uScanlineIntensity: { value: 0.04 },
    uFlicker: { value: 0.0 },
    uBrightness: { value: 1.05 },
    uTint: { value: new THREE.Color(1.0, 1.0, 1.0) },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uCurvature;
    uniform float uScanlineIntensity;
    uniform float uFlicker;
    uniform float uBrightness;
    uniform vec3 uTint;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      
      // Screen bezel border cutoff
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.01, 0.01, 0.02, 1.0);
        return;
      }

      vec4 texColor = texture2D(tDiffuse, uv);
      vec3 color = texColor.rgb;

      // Ultra subtle crisp scanlines for authentic display feel without blurring text
      if (uScanlineIntensity > 0.0) {
        float scanline = sin(uv.y * 1080.0 * 3.14159) * 0.5 + 0.5;
        color = mix(color, color * (0.95 + scanline * 0.05), uScanlineIntensity);
      }

      // Brightness & Tint
      color *= uBrightness * uTint;

      gl_FragColor = vec4(color, texColor.a);
    }
  `
};

