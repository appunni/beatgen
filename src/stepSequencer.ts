import { SoundGenerator } from './soundGenerator';
import type { SoundConfig } from './soundGenerator';

export interface SequencerState {
  isPlaying: boolean;
  currentStep: number;
  bpm: number;
  volume: number;
  pattern: boolean[][];
}

export class StepSequencer {
  private soundGenerator: SoundGenerator;
  private sounds: { [key: string]: AudioBuffer } = {};
  private soundConfigs: SoundConfig[];
  private state: SequencerState;
  private intervalId: number | null = null;
  private callbacks: {
    onStepChange?: (step: number) => void;
    onStateChange?: (state: SequencerState) => void;
  } = {};

  constructor() {
    this.soundGenerator = new SoundGenerator();
    this.soundConfigs = this.soundGenerator.getSoundConfigs();
    
    // Initialize 12 tracks x 16 steps pattern
    this.state = {
      isPlaying: false,
      currentStep: 0,
      bpm: 120,
      volume: 0.7,
      pattern: Array(12).fill(null).map(() => Array(16).fill(false))
    };

    // Don't initialize sounds here - wait for async initialization
  }

  async initialize(): Promise<void> {
    console.log('Initializing step sequencer...');
    try {
      await this.soundGenerator.initializeAudio();
      console.log('Audio context initialized');
      this.initializeSounds();
      console.log('Sounds generated successfully');
    } catch (error) {
      console.error('Error initializing step sequencer:', error);
      throw error;
    }
  }

  private initializeSounds(): void {
    this.soundConfigs.forEach((config, index) => {
      this.sounds[index] = config.generate(this.soundGenerator.context);
    });
  }

  toggleStep(track: number, step: number): void {
    if (track >= 0 && track < 12 && step >= 0 && step < 16) {
      this.state.pattern[track][step] = !this.state.pattern[track][step];
      this.notifyStateChange();
    }
  }

  togglePlayback(): void {
    if (this.state.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }

  play(): void {
    if (!this.state.isPlaying) {
      this.state.isPlaying = true;
      this.startSequencer();
      this.notifyStateChange();
    }
  }

  stop(): void {
    if (this.state.isPlaying) {
      this.state.isPlaying = false;
      this.state.currentStep = 0;
      if (this.intervalId !== null) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      this.notifyStateChange();
      this.notifyStepChange();
    }
  }

  private startSequencer(): void {
    const stepDuration = (60 / this.state.bpm / 4) * 1000; // 16th notes in ms
    
    this.intervalId = window.setInterval(() => {
      this.playCurrentStep();
      this.state.currentStep = (this.state.currentStep + 1) % 16;
      this.notifyStepChange();
    }, stepDuration);
  }

  private playCurrentStep(): void {
    this.state.pattern.forEach((track, trackIndex) => {
      if (track[this.state.currentStep]) {
        const buffer = this.sounds[trackIndex];
        if (buffer) {
          this.soundGenerator.playSound(buffer, this.state.volume);
        }
      }
    });
  }

  setBPM(bpm: number): void {
    this.state.bpm = Math.max(60, Math.min(200, bpm));
    if (this.state.isPlaying) {
      this.stop();
      this.play();
    }
    this.notifyStateChange();
  }

  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    this.notifyStateChange();
  }

  clearPattern(): void {
    this.state.pattern = Array(12).fill(null).map(() => Array(16).fill(false));
    this.notifyStateChange();
  }

  randomizePattern(): void {
    this.state.pattern = this.state.pattern.map(track => 
      track.map(() => Math.random() < 0.2) // 20% chance for each step
    );
    this.notifyStateChange();
  }

  presetPattern(name: string): void {
    this.clearPattern();
    
    switch (name) {
      case 'basic':
        // Kick on 1, 5, 9, 13
        this.state.pattern[0] = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
        // Snare on 5, 13
        this.state.pattern[1] = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
        // Hi-hat on off-beats
        this.state.pattern[2] = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
        break;
      
      case 'funk':
        // Syncopated kick
        this.state.pattern[0] = [true, false, false, true, false, false, true, false, false, true, false, false, true, false, false, false];
        // Snare on 5, 13
        this.state.pattern[1] = [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false];
        // Active hi-hat
        this.state.pattern[2] = [true, true, false, true, false, true, false, true, true, false, true, false, false, true, false, true];
        // Claps
        this.state.pattern[6] = [false, false, false, false, false, false, false, true, false, false, false, false, false, false, false, true];
        break;
      
      case 'techno':
        // Four-on-the-floor kick
        this.state.pattern[0] = [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false];
        // Open hi-hat on off-beats
        this.state.pattern[3] = [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false];
        // Closed hi-hat on all 8th notes
        this.state.pattern[2] = [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true];
        break;
    }
    
    this.notifyStateChange();
  }

  onStepChange(callback: (step: number) => void): void {
    this.callbacks.onStepChange = callback;
  }

  onStateChange(callback: (state: SequencerState) => void): void {
    this.callbacks.onStateChange = callback;
  }

  private notifyStepChange(): void {
    if (this.callbacks.onStepChange) {
      this.callbacks.onStepChange(this.state.currentStep);
    }
  }

  private notifyStateChange(): void {
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange({ ...this.state });
    }
  }

  getState(): SequencerState {
    return { ...this.state };
  }

  getSoundConfigs(): SoundConfig[] {
    return this.soundConfigs;
  }

  playSound(trackIndex: number): void {
    const buffer = this.sounds[trackIndex];
    if (buffer) {
      this.soundGenerator.playSound(buffer, this.state.volume);
    }
  }
}
