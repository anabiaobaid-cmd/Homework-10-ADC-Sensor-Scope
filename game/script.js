/**
 * Mochi's Virtual Pet — Stage 4: State & Storage, Sensory Feedback & Core Logic
 * Architectural Implementation based on Plan_1.md, Plan_2.md, Plan_3.md & Plan_4.md
 */

// ============================================================================
// 1. GAME CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = {
  DECAY_INTERVAL_MS: 3000,    // Decay every 3 seconds
  DECAY_AMOUNT_PER_TICK: 2,   // 2 points per tick per need
  COOLDOWN_DURATION_MS: 1500, // 1.5 second global cooldown on effective actions
  EXCITED_DURATION_MS: 2000,  // 2 seconds for excited expression
  BLUSHING_DURATION_MS: 2500, // 2.5 seconds for blushing expression

  RECOVERY_AMOUNTS: {
    feed: 20,
    play: 10,
    sleep: 25,
    clean: 15
  },

  THRESHOLDS: {
    HEALTHY_MIN: 70,
    CAUTION_MIN: 31,
    CRITICAL_MAX: 30,
    BLUSHING_HUNGER_TRIGGER: 25,
    BLUSHING_ALL_NEEDS_TRIGGER: 90
  },

  AUDIO: {
    DEFAULT_MASTER_MUTED: false,
    DEFAULT_AMBIENCE_VOLUME: 0.3,
    DEFAULT_SFX_VOLUME: 0.6
  },

  // Stage 4: Storage Settings
  STORAGE: {
    KEY: "mochis_virtual_pet_save_v1",
    AUTO_SAVE_INTERVAL_MS: 10000
  },
  SAVE_KEY: "mochis_virtual_pet_save_v1"
};

// ============================================================================
// 2. GAME STATE (Single Source of Truth)
// ============================================================================

const gameState = {
  currentState: "start", // "start", "playing", "paused", "ended"

  needs: {
    hunger: 100,
    happiness: 100,
    energy: 100,
    cleanliness: 100
  },

  health: 100, // Derived read-only indicator
  score: 0,
  currentExpression: "happy",

  // Temporary expression states & timers
  isExcitedActive: false,
  excitedTimerId: null,

  isBlushingActive: false,
  blushingTimerId: null,

  isFirstAction: true, // Tracks first effective action of the session for blushing

  // Timers
  gameTimerId: null,
  cooldownActive: false,
  cooldownTimerId: null,

  // Last action feedback message (if any)
  lastActionMessage: "",

  // Customization & Visual State
  clothingItems: [
    { id: "witch-hat", name: "Witch Hat", category: "head", unlocked: true },
    { id: "hood", name: "Dark Hood", category: "head", unlocked: true },
    { id: "bow", name: "Bow Ribbon", category: "head", unlocked: true },
    { id: "cloak", name: "Little Cloak", category: "body", unlocked: true }
  ],
  equippedClothing: { head: null, body: null, accessory: null },
  toyItems: [
    { id: "carrot", name: "Carrot Toy", unlocked: true },
    { id: "wand", name: "Magic Wand", unlocked: true },
    { id: "teddy", name: "Teddy Bear", unlocked: true },
    { id: "flower", name: "Enchanted Bloom", unlocked: true },
    { id: "ball", name: "Mystic Ball", unlocked: true }
  ],
  activeToy: null,

  // Animation cycle tick
  animationFrame: 0,

  // Audio settings
  audio: {
    isMuted: CONFIG.AUDIO.DEFAULT_MASTER_MUTED,
    ambienceVolume: CONFIG.AUDIO.DEFAULT_AMBIENCE_VOLUME,
    sfxVolume: CONFIG.AUDIO.DEFAULT_SFX_VOLUME
  },

  // Stage 4: Statistics & Storage
  statistics: {
    totalSessions: 1,
    totalActionsPerformed: 0,
    highScore: 0
  },
  autoSaveTimerId: null
};

// ============================================================================
// 3. DOM ELEMENT REFERENCES
// ============================================================================

const DOM = {
  body: document.body,
  gameContainer: document.getElementById("game-container"),
  scoreValue: document.getElementById("score-value"),
  finalScoreValue: document.getElementById("final-score-value"),

  expressionIcon: document.getElementById("expression-icon"),
  expressionText: document.getElementById("expression-text"),
  statusMessage: document.getElementById("status-message"),

  // Stage 4: Data Management & Toast
  saveStatusIndicator: document.getElementById("save-status-indicator"),
  btnExportSave: document.getElementById("btn-export-save"),
  btnImportSave: document.getElementById("btn-import-save"),
  fileImport: document.getElementById("file-import"),
  btnResetData: document.getElementById("btn-reset-data"),
  awayNotification: document.getElementById("away-notification"),
  awayText: document.getElementById("away-text"),
  btnDismissAway: document.getElementById("btn-dismiss-away"),

  // Audio Controls
  btnMute: document.getElementById("btn-mute"),
  muteIcon: document.getElementById("mute-icon"),
  sliderAmbience: document.getElementById("slider-ambience"),
  sliderSfx: document.getElementById("slider-sfx"),

  // Canvases
  bgCanvas: document.getElementById("bg-canvas"),
  mochiCanvas: document.getElementById("mochi-canvas"),
  particleCanvas: document.getElementById("particle-canvas"),

  // Bars
  healthBar: document.querySelector("#health-bar .bar-fill"),
  healthValue: document.getElementById("health-value"),

  hungerBar: document.querySelector("#hunger-bar .bar-fill"),
  hungerValue: document.getElementById("hunger-value"),

  happinessBar: document.querySelector("#happiness-bar .bar-fill"),
  happinessValue: document.getElementById("happiness-value"),

  energyBar: document.querySelector("#energy-bar .bar-fill"),
  energyValue: document.getElementById("energy-value"),

  cleanlinessBar: document.querySelector("#cleanliness-bar .bar-fill"),
  cleanlinessValue: document.getElementById("cleanliness-value"),

  // Action Buttons
  btnFeed: document.getElementById("btn-feed"),
  btnPlay: document.getElementById("btn-play"),
  btnSleep: document.getElementById("btn-sleep"),
  btnClean: document.getElementById("btn-clean"),
  actionButtons: document.querySelectorAll(".btn-action"),

  // Customization
  btnToggleWardrobe: document.getElementById("btn-toggle-wardrobe"),
  wardrobeDrawer: document.getElementById("wardrobe-drawer"),
  clothingOptions: document.getElementById("clothing-options"),
  toyOptions: document.getElementById("toy-options"),

  // State Controls
  btnStart: document.getElementById("btn-start"),
  btnPause: document.getElementById("btn-pause"),
  btnResume: document.getElementById("btn-resume"),
  btnEnd: document.getElementById("btn-end"),
  btnRestart: document.getElementById("btn-restart")
};

// ============================================================================
// 4. UTILITY FUNCTIONS
// ============================================================================

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function calculateHealth() {
  const sum = gameState.needs.hunger +
              gameState.needs.happiness +
              gameState.needs.energy +
              gameState.needs.cleanliness;
  return Math.floor(sum / 4);
}

// ============================================================================
// 5. WEB AUDIO API SYNTHESIS ENGINE (NON-MUSICAL ONLY)
// ============================================================================

let audioCtx = null;
let masterGain = null;
let ambienceGain = null;
let sfxGain = null;

let windNoiseNode = null;
let windFilterNode = null;
let rustleNoiseNode = null;
let rustleFilterNode = null;
let isAmbiencePlaying = false;

/**
 * Initializes the AudioContext and gain bus graph on first user interaction.
 */
function initAudio() {
  if (audioCtx) {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioCtx = new AudioContextClass();

    // 1. Master Gain
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(gameState.audio.isMuted ? 0 : 1.0, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);

    // 2. Ambience Gain
    ambienceGain = audioCtx.createGain();
    ambienceGain.gain.setValueAtTime(gameState.audio.ambienceVolume, audioCtx.currentTime);
    ambienceGain.connect(masterGain);

    // 3. SFX Gain
    sfxGain = audioCtx.createGain();
    sfxGain.gain.setValueAtTime(gameState.audio.sfxVolume, audioCtx.currentTime);
    sfxGain.connect(masterGain);

    // Build continuous non-musical ambient soundscape
    setupAmbienceGenerators();
  } catch (e) {
    console.warn("AudioContext initialization avoided/blocked:", e);
  }
}

/**
 * Generates an looped audio buffer filled with white noise.
 */
function createNoiseBuffer(durationSec = 2) {
  if (!audioCtx) return null;
  const bufferSize = audioCtx.sampleRate * durationSec;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/**
 * Sets up the ambient enchanted forest wind and rustle noise generators.
 * STRICTLY NON-MUSICAL: No melodies, no musical scales, no singing.
 */
function setupAmbienceGenerators() {
  if (!audioCtx || !ambienceGain) return;

  const noiseBuffer = createNoiseBuffer(3);
  if (!noiseBuffer) return;

  // 1. Gentle Forest Breeze / Wind (Filtered lowpass noise)
  windNoiseNode = audioCtx.createBufferSource();
  windNoiseNode.buffer = noiseBuffer;
  windNoiseNode.loop = true;

  windFilterNode = audioCtx.createBiquadFilter();
  windFilterNode.type = "lowpass";
  windFilterNode.frequency.setValueAtTime(260, audioCtx.currentTime);
  windFilterNode.Q.setValueAtTime(1.5, audioCtx.currentTime);

  const windGain = audioCtx.createGain();
  windGain.gain.setValueAtTime(0.45, audioCtx.currentTime);

  // Slow LFO to modulate wind frequency (breathing wind sound)
  const windLFO = audioCtx.createOscillator();
  windLFO.frequency.setValueAtTime(0.2, audioCtx.currentTime); // 0.2Hz wave
  const windLFOGain = audioCtx.createGain();
  windLFOGain.gain.setValueAtTime(110, audioCtx.currentTime); // sweep between 150Hz and 370Hz
  windLFO.connect(windLFOGain);
  windLFOGain.connect(windFilterNode.frequency);

  windNoiseNode.connect(windFilterNode);
  windFilterNode.connect(windGain);
  windGain.connect(ambienceGain);

  // 2. High Canopy Whisper / Leaf Rustle (Bandpass noise)
  rustleNoiseNode = audioCtx.createBufferSource();
  rustleNoiseNode.buffer = noiseBuffer;
  rustleNoiseNode.loop = true;

  rustleFilterNode = audioCtx.createBiquadFilter();
  rustleFilterNode.type = "bandpass";
  rustleFilterNode.frequency.setValueAtTime(1150, audioCtx.currentTime);
  rustleFilterNode.Q.setValueAtTime(4.0, audioCtx.currentTime);

  const rustleGain = audioCtx.createGain();
  rustleGain.gain.setValueAtTime(0.12, audioCtx.currentTime);

  rustleNoiseNode.connect(rustleFilterNode);
  rustleFilterNode.connect(rustleGain);
  rustleGain.connect(ambienceGain);

  windNoiseNode.start();
  windLFO.start();
  rustleNoiseNode.start();
  isAmbiencePlaying = true;
}

/**
 * Pauses or resumes ambience based on gameplay state.
 */
function updateAmbienceState() {
  if (!audioCtx || !ambienceGain) return;

  const now = audioCtx.currentTime;
  if (gameState.currentState === "playing") {
    ambienceGain.gain.cancelScheduledValues(now);
    ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, now);
    ambienceGain.gain.linearRampToValueAtTime(gameState.audio.ambienceVolume, now + 0.15);
  } else {
    // Graceful fade to 0 during pause or ended
    ambienceGain.gain.cancelScheduledValues(now);
    ambienceGain.gain.setValueAtTime(ambienceGain.gain.value, now);
    ambienceGain.gain.linearRampToValueAtTime(0, now + 0.15);
  }
}

// ----------------------------------------------------------------------------
// Procedural Action SFX Synthesizers (Strictly Non-Musical)
// ----------------------------------------------------------------------------

function playSoundEffect(type) {
  if (!audioCtx || !sfxGain || gameState.audio.isMuted) return;
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;

  switch (type) {
    case "feed": {
      // Crunchy Munch: Short bandpass noise burst + quick micro pitch click
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(now);
      osc.stop(now + 0.09);

      // Secondary nibble crunch
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(220, now + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(70, now + 0.14);

      gain2.gain.setValueAtTime(0.3, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc2.connect(gain2);
      gain2.connect(sfxGain);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.15);
      break;
    }

    case "play": {
      // Joyful Chirp Glide: Sine wave frequency glide 300Hz -> 620Hz
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(640, now + 0.16);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(now);
      osc.stop(now + 0.19);
      break;
    }

    case "sleep": {
      // Gentle Sleep Exhale / Breath: Soft filtered noise swell
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.6);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.4, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(now);
      osc.stop(now + 0.62);
      break;
    }

    case "clean": {
      // Water Swish / Splash: Dual pitch sweep + noise click
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(now);
      osc.stop(now + 0.19);
      break;
    }

    case "cooldown": {
      // Blocked Thud: Low frequency drop 110Hz -> 45Hz
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.09);

      gain.gain.setValueAtTime(0.65, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(now);
      osc.stop(now + 0.1);
      break;
    }

    case "blushing": {
      // Shy Airy Flutter: High frequency whisper glide
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(now);
      osc.stop(now + 0.16);
      break;
    }

    case "critical": {
      // Low Heartbeat Thump: 80Hz pulse
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(85, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

      gain.gain.setValueAtTime(0.7, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(now);
      osc.stop(now + 0.13);
      break;
    }
  }
}

// ============================================================================
// 6. FLOATING ACTION PARTICLES SYSTEM
// ============================================================================

const pCtx = DOM.particleCanvas ? DOM.particleCanvas.getContext("2d") : null;
const particles = [];

/**
 * Spawns thematic particle bursts over Mochi
 */
function spawnParticles(type) {
  if (!DOM.particleCanvas) return;

  const count = type === "blushing" ? 10 : 7;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: 80 + (Math.random() - 0.5) * 40,
      y: 90 + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 2.2,
      vy: -1.2 - Math.random() * 1.8,
      alpha: 1.0,
      life: 0,
      maxLife: 35 + Math.random() * 15,
      type: type,
      size: 3 + Math.random() * 3
    });
  }
}

function updateAndRenderParticles() {
  if (!pCtx || !DOM.particleCanvas) return;

  pCtx.clearRect(0, 0, 160, 160);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life++;
    p.alpha = 1 - (p.life / p.maxLife);

    if (p.life >= p.maxLife) {
      particles.splice(i, 1);
      continue;
    }

    pCtx.save();
    pCtx.globalAlpha = clamp(p.alpha, 0, 1);

    if (p.type === "feed") {
      // Golden crumbs
      pCtx.fillStyle = "#f59e0b";
      pCtx.fillRect(p.x, p.y, p.size, p.size);
    } else if (p.type === "play") {
      // Sparkling stars
      pCtx.fillStyle = "#38bdf8";
      pCtx.fillRect(p.x - 1, p.y, p.size + 2, 2);
      pCtx.fillRect(p.x, p.y - 1, 2, p.size + 2);
    } else if (p.type === "sleep") {
      // Sleepy 'z' dots
      pCtx.fillStyle = "#c084fc";
      pCtx.font = "bold 10px monospace";
      pCtx.fillText("z", p.x, p.y);
    } else if (p.type === "clean") {
      // Translucent soap bubbles
      pCtx.strokeStyle = "#67e8f9";
      pCtx.fillStyle = "rgba(103, 232, 249, 0.35)";
      pCtx.beginPath();
      pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      pCtx.fill();
      pCtx.stroke();
    } else if (p.type === "blushing") {
      // Little heart/petal dots
      pCtx.fillStyle = "#fb7185";
      pCtx.fillRect(p.x, p.y, 3, 3);
      pCtx.fillRect(p.x - 2, p.y - 2, 2, 2);
      pCtx.fillRect(p.x + 2, p.y - 2, 2, 2);
    }

    pCtx.restore();
  }
}

/**
 * Triggers subtle container screen shake on critical warning
 */
function triggerScreenShake() {
  if (!DOM.gameContainer) return;
  DOM.gameContainer.classList.remove("shake-warning");
  // Force reflow
  void DOM.gameContainer.offsetWidth;
  DOM.gameContainer.classList.add("shake-warning");
  playSoundEffect("critical");
}

// ============================================================================
// 7. EXPRESSIONS & EMOTIONAL FEEDBACK LOGIC
// ============================================================================

function determineExpression() {
  const { hunger, happiness, energy, cleanliness } = gameState.needs;
  const minNeedVal = Math.min(hunger, happiness, energy, cleanliness);

  // Critical Needs (<= 30) ALWAYS override temporary expressions
  if (minNeedVal <= CONFIG.THRESHOLDS.CRITICAL_MAX) {
    cancelTemporaryExpressions();
    if (hunger === minNeedVal) return "hungry";
    if (energy === minNeedVal) return "tired";
    return "sad";
  }

  // Priority 4: Temporary Excited
  if (gameState.isExcitedActive) return "excited";

  // Priority 5: Temporary Blushing
  if (gameState.isBlushingActive) return "blushing";

  // Priority 6: Default Happy
  return "happy";
}

function cancelTemporaryExpressions() {
  if (gameState.excitedTimerId) {
    clearTimeout(gameState.excitedTimerId);
    gameState.excitedTimerId = null;
  }
  gameState.isExcitedActive = false;

  if (gameState.blushingTimerId) {
    clearTimeout(gameState.blushingTimerId);
    gameState.blushingTimerId = null;
  }
  gameState.isBlushingActive = false;
}

function triggerExcited() {
  if (Math.min(...Object.values(gameState.needs)) <= CONFIG.THRESHOLDS.CRITICAL_MAX) return;

  if (gameState.excitedTimerId) clearTimeout(gameState.excitedTimerId);

  gameState.isExcitedActive = true;
  gameState.excitedTimerId = setTimeout(() => {
    gameState.isExcitedActive = false;
    gameState.excitedTimerId = null;
    gameState.currentExpression = determineExpression();
    updateUI();
  }, CONFIG.EXCITED_DURATION_MS);
}

function triggerBlushing() {
  if (Math.min(...Object.values(gameState.needs)) <= CONFIG.THRESHOLDS.CRITICAL_MAX) return;

  if (gameState.blushingTimerId) clearTimeout(gameState.blushingTimerId);

  gameState.isBlushingActive = true;
  spawnParticles("blushing");
  playSoundEffect("blushing");

  gameState.blushingTimerId = setTimeout(() => {
    gameState.isBlushingActive = false;
    gameState.blushingTimerId = null;
    gameState.currentExpression = determineExpression();
    updateUI();
  }, CONFIG.BLUSHING_DURATION_MS);
}

function checkBlushingTriggers(actionType, previousHunger) {
  if (actionType === "feed" && previousHunger <= CONFIG.THRESHOLDS.BLUSHING_HUNGER_TRIGGER) return true;

  const { hunger, happiness, energy, cleanliness } = gameState.needs;
  if (hunger >= CONFIG.THRESHOLDS.BLUSHING_ALL_NEEDS_TRIGGER &&
      happiness >= CONFIG.THRESHOLDS.BLUSHING_ALL_NEEDS_TRIGGER &&
      energy >= CONFIG.THRESHOLDS.BLUSHING_ALL_NEEDS_TRIGGER &&
      cleanliness >= CONFIG.THRESHOLDS.BLUSHING_ALL_NEEDS_TRIGGER) {
    return true;
  }

  if (gameState.isFirstAction) return true;

  return false;
}

function getStatusMessageText() {
  const { hunger, happiness, energy, cleanliness } = gameState.needs;

  if (gameState.health === 0) return "Mochi is in terrible shape! Take care of your bunny!";
  if (hunger === 0) return "Mochi is starving! Please feed Mochi!";
  if (energy === 0) return "Mochi is exhausted! Needs rest immediately!";
  if (happiness === 0) return "Mochi is miserable! Needs some cheer!";
  if (cleanliness === 0) return "Mochi is filthy! Needs a clean bath!";

  const minVal = Math.min(hunger, energy, happiness, cleanliness);
  if (minVal <= CONFIG.THRESHOLDS.CRITICAL_MAX) {
    if (hunger === minVal) return "Mochi is very hungry…";
    if (energy === minVal) return "Mochi is getting tired…";
    if (happiness === minVal) return "Mochi feels lonely and sad…";
    return "Mochi feels dirty and uncomfortable…";
  }

  if (gameState.isBlushingActive) return "Mochi is touched and blushing softly!";
  if (gameState.isExcitedActive) return "Mochi bounces with joy!";
  if (gameState.lastActionMessage) return gameState.lastActionMessage;
  if (minVal < CONFIG.THRESHOLDS.HEALTHY_MIN) return "Mochi could use some gentle attention.";

  return "Mochi is happy and healthy!";
}

// ============================================================================
// 8. COOLDOWN MANAGEMENT
// ============================================================================

function startCooldown() {
  gameState.cooldownActive = true;
  DOM.actionButtons.forEach(btn => btn.classList.add("btn-cooldown"));

  if (gameState.cooldownTimerId) clearTimeout(gameState.cooldownTimerId);

  gameState.cooldownTimerId = setTimeout(() => {
    endCooldown();
  }, CONFIG.COOLDOWN_DURATION_MS);
}

function endCooldown() {
  gameState.cooldownActive = false;
  gameState.cooldownTimerId = null;
  DOM.actionButtons.forEach(btn => btn.classList.remove("btn-cooldown"));
}

function clearCooldown() {
  if (gameState.cooldownTimerId) {
    clearTimeout(gameState.cooldownTimerId);
    gameState.cooldownTimerId = null;
  }
  gameState.cooldownActive = false;
  DOM.actionButtons.forEach(btn => btn.classList.remove("btn-cooldown"));
}

// ============================================================================
// 9. CARE ACTIONS & GAMEPLAY LOOP
// ============================================================================

function performAction(actionType) {
  initAudio();

  if (gameState.currentState !== "playing") return;

  // Visual/Auditory feedback if cooldown blocked
  if (gameState.cooldownActive) {
    showCooldownMessage();
    playSoundEffect("cooldown");
    const activeBtn = document.getElementById(`btn-${actionType}`);
    if (activeBtn) {
      activeBtn.classList.add("btn-cooldown-blocked");
      setTimeout(() => activeBtn.classList.remove("btn-cooldown-blocked"), 250);
    }
    return;
  }

  let needKey = "";
  let actionFeedback = "";
  let fullFeedback = "";

  switch (actionType) {
    case "feed":
      needKey = "hunger";
      actionFeedback = "Mochi munches happily!";
      fullFeedback = "Mochi isn't hungry right now.";
      break;
    case "play":
      needKey = "happiness";
      actionFeedback = "Mochi plays enthusiastically!";
      fullFeedback = "Mochi is already having a great time!";
      break;
    case "sleep":
      needKey = "energy";
      actionFeedback = "Mochi takes a cozy nap.";
      fullFeedback = "Mochi is wide awake!";
      break;
    case "clean":
      needKey = "cleanliness";
      actionFeedback = "Mochi sparkles after a bath!";
      fullFeedback = "Mochi is already squeaky clean!";
      break;
    default:
      return;
  }

  const currentValue = gameState.needs[needKey];

  // Ineffective Action: Need already at 100
  if (currentValue >= 100) {
    gameState.lastActionMessage = fullFeedback;
    gameState.currentExpression = determineExpression();
    playSoundEffect("cooldown");
    updateUI();
    return;
  }

  // Effective Action: Restores need
  const recovery = CONFIG.RECOVERY_AMOUNTS[actionType];
  const previousHunger = gameState.needs.hunger;
  gameState.needs[needKey] = clamp(currentValue + recovery, 0, 100);

  // Scoring
  gameState.score += 10;
  gameState.lastActionMessage = actionFeedback;

  // Sound & Particle sensory feedback
  playSoundEffect(actionType);
  spawnParticles(actionType);

  const shouldBlush = checkBlushingTriggers(actionType, previousHunger);

  if (actionType === "play") {
    triggerExcited();
  }

  if (shouldBlush) {
    triggerBlushing();
  }

  gameState.isFirstAction = false;
  gameState.health = calculateHealth();
  gameState.currentExpression = determineExpression();

  startCooldown();
  gameState.statistics.totalActionsPerformed++;
  saveGame(true);
  updateUI();
}

function showCooldownMessage() {
  DOM.statusMessage.textContent = "Wait a moment...";
}

function gameTick() {
  if (gameState.currentState !== "playing") return;

  const prevMin = Math.min(...Object.values(gameState.needs));

  gameState.needs.hunger = clamp(gameState.needs.hunger - CONFIG.DECAY_AMOUNT_PER_TICK, 0, 100);
  gameState.needs.happiness = clamp(gameState.needs.happiness - CONFIG.DECAY_AMOUNT_PER_TICK, 0, 100);
  gameState.needs.energy = clamp(gameState.needs.energy - CONFIG.DECAY_AMOUNT_PER_TICK, 0, 100);
  gameState.needs.cleanliness = clamp(gameState.needs.cleanliness - CONFIG.DECAY_AMOUNT_PER_TICK, 0, 100);

  const newMin = Math.min(...Object.values(gameState.needs));
  if (newMin === 0 && prevMin > 0) {
    triggerScreenShake();
  }

  gameState.lastActionMessage = "";
  gameState.health = calculateHealth();
  gameState.currentExpression = determineExpression();

  updateUI();
}

// ============================================================================
// 10. TIMER MANAGEMENT
// ============================================================================

function startTimer() {
  stopTimer();
  gameState.gameTimerId = setInterval(gameTick, CONFIG.DECAY_INTERVAL_MS);
}

function stopTimer() {
  if (gameState.gameTimerId !== null) {
    clearInterval(gameState.gameTimerId);
    gameState.gameTimerId = null;
  }
}

// ============================================================================
// 11. GAME STATE TRANSITIONS
// ============================================================================

function startGame() {
  initAudio();
  gameState.currentState = "playing";
  gameState.isFirstAction = true;
  gameState.lastActionMessage = "";
  startTimer();
  startAutoSaveTimer();
  saveGame(true);
  updateAmbienceState();
  updateUI();
}

function pauseGame() {
  if (gameState.currentState !== "playing") return;

  gameState.currentState = "paused";
  stopTimer();
  stopAutoSaveTimer();
  clearCooldown();
  saveGame(true);
  updateAmbienceState();
  updateUI();
}

function resumeGame() {
  if (gameState.currentState !== "paused") return;

  initAudio();
  gameState.currentState = "playing";
  startTimer();
  startAutoSaveTimer();
  saveGame(true);
  updateAmbienceState();
  updateUI();
}

function endGame() {
  if (gameState.currentState === "ended" || gameState.currentState === "start") return;

  gameState.currentState = "ended";
  stopTimer();
  stopAutoSaveTimer();
  clearCooldown();
  cancelTemporaryExpressions();
  saveGame(true);
  updateAmbienceState();
  updateUI();
}

function restartGame() {
  stopTimer();
  stopAutoSaveTimer();
  clearCooldown();
  cancelTemporaryExpressions();

  gameState.currentState = "start";
  gameState.needs.hunger = 100;
  gameState.needs.happiness = 100;
  gameState.needs.energy = 100;
  gameState.needs.cleanliness = 100;
  gameState.health = 100;
  gameState.score = 0;
  gameState.currentExpression = "happy";
  gameState.isFirstAction = true;
  gameState.lastActionMessage = "";

  saveGame(true);
  updateAmbienceState();
  updateUI();
}

// ============================================================================
// 12. PIXEL ART RENDERING ENGINE (32x32 Virtual Grid)
// ============================================================================

const ctxMochi = DOM.mochiCanvas ? DOM.mochiCanvas.getContext("2d") : null;

function drawPixel(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
}

function drawRect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
}

function renderMochiPixelArt() {
  if (!ctxMochi) return;

  ctxMochi.clearRect(0, 0, 32, 32);

  const bounce = (Math.floor(gameState.animationFrame / 30) % 2 === 0) ? 0 : 1;
  const expr = gameState.currentExpression;

  const cOutline = "#1e142b";       // Dark violet obsidian outline
  const cBody = "#f8f4ec";          // Pale mochi ivory
  const cBodyShade = "#d8cebf";     // Body shadow
  const cInnerEar = "#f9a8d4";      // Soft pink
  const cInnerEarShade = "#f472b6";
  const cCheek = "#fb7185";         // Rosy blush
  const cEye = "#181024";           // Glossy pupil
  const cPupilGlint = "#ffffff";    // Eye catchlight

  // 1. Shadow underneath
  drawRect(ctxMochi, 8, 29, 16, 2, "rgba(8, 12, 18, 0.45)");
  drawRect(ctxMochi, 10, 30, 12, 1, "rgba(8, 12, 18, 0.65)");

  // 2. Ears
  const earDrop = (expr === "tired" || expr === "sad") ? 1 : 0;
  const earBounce = (expr === "excited") ? bounce * 2 : bounce;

  // Left Ear
  drawRect(ctxMochi, 9, 3 + earDrop - earBounce, 4, 11, cOutline);
  drawRect(ctxMochi, 10, 4 + earDrop - earBounce, 2, 9, cBody);
  drawRect(ctxMochi, 10, 6 + earDrop - earBounce, 2, 6, cInnerEar);
  drawPixel(ctxMochi, 11, 7 + earDrop - earBounce, cInnerEarShade);

  // Right Ear
  drawRect(ctxMochi, 19, 3 + earDrop - earBounce, 4, 11, cOutline);
  drawRect(ctxMochi, 20, 4 + earDrop - earBounce, 2, 9, cBody);
  drawRect(ctxMochi, 20, 6 + earDrop - earBounce, 2, 6, cInnerEar);
  drawPixel(ctxMochi, 20, 7 + earDrop - earBounce, cInnerEarShade);

  // 3. Body Silhouette
  const by = 13 - bounce;

  drawRect(ctxMochi, 8, by + 1, 16, 14, cOutline);
  drawRect(ctxMochi, 6, by + 3, 20, 10, cOutline);
  drawRect(ctxMochi, 7, by + 2, 18, 12, cOutline);

  drawRect(ctxMochi, 8, by + 2, 16, 12, cBody);
  drawRect(ctxMochi, 7, by + 3, 18, 10, cBody);

  drawRect(ctxMochi, 8, by + 12, 16, 2, cBodyShade);
  drawRect(ctxMochi, 7, by + 11, 18, 1, cBodyShade);

  // Paws
  drawRect(ctxMochi, 10, by + 12, 3, 2, cOutline);
  drawRect(ctxMochi, 11, by + 12, 2, 1, cBody);
  drawRect(ctxMochi, 19, by + 12, 3, 2, cOutline);
  drawRect(ctxMochi, 19, by + 12, 2, 1, cBody);

  // 4. Clothing: Body layer
  if (gameState.equippedClothing.body === "cloak") {
    drawRect(ctxMochi, 7, by + 8, 18, 6, "#2e1065");
    drawRect(ctxMochi, 8, by + 9, 16, 5, "#4c1d95");
    drawPixel(ctxMochi, 15, by + 8, "#fbbf24");
    drawPixel(ctxMochi, 16, by + 8, "#fbbf24");
  }

  // 5. Facial Expressions
  renderExpressionPixels(ctxMochi, expr, by, cEye, cPupilGlint, cCheek, cOutline);

  // 6. Clothing: Head layer
  renderHeadClothing(ctxMochi, by);

  // 7. Active Toy
  renderActiveToy(ctxMochi, by);
}

function renderExpressionPixels(ctx, expr, by, cEye, cPupilGlint, cCheek, cOutline) {
  const eyeY = by + 6;

  switch (expr) {
    case "happy":
      drawPixel(ctx, 11, eyeY, cEye);
      drawPixel(ctx, 12, eyeY - 1, cEye);
      drawPixel(ctx, 13, eyeY, cEye);

      drawPixel(ctx, 18, eyeY, cEye);
      drawPixel(ctx, 19, eyeY - 1, cEye);
      drawPixel(ctx, 20, eyeY, cEye);

      drawPixel(ctx, 15, eyeY + 2, cOutline);
      drawPixel(ctx, 16, eyeY + 2, cOutline);

      drawPixel(ctx, 10, eyeY + 2, "rgba(251, 113, 133, 0.5)");
      drawPixel(ctx, 21, eyeY + 2, "rgba(251, 113, 133, 0.5)");
      break;

    case "sad":
      drawRect(ctx, 11, eyeY, 2, 2, cEye);
      drawRect(ctx, 19, eyeY, 2, 2, cEye);
      drawPixel(ctx, 11, eyeY, "#67e8f9");
      drawPixel(ctx, 20, eyeY, "#67e8f9");

      drawPixel(ctx, 14, eyeY + 3, cOutline);
      drawPixel(ctx, 15, eyeY + 2, cOutline);
      drawPixel(ctx, 16, eyeY + 2, cOutline);
      drawPixel(ctx, 17, eyeY + 3, cOutline);
      break;

    case "hungry":
      drawRect(ctx, 10, eyeY - 1, 3, 3, cEye);
      drawRect(ctx, 19, eyeY - 1, 3, 3, cEye);
      drawPixel(ctx, 10, eyeY - 1, cPupilGlint);
      drawPixel(ctx, 19, eyeY - 1, cPupilGlint);

      drawRect(ctx, 15, eyeY + 2, 2, 2, "#991b1b");
      drawPixel(ctx, 15, eyeY + 3, "#f43f5e");
      break;

    case "tired":
      drawRect(ctx, 10, eyeY + 1, 4, 1, cEye);
      drawRect(ctx, 18, eyeY + 1, 4, 1, cEye);

      drawPixel(ctx, 15, eyeY + 3, cOutline);
      drawPixel(ctx, 16, eyeY + 3, cOutline);

      drawPixel(ctx, 23, by + 1, "#a855f7");
      drawPixel(ctx, 24, by + 1, "#a855f7");
      drawPixel(ctx, 23, by + 2, "#a855f7");
      drawPixel(ctx, 22, by + 3, "#a855f7");
      drawPixel(ctx, 23, by + 3, "#a855f7");
      break;

    case "excited":
      drawPixel(ctx, 12, eyeY - 1, cEye);
      drawRect(ctx, 11, eyeY, 3, 1, cEye);
      drawPixel(ctx, 12, eyeY + 1, cEye);
      drawPixel(ctx, 12, eyeY, "#fde047");

      drawPixel(ctx, 19, eyeY - 1, cEye);
      drawRect(ctx, 18, eyeY, 3, 1, cEye);
      drawPixel(ctx, 19, eyeY + 1, cEye);
      drawPixel(ctx, 19, eyeY, "#fde047");

      drawRect(ctx, 14, eyeY + 2, 4, 2, cOutline);
      drawRect(ctx, 15, eyeY + 2, 2, 1, "#f43f5e");

      drawRect(ctx, 9, eyeY + 2, 2, 1, cCheek);
      drawRect(ctx, 21, eyeY + 2, 2, 1, cCheek);
      break;

    case "blushing":
      drawPixel(ctx, 11, eyeY + 1, cEye);
      drawPixel(ctx, 12, eyeY, cEye);
      drawPixel(ctx, 13, eyeY + 1, cEye);

      drawPixel(ctx, 18, eyeY + 1, cEye);
      drawPixel(ctx, 19, eyeY, cEye);
      drawPixel(ctx, 20, eyeY + 1, cEye);

      drawPixel(ctx, 15, eyeY + 2, cOutline);
      drawPixel(ctx, 16, eyeY + 2, cOutline);

      drawRect(ctx, 9, eyeY + 2, 3, 2, cCheek);
      drawRect(ctx, 20, eyeY + 2, 3, 2, cCheek);
      drawPixel(ctx, 10, eyeY + 2, "#fff");
      drawPixel(ctx, 21, eyeY + 2, "#fff");
      break;
  }
}

function renderHeadClothing(ctx, by) {
  const hat = gameState.equippedClothing.head;
  if (!hat) return;

  switch (hat) {
    case "witch-hat":
      drawRect(ctx, 5, by + 1, 22, 2, "#180d2b");
      drawRect(ctx, 9, by - 2, 14, 3, "#2e1065");
      drawRect(ctx, 11, by - 5, 10, 3, "#3b0764");
      drawRect(ctx, 13, by - 8, 6, 3, "#4c1d95");
      drawRect(ctx, 15, by - 10, 3, 2, "#581c87");
      drawRect(ctx, 9, by, 14, 1, "#eab308");
      break;

    case "hood":
      drawRect(ctx, 7, by, 18, 4, "#0f172a");
      drawRect(ctx, 6, by + 2, 4, 6, "#1e293b");
      drawRect(ctx, 22, by + 2, 4, 6, "#1e293b");
      break;

    case "bow":
      drawRect(ctx, 8, by, 6, 4, "#be123c");
      drawPixel(ctx, 11, by + 1, "#fb7185");
      break;
  }
}

function renderActiveToy(ctx, by) {
  const toy = gameState.activeToy;
  if (!toy) return;

  switch (toy) {
    case "carrot":
      drawRect(ctx, 23, by + 10, 3, 4, "#ea580c");
      drawPixel(ctx, 24, by + 14, "#c2410c");
      drawRect(ctx, 23, by + 8, 2, 2, "#16a34a");
      drawPixel(ctx, 25, by + 7, "#22c55e");
      break;

    case "wand":
      drawRect(ctx, 24, by + 7, 1, 7, "#78350f");
      drawPixel(ctx, 24, by + 6, "#facc15");
      drawPixel(ctx, 23, by + 6, "#fef08a");
      drawPixel(ctx, 25, by + 6, "#fef08a");
      break;

    case "teddy":
      drawRect(ctx, 23, by + 10, 4, 4, "#78350f");
      drawPixel(ctx, 23, by + 9, "#92400e");
      drawPixel(ctx, 26, by + 9, "#92400e");
      drawPixel(ctx, 24, by + 11, "#000");
      break;

    case "flower":
      drawPixel(ctx, 24, by + 12, "#15803d");
      drawPixel(ctx, 24, by + 13, "#15803d");
      drawRect(ctx, 23, by + 10, 3, 2, "#38bdf8");
      drawPixel(ctx, 24, by + 11, "#fef08a");
      break;

    case "ball":
      drawRect(ctx, 23, by + 11, 4, 4, "#9333ea");
      drawRect(ctx, 24, by + 12, 2, 2, "#c084fc");
      break;
  }
}

// ============================================================================
// 13. ENCHANTED FOREST ANIMATED BACKGROUND ENGINE
// ============================================================================

const bgCtx = DOM.bgCanvas ? DOM.bgCanvas.getContext("2d") : null;
const fireflies = [];
const NUM_FIREFLIES = 22;

function initFireflies() {
  if (!DOM.bgCanvas) return;
  const w = DOM.bgCanvas.width;
  const h = DOM.bgCanvas.height;

  fireflies.length = 0;
  for (let i = 0; i < NUM_FIREFLIES; i++) {
    fireflies.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.2 - Math.random() * 0.35,
      radius: 1.2 + Math.random() * 1.8,
      alpha: Math.random(),
      alphaSpeed: 0.015 + Math.random() * 0.025,
      hue: Math.random() > 0.4 ? 145 : 280
    });
  }
}

function resizeBackground() {
  if (!DOM.bgCanvas) return;
  DOM.bgCanvas.width = window.innerWidth;
  DOM.bgCanvas.height = window.innerHeight;
  initFireflies();
}

function renderBackground() {
  if (!bgCtx || !DOM.bgCanvas) return;

  const w = DOM.bgCanvas.width;
  const h = DOM.bgCanvas.height;

  const skyGrad = bgCtx.createLinearGradient(0, 0, 0, h);
  skyGrad.addColorStop(0, "#05080d");
  skyGrad.addColorStop(0.5, "#0b111a");
  skyGrad.addColorStop(1, "#170f24");
  bgCtx.fillStyle = skyGrad;
  bgCtx.fillRect(0, 0, w, h);

  const t = gameState.animationFrame * 0.02;

  // Distant pine tree ridges
  bgCtx.fillStyle = "#070c12";
  bgCtx.beginPath();
  bgCtx.moveTo(0, h);
  const step = 40;
  for (let x = 0; x <= w + step; x += step) {
    const treeH = 60 + Math.sin(x * 0.015) * 25 + Math.cos(x * 0.05) * 15;
    bgCtx.lineTo(x, h - treeH);
    bgCtx.lineTo(x + step * 0.5, h - (treeH + 35));
  }
  bgCtx.lineTo(w, h);
  bgCtx.closePath();
  bgCtx.fill();

  // Ground mist layer 1
  bgCtx.fillStyle = "rgba(16, 26, 38, 0.55)";
  bgCtx.beginPath();
  bgCtx.moveTo(0, h);
  for (let x = 0; x <= w; x += 30) {
    const my = h - 45 + Math.sin(t + x * 0.008) * 12;
    bgCtx.lineTo(x, my);
  }
  bgCtx.lineTo(w, h);
  bgCtx.closePath();
  bgCtx.fill();

  // Ground mist layer 2
  bgCtx.fillStyle = "rgba(46, 26, 71, 0.35)";
  bgCtx.beginPath();
  bgCtx.moveTo(0, h);
  for (let x = 0; x <= w; x += 25) {
    const my = h - 25 + Math.cos(-t * 0.8 + x * 0.01) * 10;
    bgCtx.lineTo(x, my);
  }
  bgCtx.lineTo(w, h);
  bgCtx.closePath();
  bgCtx.fill();

  // Floating fireflies
  for (let i = 0; i < fireflies.length; i++) {
    const f = fireflies[i];

    f.x += f.vx;
    f.y += f.vy;
    f.alpha += f.alphaSpeed;

    if (f.alpha > 1 || f.alpha < 0.1) {
      f.alphaSpeed = -f.alphaSpeed;
    }

    if (f.y < -10) f.y = h + 10;
    if (f.x < -10) f.x = w + 10;
    if (f.x > w + 10) f.x = -10;

    const clampedAlpha = clamp(f.alpha, 0.05, 0.9);
    bgCtx.fillStyle = `hsla(${f.hue}, 85%, 65%, ${clampedAlpha})`;
    bgCtx.beginPath();
    bgCtx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
    bgCtx.fill();

    bgCtx.fillStyle = `hsla(${f.hue}, 85%, 65%, ${clampedAlpha * 0.25})`;
    bgCtx.beginPath();
    bgCtx.arc(f.x, f.y, f.radius * 2.5, 0, Math.PI * 2);
    bgCtx.fill();
  }
}

function animationLoop() {
  gameState.animationFrame++;

  renderBackground();
  renderMochiPixelArt();
  updateAndRenderParticles();

  requestAnimationFrame(animationLoop);
}

// ============================================================================
// 14. UI RENDERING & DOM UPDATES
// ============================================================================

function updateBarDisplay(fillEl, labelEl, value) {
  const clamped = clamp(value, 0, 100);
  fillEl.style.width = `${clamped}%`;
  labelEl.textContent = `${clamped} / 100`;

  fillEl.classList.remove("bar-healthy", "bar-caution", "bar-critical");
  if (clamped >= CONFIG.THRESHOLDS.HEALTHY_MIN) {
    fillEl.classList.add("bar-healthy");
  } else if (clamped >= CONFIG.THRESHOLDS.CAUTION_MIN) {
    fillEl.classList.add("bar-caution");
  } else {
    fillEl.classList.add("bar-critical");
  }
}

function updateUI() {
  DOM.body.className = `state-${gameState.currentState}`;

  DOM.scoreValue.textContent = gameState.score;
  DOM.finalScoreValue.textContent = gameState.score;

  updateBarDisplay(DOM.healthBar, DOM.healthValue, gameState.health);
  updateBarDisplay(DOM.hungerBar, DOM.hungerValue, gameState.needs.hunger);
  updateBarDisplay(DOM.happinessBar, DOM.happinessValue, gameState.needs.happiness);
  updateBarDisplay(DOM.energyBar, DOM.energyValue, gameState.needs.energy);
  updateBarDisplay(DOM.cleanlinessBar, DOM.cleanlinessValue, gameState.needs.cleanliness);

  const exprMap = {
    happy: { icon: "😊", text: "Mochi is happy!" },
    sad: { icon: "😢", text: "Mochi is sad!" },
    hungry: { icon: "🍽️", text: "Mochi is hungry!" },
    tired: { icon: "😴", text: "Mochi is tired!" },
    excited: { icon: "⭐", text: "Mochi is excited!" },
    blushing: { icon: "😊💗", text: "Mochi is blushing!" }
  };

  const currentExpr = exprMap[gameState.currentExpression] || exprMap.happy;
  DOM.expressionIcon.textContent = currentExpr.icon;
  DOM.expressionText.textContent = currentExpr.text;

  DOM.statusMessage.textContent = getStatusMessageText();

  const disableCare = gameState.currentState !== "playing" || gameState.cooldownActive;
  DOM.actionButtons.forEach(btn => {
    btn.disabled = disableCare;
  });

  // Audio UI Sync
  if (DOM.btnMute) {
    DOM.btnMute.classList.toggle("is-muted", gameState.audio.isMuted);
    DOM.muteIcon.textContent = gameState.audio.isMuted ? "🔇" : "🔊";
  }

  renderWardrobeOptions();
}

function renderWardrobeOptions() {
  if (!DOM.clothingOptions || !DOM.toyOptions) return;

  DOM.clothingOptions.innerHTML = "";
  const noneClothBtn = document.createElement("button");
  noneClothBtn.className = `btn-chip ${!gameState.equippedClothing.head && !gameState.equippedClothing.body ? 'chip-active' : ''}`;
  noneClothBtn.textContent = "None (Natural)";
  noneClothBtn.onclick = () => {
    gameState.equippedClothing.head = null;
    gameState.equippedClothing.body = null;
    saveGame(true);
    updateUI();
  };
  DOM.clothingOptions.appendChild(noneClothBtn);

  gameState.clothingItems.forEach(item => {
    const btn = document.createElement("button");
    const isEquipped = gameState.equippedClothing[item.category] === item.id;
    btn.className = `btn-chip ${isEquipped ? 'chip-active' : ''}`;
    btn.textContent = `${item.name} (${item.category})`;
    btn.onclick = () => {
      gameState.equippedClothing[item.category] = isEquipped ? null : item.id;
      saveGame(true);
      updateUI();
    };
    DOM.clothingOptions.appendChild(btn);
  });

  DOM.toyOptions.innerHTML = "";
  const noneToyBtn = document.createElement("button");
  noneToyBtn.className = `btn-chip ${!gameState.activeToy ? 'chip-active' : ''}`;
  noneToyBtn.textContent = "None";
  noneToyBtn.onclick = () => {
    gameState.activeToy = null;
    saveGame(true);
    updateUI();
  };
  DOM.toyOptions.appendChild(noneToyBtn);

  gameState.toyItems.forEach(toy => {
    const btn = document.createElement("button");
    const isActive = gameState.activeToy === toy.id;
    btn.className = `btn-chip ${isActive ? 'chip-active' : ''}`;
    btn.textContent = toy.name;
    btn.onclick = () => {
      gameState.activeToy = isActive ? null : toy.id;
      saveGame(true);
      updateUI();
    };
    DOM.toyOptions.appendChild(btn);
  });
}

// ============================================================================
// 15. AUDIO CONTROLS HANDLERS
// ============================================================================

function toggleMasterMute() {
  initAudio();
  gameState.audio.isMuted = !gameState.audio.isMuted;

  if (masterGain && audioCtx) {
    const now = audioCtx.currentTime;
    masterGain.gain.setValueAtTime(gameState.audio.isMuted ? 0 : 1.0, now);
  }

  saveGame(false);
  updateUI();
}

function setAmbienceVolume(val) {
  initAudio();
  const v = clamp(parseFloat(val), 0, 1);
  gameState.audio.ambienceVolume = v;

  if (ambienceGain && audioCtx && gameState.currentState === "playing") {
    ambienceGain.gain.setValueAtTime(v, audioCtx.currentTime);
  }

  saveGame(false);
}

function setSfxVolume(val) {
  initAudio();
  const v = clamp(parseFloat(val), 0, 1);
  gameState.audio.sfxVolume = v;

  if (sfxGain && audioCtx) {
    sfxGain.gain.setValueAtTime(v, audioCtx.currentTime);
  }

  saveGame(false);
}

// ============================================================================
// 16. STATE PERSISTENCE & STORAGE SYSTEM (STAGE 4)
// ============================================================================

let saveStatusTimeout = null;

/**
 * Updates the Save Status badge with feedback text and a brief highlight.
 */
function showSaveStatus(message = "Saved ✓") {
  if (!DOM.saveStatusIndicator) return;

  DOM.saveStatusIndicator.textContent = message;
  DOM.saveStatusIndicator.classList.add("badge-saved");
  DOM.saveStatusIndicator.style.opacity = "1";

  if (saveStatusTimeout) clearTimeout(saveStatusTimeout);
  saveStatusTimeout = setTimeout(() => {
    if (DOM.saveStatusIndicator) {
      DOM.saveStatusIndicator.classList.remove("badge-saved");
      DOM.saveStatusIndicator.textContent = "Saved ✓";
      DOM.saveStatusIndicator.style.opacity = "0.8";
    }
  }, 2200);
}

/**
 * Saves current game state, customization, audio preferences, and statistics to localStorage.
 */
function saveGame(showBadge = true) {
  try {
    const saveData = {
      version: 1,
      timestamp: Date.now(),
      gameState: {
        currentState: gameState.currentState,
        needs: {
          hunger: gameState.needs.hunger,
          happiness: gameState.needs.happiness,
          energy: gameState.needs.energy,
          cleanliness: gameState.needs.cleanliness
        },
        health: gameState.health,
        score: gameState.score,
        equippedClothing: {
          head: gameState.equippedClothing.head,
          body: gameState.equippedClothing.body,
          accessory: gameState.equippedClothing.accessory
        },
        activeToy: gameState.activeToy
      },
      audioSettings: {
        isMuted: Boolean(gameState.audio.isMuted),
        ambienceVolume: gameState.audio.ambienceVolume,
        sfxVolume: gameState.audio.sfxVolume
      },
      statistics: {
        totalSessions: gameState.statistics.totalSessions,
        totalActionsPerformed: gameState.statistics.totalActionsPerformed,
        highScore: Math.max(gameState.statistics.highScore || 0, gameState.score)
      }
    };

    localStorage.setItem(CONFIG.STORAGE.KEY, JSON.stringify(saveData));

    if (showBadge) {
      showSaveStatus("Saved ✓");
    }
    return true;
  } catch (err) {
    console.warn("localStorage write failed (quota exceeded or disabled):", err);
    return false;
  }
}

/**
 * Starts periodic 10-second auto-save during active gameplay.
 */
function startAutoSaveTimer() {
  stopAutoSaveTimer();
  gameState.autoSaveTimerId = setInterval(() => {
    if (gameState.currentState === "playing") {
      saveGame(true);
    }
  }, CONFIG.STORAGE.AUTO_SAVE_INTERVAL_MS);
}

/**
 * Stops periodic auto-save.
 */
function stopAutoSaveTimer() {
  if (gameState.autoSaveTimerId !== null) {
    clearInterval(gameState.autoSaveTimerId);
    gameState.autoSaveTimerId = null;
  }
}

/**
 * Displays return notification banner after offline elapsed decay.
 */
function showAwayNotification(text) {
  if (!DOM.awayNotification || !DOM.awayText) return;
  DOM.awayText.textContent = text;
  DOM.awayNotification.style.display = "flex";
}

function hideAwayNotification() {
  if (DOM.awayNotification) {
    DOM.awayNotification.style.display = "none";
  }
}

/**
 * Validates and safely applies save data into gameState.
 * Clamps all needs to 0-100.
 * If calculateOfflineDecay is true and game was playing, decays needs safely (clamped to 0; Mochi never dies).
 */
function applySaveData(data, calculateOfflineDecay = false) {
  if (!data || typeof data !== "object") return false;
  if (!data.gameState || !data.gameState.needs) return false;

  const savedNeeds = data.gameState.needs;
  let hunger = clamp(typeof savedNeeds.hunger === "number" ? savedNeeds.hunger : 100, 0, 100);
  let happiness = clamp(typeof savedNeeds.happiness === "number" ? savedNeeds.happiness : 100, 0, 100);
  let energy = clamp(typeof savedNeeds.energy === "number" ? savedNeeds.energy : 100, 0, 100);
  let cleanliness = clamp(typeof savedNeeds.cleanliness === "number" ? savedNeeds.cleanliness : 100, 0, 100);

  // Offline / Away Elapsed Decay (Strictly clamped to 0)
  if (calculateOfflineDecay && data.gameState.currentState === "playing") {
    const savedTimestamp = typeof data.timestamp === "number" ? data.timestamp : Date.now();
    const elapsedSec = Math.max(0, Math.floor((Date.now() - savedTimestamp) / 1000));
    const ticks = Math.floor(elapsedSec / (CONFIG.DECAY_INTERVAL_MS / 1000)); // Every 3s = 1 tick
    const decayAmount = ticks * CONFIG.DECAY_AMOUNT_PER_TICK; // 2 points per tick

    if (decayAmount > 0) {
      hunger = clamp(hunger - decayAmount, 0, 100);
      happiness = clamp(happiness - decayAmount, 0, 100);
      energy = clamp(energy - decayAmount, 0, 100);
      cleanliness = clamp(cleanliness - decayAmount, 0, 100);
    }

    if (elapsedSec >= 60) {
      const mins = Math.floor(elapsedSec / 60);
      showAwayNotification(`While you were away for ${mins} minute${mins === 1 ? "" : "s"}, Mochi waited patiently in the forest.`);
    } else if (elapsedSec >= 6) {
      showAwayNotification(`While you were away for ${elapsedSec} seconds, Mochi waited patiently in the forest.`);
    }
  }

  gameState.needs.hunger = hunger;
  gameState.needs.happiness = happiness;
  gameState.needs.energy = energy;
  gameState.needs.cleanliness = cleanliness;
  gameState.health = calculateHealth();

  // Score
  gameState.score = Math.max(0, parseInt(data.gameState.score) || 0);

  // Clothing & Toys
  if (data.gameState.equippedClothing) {
    const head = data.gameState.equippedClothing.head;
    const body = data.gameState.equippedClothing.body;
    const acc = data.gameState.equippedClothing.accessory;

    const validHead = gameState.clothingItems.some(i => i.id === head && i.category === "head") ? head : null;
    const validBody = gameState.clothingItems.some(i => i.id === body && i.category === "body") ? body : null;
    gameState.equippedClothing = { head: validHead, body: validBody, accessory: acc || null };
  } else {
    gameState.equippedClothing = { head: null, body: null, accessory: null };
  }

  if (data.gameState.activeToy !== undefined) {
    const toy = data.gameState.activeToy;
    gameState.activeToy = gameState.toyItems.some(i => i.id === toy) ? toy : null;
  } else {
    gameState.activeToy = null;
  }

  // Audio Settings
  if (data.audioSettings) {
    gameState.audio.isMuted = Boolean(data.audioSettings.isMuted);
    if (typeof data.audioSettings.ambienceVolume === "number") {
      gameState.audio.ambienceVolume = clamp(data.audioSettings.ambienceVolume, 0, 1);
    }
    if (typeof data.audioSettings.sfxVolume === "number") {
      gameState.audio.sfxVolume = clamp(data.audioSettings.sfxVolume, 0, 1);
    }

    if (DOM.sliderAmbience) DOM.sliderAmbience.value = gameState.audio.ambienceVolume;
    if (DOM.sliderSfx) DOM.sliderSfx.value = gameState.audio.sfxVolume;
    if (DOM.muteIcon) DOM.muteIcon.textContent = gameState.audio.isMuted ? "🔇" : "🔊";
    if (DOM.btnMute) DOM.btnMute.title = gameState.audio.isMuted ? "Unmute Master (M)" : "Mute Master (M)";

    if (masterGain && audioCtx) {
      masterGain.gain.setValueAtTime(gameState.audio.isMuted ? 0 : 1.0, audioCtx.currentTime);
    }
    if (ambienceGain && audioCtx) {
      ambienceGain.gain.setValueAtTime(gameState.audio.ambienceVolume, audioCtx.currentTime);
    }
    if (sfxGain && audioCtx) {
      sfxGain.gain.setValueAtTime(gameState.audio.sfxVolume, audioCtx.currentTime);
    }
  }

  // Statistics
  if (data.statistics) {
    gameState.statistics.totalSessions = (parseInt(data.statistics.totalSessions) || 1) + (calculateOfflineDecay ? 1 : 0);
    gameState.statistics.totalActionsPerformed = parseInt(data.statistics.totalActionsPerformed) || 0;
    gameState.statistics.highScore = Math.max(parseInt(data.statistics.highScore) || 0, gameState.score);
  }

  // Game State
  const savedState = data.gameState.currentState;
  if (savedState === "playing") {
    gameState.currentState = "playing";
    startTimer();
    startAutoSaveTimer();
    updateAmbienceState();
  } else if (savedState === "paused") {
    gameState.currentState = "paused";
    stopTimer();
    stopAutoSaveTimer();
    updateAmbienceState();
  } else if (savedState === "ended") {
    gameState.currentState = "ended";
    stopTimer();
    stopAutoSaveTimer();
    updateAmbienceState();
  } else {
    gameState.currentState = "start";
    stopTimer();
    stopAutoSaveTimer();
    updateAmbienceState();
  }

  gameState.currentExpression = determineExpression();
  renderWardrobeOptions();
  updateUI();
  renderMochiPixelArt();
  return true;
}

/**
 * Loads save data from localStorage on startup. Falls back safely if missing or corrupt.
 */
function loadGame() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE.KEY);
    if (!raw) return false;

    let data;
    try {
      data = JSON.parse(raw);
    } catch (parseErr) {
      console.warn("Corrupted save data JSON, falling back safely to fresh session:", parseErr);
      return false;
    }

    return applySaveData(data, true);
  } catch (err) {
    console.warn("localStorage read failed:", err);
    return false;
  }
}

/**
 * Exports pet save data as downloadable JSON backup file.
 */
function exportSaveData() {
  saveGame(false);
  let raw = localStorage.getItem(CONFIG.STORAGE.KEY);
  if (!raw) {
    saveGame(false);
    raw = localStorage.getItem(CONFIG.STORAGE.KEY);
  }

  try {
    raw = JSON.stringify(JSON.parse(raw), null, 2);
  } catch (e) {}

  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mochi_save.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showSaveStatus("Save Exported! 💾");
}

function triggerImportSave() {
  if (DOM.fileImport) {
    DOM.fileImport.value = "";
    DOM.fileImport.click();
  }
}

function handleImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (applySaveData(data, false)) {
        saveGame(false);
        showSaveStatus("Save Imported! 📂");
      } else {
        alert("Invalid save file structure. Unable to restore pet.");
      }
    } catch (err) {
      alert("Could not parse JSON save file. Please ensure it is a valid Mochi backup.");
    }
  };
  reader.readAsText(file);
}

/**
 * Resets all pet data to pristine initial values with confirmation.
 */
function resetSaveData(bypassConfirm = false) {
  if (!bypassConfirm) {
    const confirmed = confirm("Are you sure you want to reset all pet data? Mochi will return to initial state.");
    if (!confirmed) return;
  }

  try {
    localStorage.removeItem(CONFIG.STORAGE.KEY);
  } catch (e) {
    console.warn("localStorage remove failed:", e);
  }

  stopTimer();
  stopAutoSaveTimer();
  clearCooldown();
  cancelTemporaryExpressions();

  gameState.currentState = "start";
  gameState.needs.hunger = 100;
  gameState.needs.happiness = 100;
  gameState.needs.energy = 100;
  gameState.needs.cleanliness = 100;
  gameState.health = 100;
  gameState.score = 0;
  gameState.currentExpression = "happy";
  gameState.isFirstAction = true;
  gameState.lastActionMessage = "";
  gameState.equippedClothing = { head: null, body: null, accessory: null };
  gameState.activeToy = null;
  gameState.statistics = { totalSessions: 1, totalActionsPerformed: 0, highScore: 0 };

  hideAwayNotification();
  renderWardrobeOptions();
  updateAmbienceState();
  updateUI();
  renderMochiPixelArt();

  showSaveStatus("Data Reset! 🗑");
}

// ============================================================================
// 17. EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
  // Care actions
  DOM.btnFeed.addEventListener("click", () => performAction("feed"));
  DOM.btnPlay.addEventListener("click", () => performAction("play"));
  DOM.btnSleep.addEventListener("click", () => performAction("sleep"));
  DOM.btnClean.addEventListener("click", () => performAction("clean"));

  // State controls
  DOM.btnStart.addEventListener("click", startGame);
  DOM.btnPause.addEventListener("click", pauseGame);
  DOM.btnResume.addEventListener("click", resumeGame);
  DOM.btnEnd.addEventListener("click", endGame);
  DOM.btnRestart.addEventListener("click", restartGame);

  // Audio Controls
  if (DOM.btnMute) {
    DOM.btnMute.addEventListener("click", toggleMasterMute);
  }
  if (DOM.sliderAmbience) {
    DOM.sliderAmbience.addEventListener("input", (e) => setAmbienceVolume(e.target.value));
  }
  if (DOM.sliderSfx) {
    DOM.sliderSfx.addEventListener("input", (e) => setSfxVolume(e.target.value));
  }

  // Wardrobe Drawer Toggle
  if (DOM.btnToggleWardrobe && DOM.wardrobeDrawer) {
    DOM.btnToggleWardrobe.addEventListener("click", () => {
      const isClosed = DOM.wardrobeDrawer.classList.toggle("drawer-closed");
      DOM.btnToggleWardrobe.setAttribute("aria-expanded", String(!isClosed));
      DOM.btnToggleWardrobe.textContent = isClosed ? "▼ Wardrobe & Toys" : "▲ Close Wardrobe";
    });
  }

  // Stage 4: Data Management & Away Toast Event Listeners
  if (DOM.btnExportSave) {
    DOM.btnExportSave.addEventListener("click", exportSaveData);
  }
  if (DOM.btnImportSave) {
    DOM.btnImportSave.addEventListener("click", triggerImportSave);
  }
  if (DOM.fileImport) {
    DOM.fileImport.addEventListener("change", (e) => {
      if (e.target.files && e.target.files[0]) {
        handleImportFile(e.target.files[0]);
      }
    });
  }
  if (DOM.btnResetData) {
    DOM.btnResetData.addEventListener("click", () => resetSaveData(false));
  }
  if (DOM.btnDismissAway) {
    DOM.btnDismissAway.addEventListener("click", hideAwayNotification);
  }

  // Stage 4: Auto-Save on page exit/refresh
  window.addEventListener("beforeunload", () => {
    saveGame(false);
  });

  window.addEventListener("resize", resizeBackground);

  // Global Keyboard Controls
  document.addEventListener("keydown", (event) => {
    if (event.repeat) return;

    const key = event.key.toLowerCase();
    let handled = false;

    // 'M' Key: Toggle Master Mute
    if (key === "m") {
      toggleMasterMute();
      handled = true;
    } else if (key === "w") {
      performAction("feed");
      handled = true;
    } else if (key === "a") {
      performAction("play");
      handled = true;
    } else if (key === "s") {
      performAction("sleep");
      handled = true;
    } else if (key === "d") {
      performAction("clean");
      handled = true;
    }

    if (handled) event.preventDefault();
  });
}

// ============================================================================
// 18. EXPOSE ON WINDOW & INITIALIZATION
// ============================================================================

window.gameState = gameState;
window.DOM = DOM;
window.CONFIG = CONFIG;
window.startGame = startGame;
window.pauseGame = pauseGame;
window.resumeGame = resumeGame;
window.endGame = endGame;
window.restartGame = restartGame;
window.gameTick = gameTick;
window.performAction = performAction;
window.startCooldown = startCooldown;
window.endCooldown = endCooldown;
window.clearCooldown = clearCooldown;
window.calculateHealth = calculateHealth;
window.determineExpression = determineExpression;
window.triggerExcited = triggerExcited;
window.triggerBlushing = triggerBlushing;
window.cancelTemporaryExpressions = cancelTemporaryExpressions;
window.updateUI = updateUI;
window.renderMochiPixelArt = renderMochiPixelArt;

// Audio exports for testing
window.initAudio = initAudio;
window.toggleMasterMute = toggleMasterMute;
window.setAmbienceVolume = setAmbienceVolume;
window.setSfxVolume = setSfxVolume;
window.playSoundEffect = playSoundEffect;
window.spawnParticles = spawnParticles;

// Stage 4 State & Storage exports
window.saveGame = saveGame;
window.loadGame = loadGame;
window.applySaveData = applySaveData;
window.exportSaveData = exportSaveData;
window.importSaveData = handleImportFile;
window.resetSaveData = resetSaveData;
window.showSaveStatus = showSaveStatus;
window.startAutoSaveTimer = startAutoSaveTimer;
window.stopAutoSaveTimer = stopAutoSaveTimer;
window.showAwayNotification = showAwayNotification;
window.hideAwayNotification = hideAwayNotification;

// Initialize
setupEventListeners();
resizeBackground();
loadGame(); // Stage 4: Rehydrate save if present
updateUI();
requestAnimationFrame(animationLoop);
