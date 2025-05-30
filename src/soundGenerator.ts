export interface SoundConfig {
  name: string;
  color: string;
  generate: (ctx: AudioContext) => AudioBuffer;
}

export class SoundGenerator {
  private audioContext: AudioContext;

  constructor() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioContext created, state:', this.audioContext.state);
    } catch (error) {
      console.error('Failed to create AudioContext:', error);
      throw error;
    }
  }

  // Helper function for ADSR envelope
  private createADSREnvelope(
    t: number, 
    duration: number, 
    attack: number, 
    decay: number, 
    sustain: number, 
    release: number
  ): number {
    if (t < attack) {
      return t / attack;
    } else if (t < attack + decay) {
      return 1 - (1 - sustain) * (t - attack) / decay;
    } else if (t < duration - release) {
      return sustain;
    } else {
      return sustain * (duration - t) / release;
    }
  }

  // Helper function for low-pass filter simulation
  private lowPassFilter(samples: Float32Array, cutoff: number, resonance: number = 1): void {
    let y1 = 0, y2 = 0, x1 = 0, x2 = 0;
    const sampleRate = this.audioContext.sampleRate;
    const nyquist = sampleRate * 0.5;
    const frequency = Math.min(cutoff, nyquist);
    const c = 1.0 / Math.tan(Math.PI * frequency / sampleRate);
    const a1 = 1.0 / (1.0 + resonance * c + c * c);
    const a2 = 2 * a1;
    const a3 = a1;
    const b1 = 2.0 * (1.0 - c * c) * a1;
    const b2 = (1.0 - resonance * c + c * c) * a1;

    for (let i = 0; i < samples.length; i++) {
      const x0 = samples[i];
      const y0 = a1 * x0 + a2 * x1 + a3 * x2 - b1 * y1 - b2 * y2;
      samples[i] = y0;
      x2 = x1; x1 = x0; y2 = y1; y1 = y0;
    }
  }

  // Helper function for high-pass filter simulation
  private highPassFilter(samples: Float32Array, cutoff: number): void {
    let y1 = 0, x1 = 0;
    const rc = 1.0 / (cutoff * 2 * Math.PI);
    const dt = 1.0 / this.audioContext.sampleRate;
    const alpha = rc / (rc + dt);

    for (let i = 0; i < samples.length; i++) {
      const x0 = samples[i];
      const y0 = alpha * (y1 + x0 - x1);
      samples[i] = y0;
      x1 = x0; y1 = y0;
    }
  }

  async initializeAudio(): Promise<void> {
    console.log('Initializing audio, current state:', this.audioContext.state);
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('AudioContext resumed, new state:', this.audioContext.state);
    }
  }

  // Kick drum - enhanced with sub-bass and punch
  generateKick(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.4;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < leftData.length; i++) {
      const t = i / sampleRate;
      // Multi-layered kick with pitch modulation
      const fundamental = 55 * Math.exp(-t * 20); // Pitch sweep
      const subBass = 35 * Math.exp(-t * 15); // Sub-bass layer
      const click = 200 * Math.exp(-t * 80); // Attack click
      
      // ADSR envelope with punch
      const envelope = this.createADSREnvelope(t, duration, 0.002, 0.05, 0.3, 0.2);
      const punchEnv = Math.exp(-t * 25); // Extra punch envelope
      
      // Combine oscillators
      const kickWave = Math.sin(2 * Math.PI * fundamental * t) * 0.7 +
                      Math.sin(2 * Math.PI * subBass * t) * 0.4 +
                      Math.sin(2 * Math.PI * click * t) * 0.2 * Math.exp(-t * 50);
      
      const finalSample = kickWave * envelope * punchEnv * 0.9;
      leftData[i] = finalSample;
      rightData[i] = finalSample * 0.98; // Slight stereo width
    }
    
    // Apply subtle low-pass filtering for warmth
    this.lowPassFilter(leftData, 120);
    this.lowPassFilter(rightData, 120);
    
    return buffer;
  }

  // Snare drum - enhanced with layered noise and tone
  generateSnare(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.18;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < leftData.length; i++) {
      const t = i / sampleRate;
      
      // Multi-layered snare
      const noise = (Math.random() * 2 - 1) * 0.6; // White noise
      const tone1 = Math.sin(2 * Math.PI * 200 * t) * 0.4; // Body tone
      const tone2 = Math.sin(2 * Math.PI * 350 * t) * 0.2; // Harmonics
      const rattle = (Math.random() * 2 - 1) * 0.3 * Math.sin(2 * Math.PI * 150 * t); // Snare rattle
      
      // Sharp attack envelope with longer tail
      const envelope = this.createADSREnvelope(t, duration, 0.001, 0.02, 0.1, 0.1);
      const noiseEnv = Math.exp(-t * 25); // Faster decay for noise
      
      const snareSound = (noise * noiseEnv + tone1 + tone2 + rattle) * envelope;
      leftData[i] = snareSound * 0.7;
      rightData[i] = snareSound * 0.72; // Slight stereo difference
    }
    
    // Band-pass filtering for snare character
    this.highPassFilter(leftData, 100);
    this.highPassFilter(rightData, 100);
    this.lowPassFilter(leftData, 8000);
    this.lowPassFilter(rightData, 8000);
    
    return buffer;
  }

  // Hi-hat - crisp high-frequency noise with metallic character
  generateHiHat(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.08;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < leftData.length; i++) {
      const t = i / sampleRate;
      
      // Layered metallic noise
      const noise = Math.random() * 2 - 1;
      const metallic1 = Math.sin(2 * Math.PI * 8000 * t) * Math.sin(2 * Math.PI * 12000 * t);
      const metallic2 = Math.sin(2 * Math.PI * 6000 * t) * Math.sin(2 * Math.PI * 15000 * t);
      
      // Very sharp envelope
      const envelope = Math.exp(-t * 60);
      const clickEnv = Math.exp(-t * 200); // Initial click
      
      const hihatSound = (noise * 0.7 + metallic1 * 0.3 + metallic2 * 0.2) * envelope + 
                        noise * clickEnv * 0.3;
      
      leftData[i] = hihatSound * 0.4;
      rightData[i] = hihatSound * 0.42; // Slight stereo width
    }
    
    // High-pass filter for crispness
    this.highPassFilter(leftData, 6000);
    this.highPassFilter(rightData, 6000);
    
    return buffer;
  }

  // Open hi-hat - clean filtered noise
  generateOpenHiHat(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < leftData.length; i++) {
      const t = i / sampleRate;
      
      // Significantly reduced noise for much cleaner sound
      const noise = (Math.random() * 2 - 1) * 0.3;
      
      // Basic envelope - quick attack, exponential decay
      const envelope = Math.exp(-t * 4);
      
      const hihatSound = noise * envelope;
      
      leftData[i] = hihatSound * 0.15;
      rightData[i] = hihatSound * 0.15;
    }
    
    // Filter to hi-hat frequency range
    this.highPassFilter(leftData, 5000);
    this.highPassFilter(rightData, 5000);
    this.lowPassFilter(leftData, 12000);
    this.lowPassFilter(rightData, 12000);
    
    return buffer;
  }

  // Crash cymbal - clean filtered noise
  generateCrash(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.5;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < leftData.length; i++) {
      const t = i / sampleRate;
      
      // Significantly reduced noise with simple envelope
      const noise = (Math.random() * 2 - 1) * 0.3;
      
      // Simple exponential decay
      const envelope = Math.exp(-t * 3);
      
      const crashSound = noise * envelope;
      
      leftData[i] = crashSound * 0.2;
      rightData[i] = crashSound * 0.2;
    }
    
    // Band-pass filtering for cymbal character
    this.highPassFilter(leftData, 2000);
    this.highPassFilter(rightData, 2000);
    this.lowPassFilter(leftData, 12000);
    this.lowPassFilter(rightData, 12000);
    
    return buffer;
  }

  // Bass drum - deep sub-bass with controlled resonance
  generateBassDrum(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.5;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < leftData.length; i++) {
      const t = i / sampleRate;
      
      // Deep fundamental with harmonics
      const fundamental = 35 * Math.exp(-t * 12);
      const subBass = 25 * Math.exp(-t * 8);
      const harmonic = 70 * Math.exp(-t * 20);
      
      // Resonant body modeling
      const bodyResonance = Math.sin(2 * Math.PI * 80 * t) * Math.exp(-t * 6);
      
      const envelope = this.createADSREnvelope(t, duration, 0.003, 0.08, 0.4, 0.3);
      
      const bassSound = (Math.sin(2 * Math.PI * fundamental * t) * 0.8 +
                        Math.sin(2 * Math.PI * subBass * t) * 0.5 +
                        Math.sin(2 * Math.PI * harmonic * t) * 0.3 +
                        bodyResonance * 0.2) * envelope;
      
      leftData[i] = bassSound * 0.9;
      rightData[i] = bassSound * 0.88; // Slight mono focus for bass
    }
    
    // Low-pass for warmth and sub-bass focus
    this.lowPassFilter(leftData, 100, 1.2);
    this.lowPassFilter(rightData, 100, 1.2);
    
    return buffer;
  }

  // Clap - realistic multiple-burst hand clap
  generateClap(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.15;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < leftData.length; i++) {
      const t = i / sampleRate;
      
      // Multiple micro-bursts for realistic clap
      const burstTimes = [0.003, 0.015, 0.025, 0.035, 0.045];
      let burstEnvelope = 0;
      
      burstTimes.forEach((burstTime, index) => {
        if (t >= burstTime && t < burstTime + 0.008) {
          const localT = t - burstTime;
          const intensity = 1.0 - (index * 0.15); // Decreasing intensity
          burstEnvelope += Math.exp(-localT * 400) * intensity;
        }
      });
      
      // Filtered noise with body resonance
      const noise = Math.random() * 2 - 1;
      const bodyTone = Math.sin(2 * Math.PI * 1000 * t) * 0.2;
      const highs = (Math.random() * 2 - 1) * Math.sin(2 * Math.PI * 3000 * t) * 0.3;
      
      const clapSound = (noise * 0.7 + bodyTone + highs) * burstEnvelope;
      
      // Stereo spread for natural clap width
      leftData[i] = clapSound * 0.5 * (1 + Math.random() * 0.1);
      rightData[i] = clapSound * 0.5 * (1 + Math.random() * 0.1);
    }
    
    // Band-pass for clap character
    this.highPassFilter(leftData, 200);
    this.highPassFilter(rightData, 200);
    this.lowPassFilter(leftData, 8000);
    this.lowPassFilter(rightData, 8000);
    
    return buffer;
  }

  // Tom-tom - resonant drum with realistic body
  generateTom(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.4;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < leftData.length; i++) {
      const t = i / sampleRate;
      
      // Pitched tom with harmonics
      const fundamental = 120 * Math.exp(-t * 6);
      const harmonic2 = fundamental * 1.6;
      const harmonic3 = fundamental * 2.2;
      
      // Drum body resonance
      const bodyResonance = Math.sin(2 * Math.PI * 90 * t) * Math.exp(-t * 4);
      
      // Attack noise for realistic strike
      const attackNoise = (Math.random() * 2 - 1) * Math.exp(-t * 80) * 0.3;
      
      const envelope = this.createADSREnvelope(t, duration, 0.002, 0.05, 0.4, 0.25);
      
      const tomSound = (Math.sin(2 * Math.PI * fundamental * t) * 0.7 +
                       Math.sin(2 * Math.PI * harmonic2 * t) * 0.3 +
                       Math.sin(2 * Math.PI * harmonic3 * t) * 0.15 +
                       bodyResonance * 0.4 +
                       attackNoise) * envelope;
      
      leftData[i] = tomSound * 0.6;
      rightData[i] = tomSound * 0.58; // Slight stereo difference
    }
    
    // Resonant low-pass for tom character
    this.lowPassFilter(leftData, 2000, 1.5);
    this.lowPassFilter(rightData, 2000, 1.5);
    
    return buffer;
  }

  // Shaker - realistic rhythmic percussion
  generateShaker(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.1;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < leftData.length; i++) {
      const t = i / sampleRate;
      
      // Multiple layers of high-frequency noise for realistic shaker texture
      const highFreqNoise = (Math.random() * 2 - 1) * 0.6;
      const mediumFreqNoise = (Math.random() * 2 - 1) * 0.4;
      
      // Granular texture simulation - multiple small attacks
      const granular = Math.sin(2 * Math.PI * 150 * t) * (Math.random() * 2 - 1) * 0.3;
      
      // Sharp envelope with quick decay
      const envelope = Math.exp(-t * 35);
      
      // Combine noise layers
      const shakerSound = (highFreqNoise + mediumFreqNoise * 0.7 + granular) * envelope;
      
      leftData[i] = shakerSound * 0.25;
      rightData[i] = shakerSound * 0.23; // Slight stereo difference
    }
    
    // Band-pass filtering for shaker character
    this.highPassFilter(leftData, 3000);
    this.highPassFilter(rightData, 3000);
    this.lowPassFilter(leftData, 15000);
    this.lowPassFilter(rightData, 15000);
    
    return buffer;
  }

  // Cowbell - simple metallic bell tone
  generateCowbell(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < leftData.length; i++) {
      const t = i / sampleRate;
      
      // Single bell tone
      const bell = Math.sin(2 * Math.PI * 560 * t);
      
      // Simple envelope - sharp attack, quick decay
      const envelope = Math.exp(-t * 8);
      
      const bellSound = bell * envelope;
      
      leftData[i] = bellSound * 0.5;
      rightData[i] = bellSound * 0.5;
    }
    
    // Simple band-pass for bell character
    this.highPassFilter(leftData, 400);
    this.highPassFilter(rightData, 400);
    this.lowPassFilter(leftData, 4000);
    this.lowPassFilter(rightData, 4000);
    
    return buffer;
  }

  // Vocal bass - enhanced formant synthesis for "boom" sound
  generateVocalBass(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < leftData.length; i++) {
      const t = i / sampleRate;
      
      // Fundamental pitch sweep
      const fundamental = 85 * Math.exp(-t * 8);
      
      // Multiple formants for vocal character
      const formant1 = Math.sin(2 * Math.PI * fundamental * t); // Fundamental
      const formant2 = Math.sin(2 * Math.PI * fundamental * 2 * t) * 0.6; // Second harmonic
      const formant3 = Math.sin(2 * Math.PI * 280 * t) * 0.4; // First formant (oo/uh)
      const formant4 = Math.sin(2 * Math.PI * 450 * t) * 0.2; // Second formant
      
      // Vocal texture with slight breathiness
      const breathiness = (Math.random() * 2 - 1) * 0.1 * Math.exp(-t * 20);
      
      const envelope = this.createADSREnvelope(t, duration, 0.005, 0.04, 0.4, 0.2);
      
      const vocalSound = (formant1 + formant2 + formant3 + formant4 + breathiness) * envelope;
      
      leftData[i] = vocalSound * 0.7;
      rightData[i] = vocalSound * 0.68; // Slight mono focus
    }
    
    // Formant-like filtering
    this.lowPassFilter(leftData, 800, 1.2);
    this.lowPassFilter(rightData, 800, 1.2);
    
    return buffer;
  }

  // Vocal percussion - beatbox-style "tss" or "cha" sound
  generateVocalPerc(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.12;
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    const leftData = buffer.getChannelData(0);
    const rightData = buffer.getChannelData(1);

    for (let i = 0; i < leftData.length; i++) {
      const t = i / sampleRate;
      
      // Fricative noise for "tss" sound
      const noise = Math.random() * 2 - 1;
      
      // Formant shaping for vocal character
      const formant1 = Math.sin(2 * Math.PI * 2000 * t); // High formant for "s"
      const formant2 = Math.sin(2 * Math.PI * 3500 * t) * 0.6; // Higher formant
      const tongueNoise = noise * (formant1 + formant2) * 0.4;
      
      // Lip/tongue attack
      const attack = Math.exp(-t * 100) * (Math.random() * 2 - 1) * 0.3;
      
      // Sharp envelope for percussive character
      const envelope = this.createADSREnvelope(t, duration, 0.001, 0.01, 0.1, 0.05);
      
      const vocalPercSound = (tongueNoise + attack) * envelope;
      
      leftData[i] = vocalPercSound * 0.6;
      rightData[i] = vocalPercSound * 0.58;
    }
    
    // High-pass for crisp vocal percussion
    this.highPassFilter(leftData, 1200);
    this.highPassFilter(rightData, 1200);
    this.lowPassFilter(leftData, 8000);
    this.lowPassFilter(rightData, 8000);
    
    return buffer;
  }

  getSoundConfigs(): SoundConfig[] {
    return [
      { name: 'Kick', color: 'sound-red', generate: () => this.generateKick() },
      { name: 'Snare', color: 'sound-orange', generate: () => this.generateSnare() },
      { name: 'Hi-Hat', color: 'sound-yellow', generate: () => this.generateHiHat() },
      { name: 'Open HH', color: 'sound-green', generate: () => this.generateOpenHiHat() },
      { name: 'Crash', color: 'sound-blue', generate: () => this.generateCrash() },
      { name: 'Bass', color: 'sound-purple', generate: () => this.generateBassDrum() },
      { name: 'Clap', color: 'sound-pink', generate: () => this.generateClap() },
      { name: 'Tom', color: 'sound-indigo', generate: () => this.generateTom() },
      { name: 'Shaker', color: 'sound-cyan', generate: () => this.generateShaker() },
      { name: 'Cowbell', color: 'sound-teal', generate: () => this.generateCowbell() },
      { name: 'V-Bass', color: 'sound-lime', generate: () => this.generateVocalBass() },
      { name: 'V-Perc', color: 'sound-amber', generate: () => this.generateVocalPerc() },
    ];
  }

  playSound(buffer: AudioBuffer, volume: number = 1): void {
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    source.start();
  }

  get context(): AudioContext {
    return this.audioContext;
  }
}
