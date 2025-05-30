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
    // Define probability weights for each sound type
    // Higher values = more likely to appear
    const soundWeights = [
      0.35, // Kick - high probability, backbone of most patterns
      0.25, // Snare - high probability, essential rhythm element
      0.40, // Hi-Hat - highest probability, provides consistent rhythm
      0.15, // Open HH - moderate probability, used for accents
      0.08, // Crash - low probability, used sparingly for emphasis
      0.20, // Bass - moderate probability, adds low-end variety
      0.12, // Clap - low-moderate probability, rhythmic accent
      0.10, // Tom - low probability, fills and accents
      0.08, // Shaker - low probability, rhythmic texture element
      0.06, // Cowbell - very low probability, special accent
      0.10, // V-Bass - low probability, creative element
      0.07, // V-Perc - very low probability, creative element
    ];

    // Enhanced pattern generation with musical logic
    this.state.pattern = this.state.pattern.map((track, trackIndex) => 
      track.map((_, stepIndex) => {
        const baseWeight = soundWeights[trackIndex];
        let adjustedWeight = baseWeight;

        // Boost probability for strong beats (1, 5, 9, 13) for kick and snare
        if ((trackIndex === 0 || trackIndex === 1) && stepIndex % 4 === 0) {
          adjustedWeight *= 2.0; // Double chance on strong beats
        }
        
        // Boost hi-hat probability on off-beats for better groove
        if (trackIndex === 2 && stepIndex % 2 === 1) {
          adjustedWeight *= 1.5; // 50% boost on off-beats
        }
        
        // Boost shaker probability on 16th note subdivisions for rhythmic texture
        if (trackIndex === 8 && stepIndex % 2 === 1) {
          adjustedWeight *= 1.8; // Shaker works well on off-beats
        }
        
        // Reduce probability for accents (crash, cowbell) on weak beats
        if ((trackIndex === 4 || trackIndex === 9) && stepIndex % 4 !== 0) {
          adjustedWeight *= 0.3; // Reduce to 30% on weak beats
        }
        
        // Prevent too many simultaneous low-frequency sounds (kick + bass)
        if (trackIndex === 5 && stepIndex % 4 === 0) {
          adjustedWeight *= 0.4; // Reduce bass on strong beats where kick is likely
        }
        
        return Math.random() < adjustedWeight;
      })
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
