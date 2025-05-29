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

  async initializeAudio(): Promise<void> {
    console.log('Initializing audio, current state:', this.audioContext.state);
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
      console.log('AudioContext resumed, new state:', this.audioContext.state);
    }
  }

  // Kick drum - low-frequency sine wave
  generateKick(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 60 * Math.exp(-t * 15); // Pitch envelope
      const amplitude = Math.exp(-t * 8); // Volume envelope
      data[i] = amplitude * Math.sin(2 * Math.PI * frequency * t) * 0.8;
    }
    return buffer;
  }

  // Snare drum - filtered noise
  generateSnare(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.15;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noise = (Math.random() * 2 - 1) * 0.5;
      const tone = Math.sin(2 * Math.PI * 200 * t) * 0.3;
      const envelope = Math.exp(-t * 20);
      data[i] = (noise + tone) * envelope;
    }
    return buffer;
  }

  // Hi-hat - high-frequency noise burst
  generateHiHat(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.1;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      const envelope = Math.exp(-t * 50);
      // High-pass filter simulation
      const filtered = noise * Math.sin(2 * Math.PI * 8000 * t) * 0.3;
      data[i] = filtered * envelope;
    }
    return buffer;
  }

  // Open hi-hat - longer noise decay
  generateOpenHiHat(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.4;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      const envelope = Math.exp(-t * 5);
      const filtered = noise * Math.sin(2 * Math.PI * 6000 * t) * 0.2;
      data[i] = filtered * envelope;
    }
    return buffer;
  }

  // Crash cymbal - wide-spectrum noise
  generateCrash(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 1.0;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      const envelope = Math.exp(-t * 2);
      // Mix multiple frequencies for shimmer
      const shimmer = Math.sin(2 * Math.PI * 5000 * t) + 
                     Math.sin(2 * Math.PI * 3000 * t) + 
                     Math.sin(2 * Math.PI * 7000 * t);
      data[i] = noise * shimmer * envelope * 0.2;
    }
    return buffer;
  }

  // Bass drum - sub-bass frequencies
  generateBassDrum(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.4;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 40 * Math.exp(-t * 10);
      const amplitude = Math.exp(-t * 6);
      data[i] = amplitude * Math.sin(2 * Math.PI * frequency * t) * 0.9;
    }
    return buffer;
  }

  // Clap - multiple noise bursts
  generateClap(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.12;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      // Create multiple bursts
      let envelope = 0;
      const burstTimes = [0.005, 0.02, 0.035, 0.05];
      burstTimes.forEach(burstTime => {
        if (t >= burstTime && t < burstTime + 0.01) {
          envelope += Math.exp(-(t - burstTime) * 300);
        }
      });
      data[i] = noise * envelope * 0.4;
    }
    return buffer;
  }

  // Tom-tom - pitched noise
  generateTom(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.3;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 100 * Math.exp(-t * 8);
      const noise = (Math.random() * 2 - 1) * 0.3;
      const tone = Math.sin(2 * Math.PI * frequency * t) * 0.7;
      const envelope = Math.exp(-t * 12);
      data[i] = (tone + noise) * envelope;
    }
    return buffer;
  }

  // Ride cymbal - metallic noise
  generateRide(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.6;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      const envelope = Math.exp(-t * 3);
      // Metallic frequencies
      const metallic = Math.sin(2 * Math.PI * 4000 * t) * 
                      Math.sin(2 * Math.PI * 3000 * t) * 
                      Math.sin(2 * Math.PI * 5000 * t);
      data[i] = noise * metallic * envelope * 0.15;
    }
    return buffer;
  }

  // Cowbell - filtered square wave
  generateCowbell(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const frequency = 800;
      const square = Math.sign(Math.sin(2 * Math.PI * frequency * t));
      const envelope = Math.exp(-t * 15);
      data[i] = square * envelope * 0.3;
    }
    return buffer;
  }

  // Vocal bass - formant-filtered low frequency
  generateVocalBass(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.25;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const fundamental = 80;
      const envelope = Math.exp(-t * 8);
      // Formant frequencies for "oo" sound
      const formant1 = Math.sin(2 * Math.PI * fundamental * t);
      const formant2 = Math.sin(2 * Math.PI * fundamental * 2 * t) * 0.5;
      const formant3 = Math.sin(2 * Math.PI * 350 * t) * 0.3;
      data[i] = (formant1 + formant2 + formant3) * envelope * 0.6;
    }
    return buffer;
  }

  // Vocal percussion - shaped noise
  generateVocalPerc(): AudioBuffer {
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.1;
    const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      const envelope = Math.exp(-t * 40);
      // Shape noise with formant-like filtering
      const shaped = noise * Math.sin(2 * Math.PI * 1500 * t) * 0.7;
      data[i] = shaped * envelope;
    }
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
      { name: 'Ride', color: 'sound-cyan', generate: () => this.generateRide() },
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
