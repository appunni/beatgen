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
      <div class="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
        <div class="max-w-7xl mx-auto">
          <!-- Header with Glow Effect -->
          <div class="text-center mb-8 relative">
            <div class="absolute inset-0 blur-3xl bg-gradient-to-r from-purple-500/30 to-pink-500/30 -z-10"></div>
            <h1 class="text-5xl font-bold mb-3 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent drop-shadow-lg">
              BeatGen
            </h1>
            <p class="text-xl text-gray-300 mb-2">Step Sequencer</p>
            <p class="text-gray-400">Create beats with 12 programmatically generated sounds</p>
          </div>

          <!-- Transport Controls with Glass Effect -->
          <div class="glass-effect rounded-xl p-6 mb-6 shadow-xl">
            <div class="flex flex-wrap items-center justify-center gap-4">
              <div class="flex items-center gap-3">
                <button id="playBtn" class="btn-play">
                  <span class="text-xl">${state.isPlaying ? '⏸' : '▶'}</span>
                  <span>${state.isPlaying ? 'Pause' : 'Play'}</span>
                </button>
                <button id="stopBtn" class="btn-stop">
                  <span class="text-xl">⏹</span>
                  <span>Stop</span>
                </button>
              </div>

              <div class="h-12 w-px bg-white/10 mx-2"></div>

              <div class="flex items-center gap-3">
                <button id="clearBtn" class="btn-clear">
                  <span class="text-xl">🗑</span>
                  <span>Clear</span>
                </button>
                <button id="randomBtn" class="btn-random">
                  <span class="text-xl">🎲</span>
                  <span>Random</span>
                </button>
              </div>

              <div class="h-12 w-px bg-white/10 mx-2"></div>
              
              <!-- Controls -->
              <div class="flex flex-col gap-4 min-w-[200px]">
                <div class="flex items-center gap-3">
                  <label class="text-sm font-medium min-w-[40px]">BPM</label>
                  <input type="range" id="bpmSlider" min="60" max="200" value="${state.bpm}" 
                         class="control-slider">
                  <span id="bpmValue" class="text-sm font-mono bg-gray-800/50 px-2 py-1 rounded min-w-[45px] text-center">
                    ${state.bpm}
                  </span>
                </div>
                
                <div class="flex items-center gap-3">
                  <label class="text-sm font-medium min-w-[40px]">VOL</label>
                  <input type="range" id="volumeSlider" min="0" max="100" value="${Math.round(state.volume * 100)}" 
                         class="control-slider">
                  <span id="volumeValue" class="text-sm font-mono bg-gray-800/50 px-2 py-1 rounded min-w-[45px] text-center">
                    ${Math.round(state.volume * 100)}
                  </span>
                </div>
              </div>
            </div>

            <!-- Preset Patterns -->
            <div class="mt-6 flex justify-center gap-3">
              <button class="preset-btn" data-preset="basic">
                <span class="text-purple-400">♪</span> Basic Beat
              </button>
              <button class="preset-btn" data-preset="funk">
                <span class="text-blue-400">♫</span> Funk Groove
              </button>
              <button class="preset-btn" data-preset="techno">
                <span class="text-pink-400">★</span> Techno 4/4
              </button>
            </div>
          </div>

          <!-- Step Grid with Glass Effect -->
          <div class="glass-effect rounded-xl p-8 shadow-xl">
            <div class="grid grid-cols-1 gap-3">
              <!-- Step Numbers with Beat Markers -->
              <div class="grid grid-cols-17 gap-1 mb-4">
                <div style="width: 140px;"></div>
                ${Array.from({ length: 16 }, (_, i) => `
                  <div class="text-center font-mono ${i % 4 === 0 ? 'text-white' : 'text-gray-400'} p-1 flex items-center justify-center" style="width: 44px;">
                    ${(i + 1).toString().padStart(2, '0')}
                  </div>
                `).join('')}
              </div>

              <!-- Sound Tracks -->
              ${soundConfigs.map((config, trackIndex) => `
                <div class="grid grid-cols-17 gap-1 group">
                  <!-- Track Label with Fixed Width for Full Names -->
                  <div class="flex items-center gap-2 pr-3" style="width: 140px;">
                    <button class="sound-test-btn w-5 h-5 rounded-full ${config.color} hover:scale-110 transition-all duration-300 shadow-lg
                                 flex items-center justify-center group-hover:animate-pulse"
                            data-track="${trackIndex}">
                    </button>
                    <span class="text-sm font-medium text-left group-hover:text-white transition-colors whitespace-nowrap overflow-visible">
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

            <!-- Step Position Indicator -->
            <div class="mt-6 mb-2">
              <div class="flex justify-center">
                <div class="grid grid-cols-17 gap-1">
                  <div style="width: 140px;"></div>
                  ${Array.from({ length: 16 }, (_, i) => `
                    <div class="step-indicator" id="step-indicator-${i}" style="width: 44px;">
                      <div class="w-full h-full ${(state.isPlaying && i === state.currentStep) 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                        : 'bg-transparent'} transition-all duration-150 rounded">
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
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
    const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
    const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
    const randomBtn = document.getElementById('randomBtn') as HTMLButtonElement;

    playBtn?.addEventListener('click', () => this.sequencer.togglePlayback());
    stopBtn?.addEventListener('click', () => this.sequencer.stop());
    clearBtn?.addEventListener('click', () => this.sequencer.clearPattern());
    randomBtn?.addEventListener('click', () => this.sequencer.randomizePattern());

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

    // Preset buttons
    const presetBtns = document.querySelectorAll('.preset-btn') as NodeListOf<HTMLButtonElement>;
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

  private updateStepIndicators(currentStep: number): void {
    const state = this.sequencer.getState();
    
    // Add/remove sequencer-playing class on the container for efficient styling
    if (state.isPlaying) {
      document.body.classList.add('sequencer-playing');
    } else {
      document.body.classList.remove('sequencer-playing');
    }
    
    for (let i = 0; i < 16; i++) {
      const indicator = document.getElementById(`step-indicator-${i}`);
      if (indicator) {
        const innerDiv = indicator.querySelector('div');
        if (innerDiv) {
          // Only highlight if playing and this is the current step
          if (state.isPlaying && i === currentStep) {
            innerDiv.className = 'w-full h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded';
          } else {
            innerDiv.className = 'w-full h-full bg-transparent rounded';
          }
        }
      }
    }
  }

  private updateUI(state: SequencerState): void {
    console.log('updateUI called - updating step buttons');
    
    // Update play button
    const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
    if (playBtn) {
      const iconSpan = playBtn.querySelector('span:first-child');
      const textSpan = playBtn.querySelector('span:last-child');
      if (iconSpan && textSpan) {
        iconSpan.textContent = state.isPlaying ? '⏸' : '▶';
        textSpan.textContent = state.isPlaying ? 'Pause' : 'Play';
      }
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
