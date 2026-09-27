import * as THREE from 'three';

export const CoffeeSteamShader = {
  uniforms: {
    uTime: { value: 0.0 },
    uColor: { value: new THREE.Color(0xf1f5f9) }, // Soft slate white steam
    uOpacity: { value: 0.12 },
  },
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Scale vertical height down by 40%
      pos.y *= 0.60;

      // Gentle organic swaying/displacement of the steam column as it rises
      float waveX = sin(uTime * 1.4 + pos.y * 3.5) * 0.02 * uv.y;
      float waveZ = cos(uTime * 1.8 + pos.y * 4.0) * 0.02 * uv.y;
      pos.x += waveX;
      pos.z += waveZ;

      vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPosition.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    // Simplex 2D noise implementation
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

    float snoise(vec2 v){
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
               -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v -   i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
      + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
        dot(x12.zw,x12.zw)), 0.0);
      m = m*m;
      m = m*m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      // 1. Edge fade out on sides (X axis in UV) so there are no sharp box borders
      float xFade = smoothstep(0.0, 0.2, vUv.x) * (1.0 - smoothstep(0.8, 1.0, vUv.x));

      // 2. Bottom fade out (smooth rise from cup brim) and top opacity decay (dissolves quickly as it goes up)
      float yBottomFade = smoothstep(0.0, 0.1, vUv.y);
      float yTopFade = 1.0 - smoothstep(0.15, 0.60, vUv.y);
      float yFade = yBottomFade * yTopFade;

      // 3. Multi-octave rising noise texture for organic steam smoke tendrils
      vec2 st1 = vec2(vUv.x * 2.2, vUv.y * 2.8 - uTime * 0.22);
      vec2 st2 = vec2(vUv.x * 4.0 + 1.3, vUv.y * 5.0 - uTime * 0.38);

      float noise1 = snoise(st1);
      float noise2 = snoise(st2);
      float combinedNoise = noise1 * 0.65 + noise2 * 0.35;

      // Normalize noise to smooth steam pattern
      float steamPattern = smoothstep(-0.25, 0.55, combinedNoise);

      // 4. Combine all masks for realistic soft wispy steam
      float finalAlpha = steamPattern * xFade * yFade * uOpacity;

      if (finalAlpha < 0.005) discard;

      // Soft subtle warm-white steam tone
      vec3 steamColor = uColor + vec3(0.03 * sin(uTime + vUv.y * 4.0));

      gl_FragColor = vec4(steamColor, finalAlpha);
    }
  `,
};
