import * as THREE from 'three';

export const SkyWindowShader = {
  uniforms: {
    uTime: { value: 0.0 },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    // Hash functions for procedural stars
    vec2 hash22(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.xx + p3.yz) * p3.zy);
    }

    float hash21(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // Value noise for nebula
    float vNoise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(
        mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
        u.y
      );
    }

    // Fractal Brownian Motion for cosmic nebula
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      vec2 shift = vec2(2.6, 3.4);
      for (int i = 0; i < 4; ++i) {
        v += a * vNoise(p);
        p = p * 2.1 + shift;
        a *= 0.5;
      }
      return v;
    }

    // Star layer generator with twinkling and diffraction cross
    vec3 renderStarLayer(vec2 uv, float scale, float twinkleSpeed, float sizeFactor) {
      vec2 gridUv = uv * scale;
      vec2 cellId = floor(gridUv);
      vec2 cellF = fract(gridUv) - 0.5;

      vec3 layerColor = vec3(0.0);

      // Check adjacent cells for seamless star rendering
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 rId = cellId + neighbor;
          vec2 rnd = hash22(rId);

          // Star position within cell
          vec2 starPos = neighbor + (rnd - 0.5) * 0.75;
          float d = length(cellF - starPos);

          // Star properties
          float brightness = rnd.x;
          float isBrightStar = step(0.88, rnd.y);
          
          // Twinkle oscillation
          float twinkle = sin(uTime * twinkleSpeed * (1.2 + rnd.y * 2.5) + rnd.x * 6.2831) * 0.5 + 0.5;
          twinkle = mix(0.4, 1.0, twinkle);

          // Star color temperature (blue-white, gold-amber, cyan, violet)
          vec3 starTint = mix(
            vec3(0.85, 0.92, 1.0),   // Cool sapphire diamond
            mix(vec3(1.0, 0.88, 0.65), vec3(0.75, 0.85, 1.0), rnd.y), // Warm amber or cyan
            step(0.5, rnd.x)
          );

          // Core glow
          float radius = (0.015 + brightness * 0.025) * sizeFactor;
          float glow = exp(-d * (140.0 / sizeFactor)) * brightness * twinkle;
          float core = smoothstep(radius, 0.0, d) * (1.2 + isBrightStar * 1.5) * twinkle;

          // Star diffraction cross spikes for bright stars
          vec2 delta = abs(cellF - starPos);
          float crossSpike = 0.0;
          if (isBrightStar > 0.5) {
            float spikeX = exp(-delta.x * 250.0) * exp(-delta.y * 30.0);
            float spikeY = exp(-delta.y * 250.0) * exp(-delta.x * 30.0);
            crossSpike = (spikeX + spikeY) * 0.65 * twinkle;
          }

          layerColor += (core + glow + crossSpike) * starTint;
        }
      }

      return layerColor;
    }

    void main() {
      // 1. Deep Cosmic Night Background Gradient
      vec3 zenithColor   = vec3(0.012, 0.018, 0.045); // Deepest obsidian space at top
      vec3 midNightColor = vec3(0.024, 0.038, 0.085); // Rich deep midnight sapphire
      vec3 horizonColor  = vec3(0.042, 0.062, 0.125); // Subtle starlit twilight glow at horizon

      vec3 sky = mix(horizonColor, midNightColor, smoothstep(0.0, 0.45, vUv.y));
      sky = mix(sky, zenithColor, smoothstep(0.45, 1.0, vUv.y));

      // 2. Cosmic Nebula Dust Clouds
      vec2 nebUv1 = vUv * vec2(2.4, 1.6) + vec2(uTime * 0.003, uTime * 0.001);
      float neb1 = fbm(nebUv1);
      vec2 nebUv2 = vUv * vec2(3.6, 2.2) - vec2(uTime * 0.002, uTime * 0.003) + vec2(1.7, 3.1);
      float neb2 = fbm(nebUv2);

      vec3 nebMagenta = vec3(0.18, 0.06, 0.22) * smoothstep(0.38, 0.78, neb1) * 0.55;
      vec3 nebCyan    = vec3(0.04, 0.14, 0.22) * smoothstep(0.42, 0.82, neb2) * 0.50;
      sky += nebMagenta + nebCyan;

      // 3. Multi-Layer Starfield (Dense background, medium stars, prominent bright stars)
      // Layer 1: Dense micro stars
      vec3 stars1 = renderStarLayer(vUv, 64.0, 2.2, 0.5) * 0.75;
      
      // Layer 2: Medium glistening stars
      vec3 stars2 = renderStarLayer(vUv + vec2(0.31, 0.77), 32.0, 3.5, 0.85) * 0.95;

      // Layer 3: Prominent large focal stars with flares
      vec3 stars3 = renderStarLayer(vUv + vec2(0.58, 0.19), 14.0, 1.8, 1.35) * 1.30;

      // 4. Subtle Meteor / Shooting Star Streak
      float shootCycle = fract(uTime * 0.08); // Repeats every ~12.5 seconds
      if (shootCycle < 0.22) {
        float shootT = shootCycle / 0.22;
        vec2 shootStart = vec2(0.85, 0.90);
        vec2 shootDir = normalize(vec2(-1.6, -1.0));
        vec2 currentShootHead = shootStart + shootDir * (shootT * 0.9);
        
        vec2 toHead = vUv - currentShootHead;
        float proj = dot(toHead, shootDir);
        vec2 perp = toHead - proj * shootDir;
        
        // Meteor head + glowing tail behind it
        if (proj < 0.0 && proj > -0.22) {
          float tailFade = smoothstep(-0.22, 0.0, proj);
          float widthGlow = exp(-length(perp) * 350.0);
          vec3 shootColor = mix(vec3(0.6, 0.9, 1.0), vec3(1.0, 1.0, 1.0), tailFade);
          sky += shootColor * widthGlow * tailFade * (1.0 - shootT) * 1.8;
        }
      }

      vec3 finalColor = sky + stars1 + stars2 + stars3;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
};
