import { Howl } from 'howler';

/**
 * Calm & Cozy Sound & Music Engine for HANAN//OS
 * Purely relaxing, peaceful, soothing ambient music:
 * - Ultra-gentle Rhodes & soft piano chords
 * - Peaceful rain & warm tape warmth
 * - Generative ambient pads & pentatonic chimes
 * - Absolutely no rock, harsh drums, or abrasive sounds
 */

export interface TrackInfo {
  id: string;
  title: string;
  artist: string;
  genre: string;
  src?: string;
  duration: string;
}

export const COZY_TRACKS: TrackInfo[] = [
  {
    id: 'track-1',
    title: 'Warm Rain & Soft Piano',
    artist: 'Hanan Calm Lounge (CC0)',
    genre: 'Gentle Lo-Fi Piano & Rain',
    duration: '∞ Continuous',
  },
  {
    id: 'track-2',
    title: 'Sleepy Rhodes & Warm Vinyl',
    artist: 'Cozy Study Sanctuary',
    genre: 'Soft Mellow Electric Piano',
    duration: '∞ Continuous',
  },
  {
    id: 'track-3',
    title: 'Midnight Ambient Clouds',
    artist: 'Deep Focus & Relaxation',
    genre: 'Ethereal Warm Floating Pads',
    duration: '∞ Continuous',
  },
  {
    id: 'track-4',
    title: 'Zen Wind Chimes & Stream',
    artist: 'Peaceful Meditation Garden',
    genre: 'Soft Pentatonic Bells & Breeze',
    duration: '∞ Continuous',
  },
];

type AudioStateListener = (state: {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTrackIndex: number;
  currentTrack: TrackInfo;
}) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private musicVolume: number = 0.5;
  private currentTrackIndex: number = 0;
  private isMusicPlaying: boolean = true;
  private currentHowl: Howl | null = null;

  // Generative Cozy Sound Nodes
  private isProceduralPlaying: boolean = false;
  private lofiGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private rainNode: AudioBufferSourceNode | null = null;
  private lofiInterval: number | null = null;

  // Event Listeners
  private listeners: Set<AudioStateListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const unlockAudio = () => {
        this.initContext();
        if (this.isMusicPlaying && !this.isProceduralPlaying) {
          this.playMusic(this.currentTrackIndex);
        }
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
      window.addEventListener('touchstart', unlockAudio, { once: true });
    }
  }

  public subscribe(listener: AudioStateListener): () => void {
    this.listeners.add(listener);
    this.notifyState();
    return () => this.listeners.delete(listener);
  }

  private notifyState() {
    const state = {
      isPlaying: this.isMusicPlaying,
      isMuted: this.isMuted,
      volume: this.musicVolume,
      currentTrackIndex: this.currentTrackIndex,
      currentTrack: COZY_TRACKS[this.currentTrackIndex],
    };
    this.listeners.forEach((l) => l(state));
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  /* ----------------------------------------------------
     CALM & COZY MUSIC CONTROLS
  ---------------------------------------------------- */
  public toggleMusic(): boolean {
    if (this.isMusicPlaying) {
      this.pauseMusic();
    } else {
      this.playMusic();
    }
    return this.isMusicPlaying;
  }

  public playMusic(trackIndex?: number) {
    this.initContext();
    if (trackIndex !== undefined && trackIndex >= 0 && trackIndex < COZY_TRACKS.length) {
      this.currentTrackIndex = trackIndex;
    }

    this.isMusicPlaying = true;
    this.stopHowler();
    this.stopProcedural();
    this.startCozyMood(this.currentTrackIndex);

    this.notifyState();
  }

  public pauseMusic() {
    this.isMusicPlaying = false;
    this.stopHowler();
    this.stopProcedural();
    this.notifyState();
  }

  public nextTrack() {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % COZY_TRACKS.length;
    if (this.isMusicPlaying) {
      this.playMusic(this.currentTrackIndex);
    } else {
      this.notifyState();
    }
  }

  public prevTrack() {
    this.currentTrackIndex =
      (this.currentTrackIndex - 1 + COZY_TRACKS.length) % COZY_TRACKS.length;
    if (this.isMusicPlaying) {
      this.playMusic(this.currentTrackIndex);
    } else {
      this.notifyState();
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    if (this.lofiGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.lofiGain.gain.cancelScheduledValues(now);
      this.lofiGain.gain.linearRampToValueAtTime(
        this.isMuted ? 0 : this.musicVolume * 0.16,
        now + 0.1
      );
    }
    if (this.rainGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.rainGain.gain.cancelScheduledValues(now);
      this.rainGain.gain.linearRampToValueAtTime(
        this.isMuted ? 0 : this.musicVolume * 0.04,
        now + 0.1
      );
    }
    this.notifyState();
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.lofiGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.lofiGain.gain.cancelScheduledValues(now);
      this.lofiGain.gain.linearRampToValueAtTime(
        this.isMuted ? 0 : this.musicVolume * 0.16,
        now + 0.15
      );
    }
    if (this.rainGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.rainGain.gain.cancelScheduledValues(now);
      this.rainGain.gain.linearRampToValueAtTime(
        this.isMuted ? 0 : this.musicVolume * 0.04,
        now + 0.15
      );
    }
    this.notifyState();
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public getMusicState() {
    return {
      isPlaying: this.isMusicPlaying,
      isMuted: this.isMuted,
      volume: this.musicVolume,
      currentTrackIndex: this.currentTrackIndex,
      currentTrack: COZY_TRACKS[this.currentTrackIndex],
    };
  }

  private stopHowler() {
    if (this.currentHowl) {
      this.currentHowl.stop();
      this.currentHowl.unload();
      this.currentHowl = null;
    }
  }

  /* ----------------------------------------------------
     CALM & COZY PROCEDURAL SOUNDSCAPE ENGINE
     (100% Peaceful Piano, Rhodes, Rain, Warm Pads & Chimes)
  ---------------------------------------------------- */
  private startCozyMood(moodIndex: number) {
    this.stopProcedural();
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      this.lofiGain = this.ctx.createGain();
      this.lofiGain.gain.setValueAtTime(0.0001, now);
      this.lofiGain.gain.linearRampToValueAtTime(
        this.isMuted ? 0 : this.musicVolume * 0.16,
        now + 1.2
      );

      // Warm analog warmth lowpass filter (removes any harsh treble)
      const warmthFilter = this.ctx.createBiquadFilter();
      warmthFilter.type = 'lowpass';
      warmthFilter.frequency.setValueAtTime(650, now);
      warmthFilter.Q.setValueAtTime(0.8, now);

      this.lofiGain.connect(warmthFilter);
      warmthFilter.connect(this.ctx.destination);

      // Cozy Soft Rain Windowpane Ambiance (for mood 0, 1, and 3)
      if (moodIndex !== 2) {
        const bufferSize = this.ctx.sampleRate * 2;
        const rainBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const rainOutput = rainBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          rainOutput[i] = (b0 + b1 + b2) * 0.025;
        }

        this.rainNode = this.ctx.createBufferSource();
        this.rainNode.buffer = rainBuffer;
        this.rainNode.loop = true;

        this.rainGain = this.ctx.createGain();
        this.rainGain.gain.setValueAtTime(this.isMuted ? 0 : this.musicVolume * 0.035, now);

        const rainFilter = this.ctx.createBiquadFilter();
        rainFilter.type = 'bandpass';
        rainFilter.frequency.setValueAtTime(450, now);
        rainFilter.Q.setValueAtTime(0.6, now);

        this.rainNode.connect(rainFilter);
        rainFilter.connect(this.rainGain);
        this.rainGain.connect(this.ctx.destination);
        this.rainNode.start(now);
      }

      // Chord Progressions per mood
      // Mood 0: Warm Rain & Soft Piano (Cmaj9, Am9, Fmaj7, G7sus4)
      // Mood 1: Sleepy Rhodes & Vinyl (Fmaj7, Em7, Dm9, Cmaj7)
      // Mood 2: Midnight Ambient Clouds (Ethereal Floating Major 9th Pads)
      // Mood 3: Zen Wind Chimes & Stream (D Pentatonic, Soft Chimes)
      const chordSets: number[][][] = [
        [
          [130.81, 196.00, 246.94, 293.66, 392.00], // Cmaj9
          [110.00, 164.81, 220.00, 261.63, 329.63], // Am9
          [174.61, 220.00, 261.63, 329.63, 392.00], // Fmaj7
          [98.00, 146.83, 220.00, 261.63, 293.66],  // G7sus4
        ],
        [
          [174.61, 261.63, 329.63, 392.00, 440.00], // Fmaj7#11
          [164.81, 246.94, 293.66, 392.00, 493.88], // Em9
          [146.83, 220.00, 261.63, 329.63, 440.00], // Dm9
          [130.81, 196.00, 246.94, 261.63, 329.63], // Cmaj9
        ],
        [
          [65.41, 130.81, 196.00, 246.94, 293.66, 392.00], // Deep Cmaj9 Cloud
          [87.31, 174.61, 220.00, 261.63, 329.63, 523.25], // Deep Fmaj7 Cloud
          [73.42, 146.83, 220.00, 261.63, 329.63, 440.00], // Deep Dm9 Cloud
          [98.00, 146.83, 196.00, 246.94, 293.66, 392.00], // Deep Gsus Cloud
        ],
        [
          [146.83, 220.00, 293.66, 369.99, 440.00], // D Maj Pentatonic
          [110.00, 164.81, 220.00, 293.66, 329.63], // A Sus Pentatonic
          [130.81, 196.00, 261.63, 293.66, 392.00], // C Pentatonic
          [98.00, 146.83, 220.00, 293.66, 440.00],  // G Pentatonic
        ],
      ];

      const currentProgression = chordSets[moodIndex % chordSets.length];
      let chordIndex = 0;

      const playNextCozyBar = () => {
        if (!this.ctx || !this.isProceduralPlaying || !this.lofiGain) return;
        const cNow = this.ctx.currentTime;
        const notes = currentProgression[chordIndex % currentProgression.length];
        chordIndex++;

        // Smooth warm velvety chord envelope
        notes.forEach((freq, nIdx) => {
          if (!this.ctx || !this.lofiGain) return;
          const osc = this.ctx.createOscillator();
          const noteGain = this.ctx.createGain();

          // Soft sine / warm triangle
          osc.type = moodIndex === 2 ? 'sine' : nIdx === 0 ? 'sine' : 'triangle';
          const gentleDetune = (Math.random() - 0.5) * 3.5;
          osc.frequency.setValueAtTime(freq, cNow);
          osc.detune.setValueAtTime(gentleDetune, cNow);

          // Staggered arpeggiated piano touch
          const stagger = nIdx * (moodIndex === 2 ? 0.15 : 0.08);
          const chordDuration = moodIndex === 2 ? 6.5 : 4.8;

          noteGain.gain.setValueAtTime(0.0001, cNow + stagger);
          noteGain.gain.linearRampToValueAtTime(0.065 / (nIdx + 1), cNow + stagger + 0.18);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, cNow + stagger + chordDuration);

          osc.connect(noteGain);
          noteGain.connect(this.lofiGain);

          osc.start(cNow + stagger);
          osc.stop(cNow + stagger + chordDuration + 0.5);
        });

        // Gentle Pentatonic Melody Chime (Soft Bell Note)
        const melodyPitches = [329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99];
        const randomPitch = melodyPitches[Math.floor(Math.random() * melodyPitches.length)];

        const chimeOsc = this.ctx.createOscillator();
        const chimeGain = this.ctx.createGain();

        chimeOsc.type = 'sine';
        chimeOsc.frequency.setValueAtTime(randomPitch, cNow + 1.2);

        chimeGain.gain.setValueAtTime(0.0001, cNow + 1.2);
        chimeGain.gain.linearRampToValueAtTime(0.028, cNow + 1.28);
        chimeGain.gain.exponentialRampToValueAtTime(0.0001, cNow + 4.2);

        chimeOsc.connect(chimeGain);
        chimeGain.connect(this.lofiGain);

        chimeOsc.start(cNow + 1.2);
        chimeOsc.stop(cNow + 4.5);
      };

      playNextCozyBar();
      const intervalMs = moodIndex === 2 ? 5500 : 4200;
      this.lofiInterval = window.setInterval(playNextCozyBar, intervalMs);
      this.isProceduralPlaying = true;
    } catch {
      // Ignore
    }
  }

  private stopProcedural() {
    if (this.lofiInterval) {
      clearInterval(this.lofiInterval);
      this.lofiInterval = null;
    }
    if (this.rainNode) {
      try {
        this.rainNode.stop();
        this.rainNode.disconnect();
      } catch {}
      this.rainNode = null;
    }
    this.isProceduralPlaying = false;
  }

  /* ----------------------------------------------------
     UI SOUND EFFECTS (Keyclicks, Chirps, Whoosh)
  ---------------------------------------------------- */
  public startAmbient() {
    // Ambient 60Hz hum permanently removed
  }

  public playKeyClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freq = 620 + Math.random() * 240;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);

      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {}
  }

  public playWhoosh() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(360, now + 0.22);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.5);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(480, now);

      // 40% reduced volume for gentle, comfortable zoom transitions
      gain.gain.setValueAtTime(0.0006, now);
      gain.gain.linearRampToValueAtTime(0.03, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.6);
    } catch {}
  }

  public playChirp(type: 'success' | 'alert' | 'enter' = 'enter') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.07); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.14); // G5
        gain.gain.setValueAtTime(0.045, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      } else if (type === 'alert') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(440, now + 0.08);
        gain.gain.setValueAtTime(0.035, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.09);
        gain.gain.setValueAtTime(0.03, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      }

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
