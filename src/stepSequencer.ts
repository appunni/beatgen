import { SoundGenerator } from './soundGenerator';
import type { SoundConfig } from './soundGenerator';

export interface SequencerState {
  isPlaying: boolean;
  currentStep: number;
  bpm: number;
  volume: number;
  pattern: boolean[][];
  isRecording: boolean;
  recordingDuration: number;
}

export class StepSequencer {
  private soundGenerator: SoundGenerator;
  private sounds: { [key: string]: AudioBuffer } = {};
  private soundConfigs: SoundConfig[];
  private state: SequencerState;
  private intervalId: number | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTime: number = 0;
  private recordingStream: MediaStream | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private masterGainNode: GainNode | null = null;
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
      pattern: Array(12).fill(null).map(() => Array(16).fill(false)),
      isRecording: false,
      recordingDuration: 0
    };

    // Don't initialize sounds here - wait for async initialization
  }

  async initialize(): Promise<void> {
    console.log('Initializing step sequencer...');
    try {
      await this.soundGenerator.initializeAudio();
      console.log('Audio context initialized');
      this.initializeSounds();
      this.setupAudioNodes();
      console.log('Audio nodes and sounds initialized successfully');
    } catch (error) {
      console.error('Error initializing step sequencer:', error);
      throw error;
    }
  }

  private setupAudioNodes(): void {
    const audioContext = this.soundGenerator.context;
    
    // Create master gain node for volume control
    this.masterGainNode = audioContext.createGain();
    this.masterGainNode.gain.value = this.state.volume;
    
    // Create destination node for recording
    this.destinationNode = audioContext.createMediaStreamDestination();
    this.recordingStream = this.destinationNode.stream;
    
    // Connect master gain to both the main output and recording destination
    this.masterGainNode.connect(audioContext.destination);
    this.masterGainNode.connect(this.destinationNode);
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
          this.playSoundThroughMaster(buffer);
        }
      }
    });
  }

  private playSoundThroughMaster(buffer: AudioBuffer): void {
    const audioContext = this.soundGenerator.context;
    const source = audioContext.createBufferSource();
    
    source.buffer = buffer;
    if (this.masterGainNode) {
      source.connect(this.masterGainNode);
    } else {
      // Fallback to direct connection if master gain not set up
      const gainNode = audioContext.createGain();
      gainNode.gain.value = this.state.volume;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
    }
    
    source.start();
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
    if (this.masterGainNode) {
      this.masterGainNode.gain.value = this.state.volume;
    }
    this.notifyStateChange();
  }

  // Recording functionality
  startRecording(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state.isRecording || !this.recordingStream) {
        reject(new Error('Already recording or recording not available'));
        return;
      }

      try {
        // Check if MediaRecorder is supported
        if (!window.MediaRecorder) {
          reject(new Error('MediaRecorder not supported in this browser'));
          return;
        }

        this.recordedChunks = [];
        this.mediaRecorder = new MediaRecorder(this.recordingStream, {
          mimeType: this.getSupportedMimeType()
        });

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.recordedChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          console.log('Recording stopped, chunks:', this.recordedChunks.length);
        };

        this.mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
          this.stopRecording();
        };

        this.mediaRecorder.start(100); // Collect data every 100ms
        this.state.isRecording = true;
        this.recordingStartTime = Date.now();
        this.state.recordingDuration = 0;
        
        // Start duration timer
        this.startRecordingTimer();
        
        this.notifyStateChange();
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.state.isRecording || !this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.state.isRecording = false;
      this.state.recordingDuration = 0;
      
      this.mediaRecorder.onstop = () => {
        if (this.recordedChunks.length > 0) {
          const blob = new Blob(this.recordedChunks, {
            type: this.getSupportedMimeType()
          });
          resolve(blob);
        } else {
          resolve(null);
        }
      };

      this.mediaRecorder.stop();
      this.notifyStateChange();
    });
  }

  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/mpeg'
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm'; // fallback
  }

  private startRecordingTimer(): void {
    const updateTimer = () => {
      if (this.state.isRecording) {
        this.state.recordingDuration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
        this.notifyStateChange();
        setTimeout(updateTimer, 1000);
      }
    };
    updateTimer();
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
      this.playSoundThroughMaster(buffer);
    }
  }
}
