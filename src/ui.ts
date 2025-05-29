import { StepSequencer } from './stepSequencer';
import type { SequencerState } from './stepSequencer';

export class UI {
  private sequencer: StepSequencer;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.sequencer = new StepSequencer();
    
    // Show a simple start screen that requires user interaction
    this.container.innerHTML = `
      <div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center p-4">
        <div class="text-center glass-effect rounded-2xl p-12 max-w-md">
          <h1 class="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            BeatGen Step Sequencer
          </h1>
          <p class="text-gray-300 mb-8">Create beats with 12 programmatically generated sounds</p>
          <button id="startBtn" class="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-purple-500/30 hover:scale-105">
            🎵 Start Making Beats
          </button>
          <p class="text-gray-400 text-sm mt-4">Click to activate audio and start the sequencer</p>
        </div>
      </div>
    `;
    
    // Set up the start button
    const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
    startBtn?.addEventListener('click', () => this.initialize());
  }

  private async initialize(): Promise<void> {
    // Show loading screen
    this.container.innerHTML = `
      <div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center p-4">
        <div class="text-center glass-effect rounded-2xl p-12 max-w-md">
          <div class="animate-spin rounded-full h-32 w-32 border-b-4 border-purple-500 mx-auto mb-4"></div>
          <h2 class="text-2xl font-bold mb-2">Loading BeatGen...</h2>
          <p class="text-gray-300">Initializing audio engine</p>
        </div>
      </div>
    `;
    
    try {
      console.log('Starting UI initialization...');
      
      // Add a timeout to prevent infinite loading
      const initPromise = this.sequencer.initialize();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Initialization timeout')), 10000)
      );
      
      await Promise.race([initPromise, timeoutPromise]);
      
      console.log('Sequencer initialized, rendering UI...');
      this.render();
      this.setupEventListeners();
      console.log('UI setup complete');
    } catch (error) {
      console.error('Failed to initialize sequencer:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.container.innerHTML = `
        <div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex items-center justify-center p-4">
          <div class="text-center glass-effect rounded-2xl p-12 max-w-md">
            <h2 class="text-2xl font-bold mb-2 text-red-400">Error Loading BeatGen</h2>
            <p class="text-gray-300 mb-4">Failed to initialize audio engine</p>
            <p class="text-gray-400 text-sm mb-4">Error: ${errorMessage}</p>
            <button onclick="location.reload()" class="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-red-500/30 hover:scale-105">
              Retry
            </button>
          </div>
        </div>
      `;
    }
  }

  private render(): void {
    const state = this.sequencer.getState();
    const soundConfigs = this.sequencer.getSoundConfigs();

    this.container.innerHTML = `
      <div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-2">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <!-- Enhanced Header + Controls Bar -->
          <div class="glass-effect rounded-xl p-4 mb-4 shadow-xl">
            <div class="flex items-center justify-between gap-4">
              
              <!-- Left: Branding + Status -->
              <div class="flex items-center gap-4">
                <div class="flex items-center gap-3">
                  <h1 class="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    BeatGen
                  </h1>
                  <span class="text-xs px-2 py-1 bg-gray-700/50 rounded-full text-gray-300 hidden sm:inline">
                    Step Sequencer
                  </span>
                </div>
              </div>

              <!-- Center: Empty space for better balance -->
              <div class="flex-1"></div>

              <!-- Right: Transport + Controls Panel -->
              <div class="flex items-center gap-4">
                
                <!-- Primary Transport Control -->
                <button id="playBtn" class="btn-transport-primary" title="Play/Pause (Space)">
                  <span class="text-2xl">${state.isPlaying ? '⏸' : '▶'}</span>
                </button>
                
                <!-- Settings Group -->
                <div class="flex items-center gap-3 px-3 py-2 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 font-medium">BPM</span>
                    <input type="range" id="bpmSlider" min="60" max="200" value="${state.bpm}" 
                           class="control-slider-modern w-16" title="Tempo: ${state.bpm} BPM">
                    <span id="bpmValue" class="text-sm font-mono text-white min-w-[3ch] font-bold">
                      ${state.bpm}
                    </span>
                  </div>
                  
                  <div class="w-px h-6 bg-gray-600"></div>
                  
                  <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 font-medium">VOL</span>
                    <input type="range" id="volumeSlider" min="0" max="100" value="${Math.round(state.volume * 100)}" 
                           class="control-slider-modern w-16" title="Master Volume: ${Math.round(state.volume * 100)}%">
                    <span id="volumeValue" class="text-xs text-gray-300 min-w-[4ch] font-mono">
                      ${Math.round(state.volume * 100)}%
                    </span>
                  </div>
                </div>

                <!-- Actions Group -->
                <div class="flex items-center gap-1">
                  <!-- Recording Controls -->
                  <button id="recordBtn" class="btn-record ${state.isRecording ? 'recording' : ''}" 
                          title="${state.isRecording ? 'Stop Recording' : 'Start Recording'}">
                    <span class="text-base">${state.isRecording ? '⏹️' : '🔴'}</span>
                  </button>
                  
                  ${state.isRecording ? `
                    <span id="recordingTimer" class="text-xs text-red-400 font-mono min-w-[3ch]">
                      ${Math.floor(state.recordingDuration / 60)}:${(state.recordingDuration % 60).toString().padStart(2, '0')}
                    </span>
                  ` : ''}
                  
                  <div id="downloadSection" class="flex items-center gap-1" style="display: none;">
                    <button id="downloadBtn" class="btn-download" title="Download Recording">
                      <span class="text-base">⬇️</span>
                    </button>
                  </div>
                  
                  <div class="w-px h-6 bg-gray-600 mx-2"></div>
                  
                  <button id="clearBtn" class="btn-action" title="Clear All Patterns">
                    <span class="text-base">🗑️</span>
                  </button>
                  <button id="randomBtn" class="btn-action" title="Randomize Patterns">
                    <span class="text-base">🎲</span>
                  </button>
                  
                  <div class="w-px h-6 bg-gray-600 mx-2"></div>
                  
                  <button class="btn-preset" data-preset="basic" title="Load Basic Beat">
                    <span class="text-purple-400 text-base">♪</span>
                  </button>
                  <button class="btn-preset" data-preset="funk" title="Load Funk Groove">
                    <span class="text-blue-400 text-base">♫</span>
                  </button>
                  <button class="btn-preset" data-preset="techno" title="Load Techno Pattern">
                    <span class="text-pink-400 text-base">★</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Step Grid with Glass Effect -->
          <div class="glass-effect rounded-xl p-4 shadow-xl">
            <div class="grid grid-cols-1 gap-3">
              <!-- Step Numbers with Beat Markers -->
              <div class="grid grid-cols-17 gap-1 mb-4">
                <div style="width: 120px;"></div>
                ${Array.from({ length: 16 }, (_, i) => `
                  <div class="step-number-top" id="step-number-${i}" style="width: 44px;">
                    <span class="step-number-label text-center font-mono ${i % 4 === 0 ? 'text-white' : 'text-gray-400'} p-1 flex items-center justify-center">
                      ${(i + 1).toString().padStart(2, '0')}
                    </span>
                  </div>
                `).join('')}
              </div>

              <!-- Sound Tracks -->
              ${soundConfigs.map((config, trackIndex) => `
                <div class="grid grid-cols-17 gap-1 group">
                  <!-- Track Label with Fixed Width for Full Names -->
                  <div class="flex items-center gap-2 pl-2 pr-3" style="width: 120px;">
                    <button class="sound-test-btn w-5 h-5 rounded-full ${config.color} hover:scale-110 transition-all duration-300 shadow-lg
                                 flex items-center justify-center group-hover:animate-pulse"
                            data-track="${trackIndex}">
                    </button>
                    <span class="text-sm font-medium text-left group-hover:text-white transition-colors truncate" style="max-width: 90px;">
                      ${config.name}
                    </span>
                  </div>
                  
                  <!-- Steps with Enhanced Visual Feedback -->
                  ${Array.from({ length: 16 }, (_, stepIndex) => `
                    <button class="step-btn ${state.pattern[trackIndex][stepIndex] ? `${config.color}-active active` : ''} 
                                 ${stepIndex % 4 === 0 ? 'border-l-4' : ''}"
                            data-track="${trackIndex}" data-step="${stepIndex}">
                      ${state.pattern[trackIndex][stepIndex] ? '<div class="step-dot" aria-hidden="true"></div>' : ''}
                    </button>
                  `).join('')}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Instructions with Keyboard Shortcuts -->
          <div class="mt-8 text-center">
            <div class="inline-block glass-light rounded-full px-6 py-3 text-sm text-gray-300 shadow-lg">
              <span class="mr-4">
                <kbd class="kbd-key">Space</kbd> Play/Pause
              </span>
              <span class="mr-4">•</span>
              <span>Click circles to test sounds</span>
              <span class="mx-4">•</span>
              <span>Click grid to program beats</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    // Transport controls
    const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    const randomBtn = document.getElementById('randomBtn') as HTMLButtonElement;
    const recordBtn = document.getElementById('recordBtn') as HTMLButtonElement;
    const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;

    playBtn?.addEventListener('click', () => this.sequencer.togglePlayback());
    clearBtn?.addEventListener('click', () => this.sequencer.clearPattern());
    randomBtn?.addEventListener('click', () => this.sequencer.randomizePattern());
    
    // Recording controls
    recordBtn?.addEventListener('click', () => this.toggleRecording());
    downloadBtn?.addEventListener('click', () => this.downloadRecording());

    // BPM control
    const bpmSlider = document.getElementById('bpmSlider') as HTMLInputElement;
    const bpmValue = document.getElementById('bpmValue') as HTMLSpanElement;
    bpmSlider?.addEventListener('input', (e) => {
      const bpm = parseInt((e.target as HTMLInputElement).value);
      this.sequencer.setBPM(bpm);
      if (bpmValue) bpmValue.textContent = bpm.toString();
    });

    // Volume control
    const volumeSlider = document.getElementById('volumeSlider') as HTMLInputElement;
    const volumeValue = document.getElementById('volumeValue') as HTMLSpanElement;
    volumeSlider?.addEventListener('input', (e) => {
      const volume = parseInt((e.target as HTMLInputElement).value) / 100;
      this.sequencer.setVolume(volume);
      if (volumeValue) volumeValue.textContent = Math.round(volume * 100).toString();
    });

    // Preset buttons - updated selector
    const presetBtns = document.querySelectorAll('.btn-preset') as NodeListOf<HTMLButtonElement>;
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        if (preset) {
          this.sequencer.presetPattern(preset);
        }
      });
    });

    // Step buttons with enhanced feedback
    const stepBtns = document.querySelectorAll('.step-btn') as NodeListOf<HTMLButtonElement>;
    console.log(`Found ${stepBtns.length} step buttons`);
    stepBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const track = parseInt(btn.dataset.track || '0');
        const step = parseInt(btn.dataset.step || '0');
        console.log(`Clicked step button - track: ${track}, step: ${step}`);
        
        // Add selection animation
        btn.classList.add('selecting');
        setTimeout(() => {
          btn.classList.remove('selecting');
        }, 300);
        
        // Toggle the step
        this.sequencer.toggleStep(track, step);
        
        // Play sound feedback for immediate response
        this.sequencer.playSound(track);
        
        console.log('Step toggled, UI should update');
      });
      
      // Enhanced hover effects
      btn.addEventListener('mouseenter', () => {
        if (!btn.classList.contains('active')) {
          btn.style.borderColor = 'rgba(156, 163, 175, 0.8)';
        }
      });
      
      btn.addEventListener('mouseleave', () => {
        if (!btn.classList.contains('active')) {
          btn.style.borderColor = '';
        }
      });
      
      // Add better touch support
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        btn.style.transform = 'scale(0.95)';
      });
      
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        btn.style.transform = '';
      });
    });

    // Sound test buttons
    const soundTestBtns = document.querySelectorAll('.sound-test-btn') as NodeListOf<HTMLButtonElement>;
    soundTestBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const track = parseInt(btn.dataset.track || '0');
        this.sequencer.playSound(track);
      });
    });

    // Sequencer callbacks
    this.sequencer.onStepChange((step) => {
      this.updateStepIndicators(step);
    });

    this.sequencer.onStateChange((state) => {
      this.updateUI(state);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        this.sequencer.togglePlayback();
      }
    });
  }

  // Recording functionality
  private lastRecordedBlob: Blob | null = null;

  private async toggleRecording(): Promise<void> {
    const state = this.sequencer.getState();
    
    try {
      if (state.isRecording) {
        console.log('Stopping recording...');
        const blob = await this.sequencer.stopRecording();
        if (blob) {
          this.lastRecordedBlob = blob;
          console.log('Recording stopped, blob size:', blob.size);
          // Show download button
          const downloadSection = document.getElementById('downloadSection');
          if (downloadSection) {
            downloadSection.style.display = 'flex';
          }
        }
      } else {
        console.log('Starting recording...');
        await this.sequencer.startRecording();
        console.log('Recording started');
        // Hide download button when starting new recording
        const downloadSection = document.getElementById('downloadSection');
        if (downloadSection) {
          downloadSection.style.display = 'none';
        }
        this.lastRecordedBlob = null;
      }
    } catch (error) {
      console.error('Recording error:', error);
      alert(`Recording failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private downloadRecording(): void {
    if (!this.lastRecordedBlob) {
      alert('No recording available to download');
      return;
    }

    try {
      const url = URL.createObjectURL(this.lastRecordedBlob);
      const a = document.createElement('a');
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
      const state = this.sequencer.getState();
      
      a.href = url;
      a.download = `beatgen-${state.bpm}bpm-${timestamp}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('Download initiated');
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download recording');
    }
  }

  private updateStepIndicators(currentStep: number): void {
    const state = this.sequencer.getState();
    
    // Add/remove sequencer-playing class on the container for efficient styling
    if (state.isPlaying) {
      document.body.classList.add('sequencer-playing');
    } else {
      document.body.classList.remove('sequencer-playing');
    }
    
    for (let i = 0; i < 16; i++) {
      const stepNumber = document.getElementById(`step-number-${i}`);
      if (stepNumber) {
        const label = stepNumber.querySelector('.step-number-label');
        if (label) {
          // Only highlight if playing and this is the current step
          if (state.isPlaying && i === currentStep) {
            label.classList.add('active');
          } else {
            label.classList.remove('active');
          }
        }
      }
    }
  }

  private updateUI(state: SequencerState): void {
    console.log('updateUI called - updating step buttons and recording status');
    
    // Update play button
    const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    if (playBtn) {
      const iconSpan = playBtn.querySelector('span');
      if (iconSpan) {
        iconSpan.textContent = state.isPlaying ? '⏸' : '▶';
      }
    }

    // Update recording button and status
    const recordBtn = document.getElementById('recordBtn') as HTMLButtonElement;
    if (recordBtn) {
      const iconSpan = recordBtn.querySelector('span');
      if (iconSpan) {
        iconSpan.textContent = state.isRecording ? '⏹️' : '🔴';
      }
      recordBtn.className = `btn-record ${state.isRecording ? 'recording' : ''}`;
      recordBtn.title = state.isRecording ? 'Stop Recording' : 'Start Recording';
    }

    // Update recording timer
    const existingTimer = document.getElementById('recordingTimer');
    if (state.isRecording) {
      if (!existingTimer) {
        // Create timer element if it doesn't exist
        const timer = document.createElement('span');
        timer.id = 'recordingTimer';
        timer.className = 'text-xs text-red-400 font-mono min-w-[3ch]';
        recordBtn?.parentNode?.insertBefore(timer, recordBtn.nextSibling);
      }
      const timer = document.getElementById('recordingTimer');
      if (timer) {
        const minutes = Math.floor(state.recordingDuration / 60);
        const seconds = state.recordingDuration % 60;
        timer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
    } else if (existingTimer) {
      // Remove timer when not recording
      existingTimer.remove();
    }

    // Update step buttons with enhanced feedback
    const soundConfigs = this.sequencer.getSoundConfigs();
    state.pattern.forEach((track, trackIndex) => {
      track.forEach((active, stepIndex) => {
        const btn = document.querySelector(`[data-track="${trackIndex}"][data-step="${stepIndex}"]`) as HTMLButtonElement;
        if (btn) {
          const config = soundConfigs[trackIndex];
          const wasActive = btn.classList.contains('active');
          
          // Update classes
          btn.className = `step-btn ${active ? `${config.color}-active active` : ''} 
                          ${stepIndex % 4 === 0 ? 'border-l-4' : ''}`.replace(/\s+/g, ' ').trim();
          
          // Update content with animation
          if (active && !wasActive) {
            // Step was just activated

            btn.innerHTML = '<div class="step-dot" aria-hidden="true"></div>';
          } else if (!active && wasActive) {
            // Step was just deactivated
            btn.innerHTML = '';
          } else if (active) {
            // Step remains active
            btn.innerHTML = '<div class="step-dot" aria-hidden="true"></div>';
          } else {
            // Step remains inactive
            btn.innerHTML = '';
          }
        }
      });
    });

    // Update step indicators if not playing
    if (!state.isPlaying) {
      this.updateStepIndicators(-1);
    }
  }
}
