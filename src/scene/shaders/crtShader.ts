import * as THREE from 'three';

export const CRTShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0.0 },
    uCurvature: { value: 0.08 },
    uScanlineIntensity: { value: 0.22 },
    uFlicker: { value: 0.03 },
    uBrightness: { value: 1.1 },
    uTint: { value: new THREE.Color(0.9, 0.96, 1.0) },
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

    vec2 curveUV(vec2 uv) {
      uv = (uv - 0.5) * 2.0;
      uv *= 1.0 + pow(length(uv) * uCurvature, 2.0);
      uv = (uv / 2.0) + 0.5;
      return uv;
    }

    void main() {
      vec2 uv = curveUV(vUv);
      
      // Screen bezel border cutoff
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.01, 0.01, 0.02, 1.0);
        return;
      }

      // Chromatic aberration at edges
      vec2 redUv = uv + vec2(0.0018 * (uv.x - 0.5), 0.0);
      vec2 blueUv = uv - vec2(0.0018 * (uv.x - 0.5), 0.0);
      
      float r = texture2D(tDiffuse, redUv).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, blueUv).b;

      // Scanlines
      float scanline = sin(uv.y * 520.0 + uTime * 2.0) * 0.5 + 0.5;
      vec3 color = vec3(r, g, b) * (1.0 - uScanlineIntensity + scanline * uScanlineIntensity);

      // CRT horizontal subtle RGB phosphor pattern
      float subpixel = mod(gl_FragCoord.x, 3.0);
      if (subpixel < 1.0) color.r *= 1.08;
      else if (subpixel < 2.0) color.g *= 1.08;
      else color.b *= 1.08;

      // Micro flicker
      float flicker = 1.0 - sin(uTime * 45.0) * uFlicker;
      color *= flicker;

      // Vignette
      float vignette = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
      vignette = clamp(pow(16.0 * vignette, 0.25), 0.0, 1.0);
      color *= vignette;

      // Apply brightness boost and cool tint
      color *= uBrightness * uTint;

      gl_FragColor = vec4(color, 1.0);
    }
  `
};
