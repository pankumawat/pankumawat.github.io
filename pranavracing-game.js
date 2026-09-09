'use strict';

/* =========================================================
   LANE RUSH - a simple 3-lane traffic dodge game
   Rendered with Three.js (real 3D, lighting & shadows).
========================================================= */

if (typeof THREE === 'undefined') {
  alert('Failed to load the 3D engine (Three.js). Check your internet connection and reload.');
  throw new Error('THREE is not defined');
}

// Hide the loading screen as soon as the slow part (the Three.js network
// fetch) is done, rather than waiting for the rest of this script to finish -
// that way a bug anywhere below can never leave a click-blocking overlay stuck up.
window.addEventListener('error', () => {
  const el = document.getElementById('loading-screen');
  if (el) el.classList.add('hidden');
});
document.getElementById('loading-screen').classList.add('hidden');

// ---------- DOM ----------
const canvasEl = document.getElementById('game-canvas');
const previewCanvas = document.getElementById('preview-canvas');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const hud = document.getElementById('hud');
const scoreLineEl = document.getElementById('score-line');
const distanceLineEl = document.getElementById('distance-line');
const scorePopupEl = document.getElementById('score-popup');
const speedEl = document.getElementById('speed');
const bestLineEl = document.getElementById('best-line');
const startBestLineEl = document.getElementById('start-best-line');
const finalScoreEl = document.getElementById('final-score');
const finalDistanceEl = document.getElementById('final-distance');
const finalBestEl = document.getElementById('final-best');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const tutorialBanner = document.getElementById('tutorial-banner');
const tutorialText = document.getElementById('tutorial-text');
const tutorialDotEls = Array.from(document.querySelectorAll('.tutorial-dot'));
const mobileOptions = document.getElementById('mobile-options');
const autoSpeedToggle = document.getElementById('auto-speed-toggle');
const mobileControls = document.getElementById('mobile-controls');
const brakeBtn = document.getElementById('brake-btn');
const jumpBtn = document.getElementById('jump-btn');
const accelBtn = document.getElementById('accel-btn');
const leftBtn = document.getElementById('left-btn');
const rightBtn = document.getElementById('right-btn');
const muteBtn = document.getElementById('mute-btn');
const loadingScreen = document.getElementById('loading-screen');
const speedVignetteEl = document.getElementById('speed-vignette');
const crashFlashEl = document.getElementById('crash-flash');

function hexColor(str) {
  return parseInt(str.replace('#', ''), 16);
}

// ---------- Audio (procedural, Web Audio API - no external assets) ----------
let audioCtx = null;
let audioEnabled = true;
let engineOsc = null;
let engineOsc2 = null;
let engineGain = null;

function ensureAudioContext() {
  if (audioCtx) return audioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  audioCtx = new Ctx();
  return audioCtx;
}

function startEngineSound() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  currentGear = 0;
  if (engineOsc) return;

  engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  engineGain.connect(ctx.destination);

  engineOsc = ctx.createOscillator();
  engineOsc.type = 'sawtooth';
  engineOsc.frequency.value = 60;
  engineOsc.connect(engineGain);
  engineOsc.start();

  engineOsc2 = ctx.createOscillator();
  engineOsc2.type = 'triangle';
  engineOsc2.frequency.value = 90;
  const overtoneGain = ctx.createGain();
  overtoneGain.gain.value = 0.5;
  engineOsc2.connect(overtoneGain);
  overtoneGain.connect(engineGain);
  engineOsc2.start();
}

function stopEngineSound() {
  if (!engineOsc) return;
  try {
    engineOsc.stop();
    engineOsc2.stop();
  } catch (e) {
    // already stopped
  }
  engineOsc = null;
  engineOsc2 = null;
  engineGain = null;
}

// Simulated manual-transmission gears: pitch climbs (like rising RPM) through
// each gear's speed band, then snaps back down at the shift point instead of
// climbing smoothly forever, with an audible "thunk" at the moment of the shift.
// Shifts are deliberately bunched up at low speed and spread out at high speed,
// like a real gearbox (quick early shifts, long legs in the higher gears).
const GEAR_SHIFT_POINTS = [10, 30, 60, 100, 150, 220, 300]; // km/h
let currentGear = 0;

function getGearBand(speedKmh) {
  let lower = 0;
  for (let i = 0; i < GEAR_SHIFT_POINTS.length; i++) {
    if (speedKmh < GEAR_SHIFT_POINTS[i]) {
      return { gear: i, lower, upper: GEAR_SHIFT_POINTS[i] };
    }
    lower = GEAR_SHIFT_POINTS[i];
  }
  return { gear: GEAR_SHIFT_POINTS.length, lower, upper: MAX_SPEED };
}

function playGearShiftThunk() {
  if (!audioEnabled || !engineGain || !audioCtx) return;
  const t = audioCtx.currentTime;
  const g = engineGain.gain.value;
  engineGain.gain.cancelScheduledValues(t);
  engineGain.gain.setValueAtTime(g, t);
  engineGain.gain.linearRampToValueAtTime(g * 0.25, t + 0.05);
  engineGain.gain.linearRampToValueAtTime(g, t + 0.14);
  playTone(180, 0.09, 'square', 0.07, 80);
}

function updateEngineSound(currentSpeed) {
  if (!engineOsc || !audioCtx) return;
  const t = audioCtx.currentTime;

  const { gear, lower, upper } = getGearBand(currentSpeed);
  if (gear !== currentGear) {
    currentGear = gear;
    playGearShiftThunk();
  }
  const gearProgress = (currentSpeed - lower) / Math.max(1, upper - lower);

  const freq = 70 + gearProgress * 170;
  engineOsc.frequency.setTargetAtTime(freq, t, 0.04);
  engineOsc2.frequency.setTargetAtTime(freq * 1.5, t, 0.04);
  const targetGain = audioEnabled ? 0.05 + Math.min(1, currentSpeed / MAX_SPEED) * 0.05 : 0;
  engineGain.gain.setTargetAtTime(targetGain, t, 0.1);
}

function playTone(freq, duration, type, volume, sweepTo) {
  const ctx = ensureAudioContext();
  if (!ctx || !audioEnabled) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  if (sweepTo) osc.frequency.linearRampToValueAtTime(sweepTo, ctx.currentTime + duration);
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playJumpSound() {
  playTone(300, 0.25, 'triangle', 0.15, 700);
}

function playPenaltySound() {
  playTone(400, 0.2, 'sawtooth', 0.12, 150);
}

function playClickSound() {
  playTone(500, 0.08, 'sine', 0.08);
}

function playCrashSound() {
  const ctx = ensureAudioContext();
  if (!ctx || !audioEnabled) return;
  playTone(120, 0.4, 'square', 0.25, 40);
  const bufferSize = Math.floor(ctx.sampleRate * 0.3);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.3;
  noise.connect(noiseGain);
  noiseGain.connect(ctx.destination);
  noise.start();
}

muteBtn.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  muteBtn.textContent = audioEnabled ? 'Sound: On' : 'Sound: Off';
});

// ---------- Mobile: touch controls ----------
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
let autoSpeedEnabled = false; // only ever meaningful on touch devices - set at Start based on the toggle

if (isTouchDevice) {
  mobileOptions.classList.remove('hidden');
} else {
  accelBtn.classList.add('hidden');
}

autoSpeedToggle.addEventListener('change', () => {
  autoSpeedEnabled = isTouchDevice && autoSpeedToggle.checked;
  accelBtn.classList.toggle('hidden', autoSpeedEnabled || !isTouchDevice);
});

function bindHoldButton(el, code) {
  const press = (e) => { e.preventDefault(); keys[code] = true; };
  const release = (e) => { e.preventDefault(); keys[code] = false; };
  el.addEventListener('touchstart', press, { passive: false });
  el.addEventListener('touchend', release);
  el.addEventListener('touchcancel', release);
  el.addEventListener('mousedown', press);
  el.addEventListener('mouseup', release);
  el.addEventListener('mouseleave', release);
}

function triggerJump() {
  if (state !== 'playing' && state !== 'tutorial') return;
  if (!player.jumping) {
    player.jumping = true;
    player.jumpT = 0;
    playJumpSound();
  }
  if (state === 'tutorial') tutorialFlags.space = true;
}

jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); triggerJump(); });
jumpBtn.addEventListener('mousedown', () => triggerJump());

function triggerLaneLeft() {
  if (state !== 'playing' && state !== 'tutorial') return;
  player.lane = Math.max(0, player.lane - 1);
  if (state === 'tutorial') tutorialFlags.left = true;
}

function triggerLaneRight() {
  if (state !== 'playing' && state !== 'tutorial') return;
  player.lane = Math.min(2, player.lane + 1);
  if (state === 'tutorial') tutorialFlags.right = true;
}

leftBtn.addEventListener('touchstart', (e) => { e.preventDefault(); triggerLaneLeft(); });
leftBtn.addEventListener('mousedown', () => triggerLaneLeft());
rightBtn.addEventListener('touchstart', (e) => { e.preventDefault(); triggerLaneRight(); });
rightBtn.addEventListener('mousedown', () => triggerLaneRight());

bindHoldButton(brakeBtn, 'ArrowDown');
bindHoldButton(accelBtn, 'ArrowUp');

// ---------- World constants ----------
const LANE_WIDTH = 3.2;
const LANES = [0, 1, 2];
const LANE_X = [-LANE_WIDTH, 0, LANE_WIDTH];
const ROAD_HALF_WIDTH = LANE_WIDTH * 1.5 + 0.4;

const Z_PLAYER = 0;
const Z_SPAWN = -220;
const Z_COLLIDE = -3;
const Z_REMOVE = 8;
const ROAD_LENGTH = Math.abs(Z_SPAWN) + Z_REMOVE + 30;
const ROAD_CENTER_Z = (Z_SPAWN + Z_REMOVE) / 2;

const MIN_SPEED = 0;
const MAX_SPEED = 330;
const BRAKE = 130;
const FRICTION = 12;

// Acceleration profile tuned by simulation to hit real-car-feeling checkpoints:
// 0-100 km/h in ~6s, 0-200 km/h in ~15s, 0-330 km/h (top speed) in ~30s.
// (The smoothing ramp in update() also softens any jump between these bands.)
function accelForSpeed(speedKmh) {
  if (speedKmh < 100) return 21;
  if (speedKmh < 200) return 11.2;
  return 8.7;
}
const JUMP_DURATION = 0.85;
const JUMP_HEIGHT = 3.4; // tall enough to visually clear even the bus (height ~2.9)
const TRAFFIC_BASE_SPEED = 16; // baseline closing speed so traffic still approaches at low player speed

// Scoring: points accrue faster the faster you're going, and jumping over
// traffic instead of changing lanes costs you a small penalty.
const SCORE_SPEED_FACTOR = 0.12; // points per (km/h * second)
const JUMP_BYPASS_PENALTY = 200;
const TOP_SCORE_KEY = 'pranavRacingTopScore';

function loadTopScore() {
  try {
    return Number(localStorage.getItem(TOP_SCORE_KEY)) || 0;
  } catch (e) {
    return 0;
  }
}
function saveTopScore(value) {
  try {
    localStorage.setItem(TOP_SCORE_KEY, String(Math.floor(value)));
  } catch (e) {
    // storage unavailable (e.g. private browsing) - top score just won't persist
  }
}
let topScore = loadTopScore();
startBestLineEl.textContent = `Best Score: ${Math.floor(topScore)}`;

function showScorePopup(delta) {
  scorePopupEl.textContent = delta > 0 ? `+${delta}` : `${delta}`;
  scorePopupEl.style.color = delta > 0 ? '#06d6a0' : '#ff6b6b';
  scorePopupEl.classList.remove('pop');
  void scorePopupEl.offsetWidth; // restart the CSS animation
  scorePopupEl.classList.add('pop');
}

const TRAFFIC_TYPES = ['car', 'motorcycle', 'truck', 'bus'];
const TRAFFIC_COLORS = [0xadb5bd, 0x495057, 0x6d597a, 0x118ab2, 0xef476f, 0xffd166, 0x06d6a0, 0x2b2b2b];

const VEHICLE_SPECS = {
  motorcycle: { width: 0.7, height: 1.3, length: 2.0, wheelRadius: 0.32 },
  car: { width: 1.85, height: 1.4, length: 4.4, wheelRadius: 0.36 },
  truck: { width: 2.3, height: 2.6, length: 7.2, wheelRadius: 0.46 },
  bus: { width: 2.4, height: 2.9, length: 9.4, wheelRadius: 0.42 },
};

// ---------- Shared materials ----------
const WHEEL_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.85, metalness: 0.1 });
const GLASS_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x1b2530, roughness: 0.15, metalness: 0.6, transparent: true, opacity: 0.85 });
const HEADLIGHT_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff2b0, emissiveIntensity: 1.2, roughness: 0.4 });
const TAILLIGHT_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xff3b3b, emissive: 0xcc1111, emissiveIntensity: 1.0, roughness: 0.4 });
const SILVER_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xd6d9dc, roughness: 0.5, metalness: 0.4 });
const CHROME_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x999999, roughness: 0.3, metalness: 0.8 });
const GRILLE_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.6, metalness: 0.3 });
const BUMPER_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x232323, roughness: 0.55, metalness: 0.2 });
const PLATE_MATERIAL = new THREE.MeshStandardMaterial({ color: 0xf0f0e8, roughness: 0.5 });
const EXHAUST_MATERIAL = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.4, metalness: 0.7 });
const SHARED_MATERIALS = new Set([
  WHEEL_MATERIAL, GLASS_MATERIAL, HEADLIGHT_MATERIAL, TAILLIGHT_MATERIAL, SILVER_MATERIAL, CHROME_MATERIAL,
  GRILLE_MATERIAL, BUMPER_MATERIAL, PLATE_MATERIAL, EXHAUST_MATERIAL,
]);

function bodyMaterial(colorHex) {
  return new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.55, metalness: 0.25 });
}

function box(w, h, d, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function wheelPivot(radius, axleWidth) {
  const pivot = new THREE.Group();
  const wheelGroup = new THREE.Group();
  pivot.add(wheelGroup);

  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, axleWidth, 20), WHEEL_MATERIAL);
  mesh.castShadow = true;
  wheelGroup.add(mesh);

  // alloy-style hub + spokes, poking a hair past the tire's flat faces for a two-tone rim
  const hubRadius = radius * 0.56;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(hubRadius, hubRadius, axleWidth + 0.015, 14), CHROME_MATERIAL);
  wheelGroup.add(hub);
  const spokeGeo = new THREE.BoxGeometry(hubRadius * 1.7, axleWidth + 0.016, radius * 0.13);
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(spokeGeo, CHROME_MATERIAL);
    spoke.rotation.y = (i / 5) * Math.PI * 2;
    wheelGroup.add(spoke);
  }

  pivot.rotation.z = Math.PI / 2;
  pivot.userData.spinMesh = wheelGroup; // rotate tire + hub + spokes together
  return pivot;
}

function disposeVehicle(group) {
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry.dispose();
      if (!SHARED_MATERIALS.has(obj.material)) obj.material.dispose();
    }
  });
}

// ---------- Vehicle builders ----------
// Convention: front (headlights) faces local -z, rear (taillights) faces local +z.

function buildCar(colorHex) {
  const spec = VEHICLE_SPECS.car;
  const group = new THREE.Group();
  const mat = bodyMaterial(colorHex);
  const clearance = spec.wheelRadius * 0.55;

  const lowerH = spec.height * 0.52;
  const lower = box(spec.width, lowerH, spec.length, mat);
  lower.position.y = clearance + lowerH / 2;
  group.add(lower);

  const cabinH = spec.height * 0.46;
  const cabinLen = spec.length * 0.5;
  const cabinY = clearance + lowerH + cabinH / 2;
  const cabin = box(spec.width * 0.84, cabinH, cabinLen, mat);
  cabin.position.set(0, cabinY, -spec.length * 0.02);
  group.add(cabin);

  const windshield = box(spec.width * 0.78, cabinH * 0.82, 0.08, GLASS_MATERIAL);
  windshield.castShadow = false;
  windshield.receiveShadow = false;
  windshield.position.set(0, cabinY, cabin.position.z - cabinLen / 2 - 0.06);
  group.add(windshield);
  const rearGlass = windshield.clone();
  rearGlass.position.z = cabin.position.z + cabinLen / 2 + 0.06;
  group.add(rearGlass);

  const mirrorGeo = new THREE.BoxGeometry(0.12, 0.12, 0.22);
  for (const side of [-1, 1]) {
    const mirror = new THREE.Mesh(mirrorGeo, mat);
    mirror.position.set(side * (spec.width / 2 + 0.06), cabinY + cabinH * 0.15, windshield.position.z);
    mirror.castShadow = true;
    group.add(mirror);
  }

  for (const side of [-1, 1]) {
    const headlight = box(0.22, 0.16, 0.08, HEADLIGHT_MATERIAL);
    headlight.position.set(side * spec.width * 0.32, clearance + lowerH * 0.55, -spec.length / 2 + 0.02);
    group.add(headlight);
    const taillight = box(0.22, 0.16, 0.08, TAILLIGHT_MATERIAL);
    taillight.position.set(side * spec.width * 0.32, clearance + lowerH * 0.55, spec.length / 2 - 0.02);
    group.add(taillight);
  }

  const grille = box(spec.width * 0.42, lowerH * 0.3, 0.05, GRILLE_MATERIAL);
  grille.position.set(0, clearance + lowerH * 0.55, -spec.length / 2 + 0.03);
  group.add(grille);

  const frontBumper = box(spec.width * 1.02, lowerH * 0.24, 0.14, BUMPER_MATERIAL);
  frontBumper.position.set(0, clearance + lowerH * 0.14, -spec.length / 2 - 0.02);
  group.add(frontBumper);
  const rearBumper = frontBumper.clone();
  rearBumper.position.z = spec.length / 2 + 0.02;
  group.add(rearBumper);

  const plate = box(0.26, 0.13, 0.02, PLATE_MATERIAL);
  plate.castShadow = false;
  plate.receiveShadow = false;
  plate.position.set(0, clearance + lowerH * 0.3, spec.length / 2 + 0.09);
  group.add(plate);

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 10), EXHAUST_MATERIAL);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(spec.width * 0.32, clearance * 0.6, spec.length / 2 + 0.05);
  exhaust.castShadow = true;
  group.add(exhaust);

  const wheels = [];
  const wheelZ = spec.length * 0.32;
  const wheelX = spec.width / 2 + 0.03;
  for (const zSign of [-1, 1]) {
    for (const xSign of [-1, 1]) {
      const pivot = wheelPivot(spec.wheelRadius, 0.28);
      pivot.position.set(xSign * wheelX, spec.wheelRadius, zSign * wheelZ);
      group.add(pivot);
      wheels.push(pivot);
    }
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = spec.wheelRadius;
  return group;
}

function buildMotorcycle(colorHex) {
  const spec = VEHICLE_SPECS.motorcycle;
  const group = new THREE.Group();
  const mat = bodyMaterial(colorHex);
  const clearance = spec.wheelRadius * 0.5;

  const frame = box(0.28, 0.3, spec.length * 0.55, mat);
  frame.position.set(0, clearance + 0.4, 0);
  group.add(frame);

  const tank = box(0.34, 0.22, 0.5, mat);
  tank.position.set(0, clearance + 0.62, -spec.length * 0.12);
  group.add(tank);

  const seat = box(0.3, 0.1, 0.6, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 }));
  seat.position.set(0, clearance + 0.56, spec.length * 0.18);
  group.add(seat);

  // rider
  const rider = new THREE.Group();
  const torso = box(0.32, 0.55, 0.3, new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.6 }));
  torso.position.set(0, clearance + 0.95, spec.length * 0.05);
  torso.rotation.x = -0.35;
  rider.add(torso);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.4 }));
  helmet.position.set(0, clearance + 1.28, -spec.length * 0.08);
  helmet.castShadow = true;
  rider.add(helmet);
  group.add(rider);

  const headlight = box(0.16, 0.14, 0.06, HEADLIGHT_MATERIAL);
  headlight.position.set(0, clearance + 0.55, -spec.length / 2 + 0.05);
  group.add(headlight);
  const taillight = box(0.14, 0.1, 0.06, TAILLIGHT_MATERIAL);
  taillight.position.set(0, clearance + 0.6, spec.length / 2 - 0.05);
  group.add(taillight);

  // front fork + handlebar
  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 8), CHROME_MATERIAL);
  fork.position.set(0, clearance + 0.35, -spec.length * 0.34);
  fork.rotation.z = 0.15;
  fork.castShadow = true;
  group.add(fork);

  const handlebar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.46, 8), CHROME_MATERIAL);
  handlebar.rotation.z = Math.PI / 2;
  handlebar.position.set(0, clearance + 0.68, -spec.length * 0.3);
  handlebar.castShadow = true;
  group.add(handlebar);

  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.55, 8), EXHAUST_MATERIAL);
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(spec.width * 0.42, clearance + 0.22, spec.length * 0.1);
  exhaust.castShadow = true;
  group.add(exhaust);

  const wheels = [];
  for (const zSign of [-1, 1]) {
    const pivot = wheelPivot(spec.wheelRadius, 0.16);
    pivot.position.set(0, spec.wheelRadius, zSign * spec.length * 0.36);
    group.add(pivot);
    wheels.push(pivot);
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = spec.wheelRadius;
  return group;
}

function buildTruck(colorHex) {
  const spec = VEHICLE_SPECS.truck;
  const group = new THREE.Group();
  const cabMat = bodyMaterial(colorHex);
  const clearance = spec.wheelRadius * 0.5;

  const cabLen = spec.length * 0.22;
  const cabH = spec.height * 0.62;
  const cab = box(spec.width * 0.95, cabH, cabLen, cabMat);
  cab.position.set(0, clearance + cabH / 2, -spec.length / 2 + cabLen / 2);
  group.add(cab);

  const windshield = box(spec.width * 0.86, cabH * 0.5, 0.08, GLASS_MATERIAL);
  windshield.castShadow = false;
  windshield.receiveShadow = false;
  windshield.position.set(0, clearance + cabH * 0.72, cab.position.z - cabLen / 2 - 0.06);
  group.add(windshield);

  const cargoLen = spec.length * 0.72;
  const cargo = box(spec.width, spec.height, cargoLen, SILVER_MATERIAL);
  cargo.position.set(0, clearance + spec.height / 2, spec.length / 2 - cargoLen / 2);
  group.add(cargo);

  const stripe = box(spec.width + 0.08, 0.18, cargoLen - 0.2, bodyMaterial(colorHex));
  stripe.castShadow = false;
  stripe.receiveShadow = false;
  stripe.position.set(0, clearance + spec.height * 0.32, cargo.position.z);
  group.add(stripe);

  for (const side of [-1, 1]) {
    const headlight = box(0.2, 0.16, 0.08, HEADLIGHT_MATERIAL);
    headlight.position.set(side * spec.width * 0.36, clearance + cabH * 0.3, -spec.length / 2 + 0.02);
    group.add(headlight);
    const taillight = box(0.22, 0.3, 0.08, TAILLIGHT_MATERIAL);
    taillight.position.set(side * spec.width * 0.4, clearance + spec.height * 0.35, spec.length / 2 - 0.02);
    group.add(taillight);

    const mirror = box(0.14, 0.22, 0.12, BUMPER_MATERIAL);
    mirror.position.set(side * (spec.width * 0.95 / 2 + 0.1), clearance + cabH * 0.85, windshield.position.z);
    group.add(mirror);
  }

  const grille = box(spec.width * 0.7, cabH * 0.28, 0.05, GRILLE_MATERIAL);
  grille.position.set(0, clearance + cabH * 0.16, -spec.length / 2 + 0.03);
  group.add(grille);

  const frontBumper = box(spec.width, cabH * 0.2, 0.14, BUMPER_MATERIAL);
  frontBumper.position.set(0, clearance + cabH * 0.06, -spec.length / 2 - 0.02);
  group.add(frontBumper);

  const plate = box(0.3, 0.15, 0.02, PLATE_MATERIAL);
  plate.castShadow = false;
  plate.receiveShadow = false;
  plate.position.set(0, clearance + spec.height * 0.12, spec.length / 2 + 0.01);
  group.add(plate);

  const exhaustStack = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, cabH * 1.1, 10), EXHAUST_MATERIAL);
  exhaustStack.position.set(spec.width * 0.42, clearance + cabH * 1.1 + cabH * 0.55, cab.position.z + cabLen * 0.3);
  exhaustStack.castShadow = true;
  group.add(exhaustStack);

  const wheels = [];
  const wheelX = spec.width / 2 + 0.05;
  const axleZs = [-spec.length / 2 + cabLen * 0.6, spec.length / 2 - cargoLen * 0.28, spec.length / 2 - cargoLen * 0.08];
  for (const z of axleZs) {
    for (const xSign of [-1, 1]) {
      const pivot = wheelPivot(spec.wheelRadius, 0.32);
      pivot.position.set(xSign * wheelX, spec.wheelRadius, z);
      group.add(pivot);
      wheels.push(pivot);
    }
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = spec.wheelRadius;
  return group;
}

function buildBus(colorHex) {
  const spec = VEHICLE_SPECS.bus;
  const group = new THREE.Group();
  const mat = bodyMaterial(colorHex);
  const clearance = spec.wheelRadius * 0.45;

  const body = box(spec.width, spec.height, spec.length, mat);
  body.position.y = clearance + spec.height / 2;
  group.add(body);

  const windowStripH = spec.height * 0.32;
  const windowStrip = box(spec.width + 0.04, windowStripH, spec.length * 0.86, GLASS_MATERIAL);
  windowStrip.castShadow = false;
  windowStrip.receiveShadow = false;
  windowStrip.position.set(0, clearance + spec.height * 0.62, 0);
  group.add(windowStrip);

  // window mullions (visual segmentation of the glass strip)
  const mullionMat = mat;
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    const z = -spec.length * 0.4 + (i / (segments - 1)) * spec.length * 0.8;
    const mullion = box(spec.width + 0.12, windowStripH, 0.06, mullionMat);
    mullion.castShadow = false;
    mullion.receiveShadow = false;
    mullion.position.set(0, clearance + spec.height * 0.62, z);
    group.add(mullion);
  }

  const windshield = box(spec.width * 0.9, spec.height * 0.4, 0.08, GLASS_MATERIAL);
  windshield.castShadow = false;
  windshield.receiveShadow = false;
  windshield.position.set(0, clearance + spec.height * 0.6, -spec.length / 2 - 0.06);
  group.add(windshield);

  const roofVent = box(spec.width * 0.4, 0.18, spec.length * 0.15, SILVER_MATERIAL);
  roofVent.position.set(0, clearance + spec.height + 0.11, -spec.length * 0.2);
  group.add(roofVent);

  for (const side of [-1, 1]) {
    const headlight = box(0.22, 0.18, 0.08, HEADLIGHT_MATERIAL);
    headlight.position.set(side * spec.width * 0.38, clearance + spec.height * 0.2, -spec.length / 2 + 0.02);
    group.add(headlight);
    const taillight = box(0.22, 0.3, 0.08, TAILLIGHT_MATERIAL);
    taillight.position.set(side * spec.width * 0.4, clearance + spec.height * 0.28, spec.length / 2 - 0.02);
    group.add(taillight);

    const mirror = box(0.14, 0.24, 0.12, BUMPER_MATERIAL);
    mirror.position.set(side * (spec.width / 2 + 0.1), clearance + spec.height * 0.5, windshield.position.z);
    group.add(mirror);
  }

  const frontBumper = box(spec.width, spec.height * 0.14, 0.14, BUMPER_MATERIAL);
  frontBumper.position.set(0, clearance + spec.height * 0.07, -spec.length / 2 - 0.02);
  group.add(frontBumper);

  const plate = box(0.3, 0.15, 0.02, PLATE_MATERIAL);
  plate.castShadow = false;
  plate.receiveShadow = false;
  plate.position.set(0, clearance + spec.height * 0.15, spec.length / 2 + 0.01);
  group.add(plate);

  const wheels = [];
  const wheelX = spec.width / 2 + 0.05;
  const axleZs = [-spec.length * 0.32, spec.length * 0.32];
  for (const z of axleZs) {
    for (const xSign of [-1, 1]) {
      const pivot = wheelPivot(spec.wheelRadius, 0.34);
      pivot.position.set(xSign * wheelX, spec.wheelRadius, z);
      group.add(pivot);
      wheels.push(pivot);
    }
  }
  group.userData.wheels = wheels;
  group.userData.wheelRadius = spec.wheelRadius;
  return group;
}

function buildVehicle(type, colorHex) {
  switch (type) {
    case 'motorcycle': return buildMotorcycle(colorHex);
    case 'truck': return buildTruck(colorHex);
    case 'bus': return buildBus(colorHex);
    default: return buildCar(colorHex);
  }
}

// ---------- Main scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec9ea);
scene.fog = new THREE.Fog(0x8ec9ea, 45, 210);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 500);
const CAMERA_HEIGHT = 4.0;
const CAMERA_BACK = 7.5;
camera.position.set(0, CAMERA_HEIGHT, Z_PLAYER + CAMERA_BACK);

const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;

function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
onResize();

// ---------- Lighting ----------
scene.add(new THREE.HemisphereLight(0xbfe3f5, 0x3d5a2d, 0.85));

const sunLight = new THREE.DirectionalLight(0xfff4da, 1.0);
sunLight.position.set(25, 40, 25);
sunLight.target.position.set(0, 0, -10);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.left = -20;
sunLight.shadow.camera.right = 20;
sunLight.shadow.camera.top = 30;
sunLight.shadow.camera.bottom = -40;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 100;
sunLight.shadow.bias = -0.002;
scene.add(sunLight);
scene.add(sunLight.target);

const sun = new THREE.Mesh(new THREE.SphereGeometry(6, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff4da }));
sun.position.set(70, 55, -140);
scene.add(sun);

// ---------- Ground & road ----------
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 500),
  new THREE.MeshStandardMaterial({ color: 0x4c7a3d, roughness: 1 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(ROAD_HALF_WIDTH * 2, ROAD_LENGTH),
  new THREE.MeshStandardMaterial({ color: 0x33363d, roughness: 0.95 })
);
road.rotation.x = -Math.PI / 2;
road.position.set(0, 0.01, ROAD_CENTER_Z);
road.receiveShadow = true;
scene.add(road);

function createDashTexture() {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 128;
  const cx = c.getContext('2d');
  cx.clearRect(0, 0, 8, 128);
  cx.fillStyle = '#ffffff';
  cx.fillRect(0, 0, 8, 60);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  const tileWorldLength = 6;
  tex.repeat.set(1, ROAD_LENGTH / tileWorldLength);
  return tex;
}
const dashTexture = createDashTexture();
const dashMaterial = new THREE.MeshBasicMaterial({ map: dashTexture, transparent: true, depthWrite: false });

for (const x of [-LANE_WIDTH / 2, LANE_WIDTH / 2]) {
  const divider = new THREE.Mesh(new THREE.PlaneGeometry(0.16, ROAD_LENGTH), dashMaterial);
  divider.rotation.x = -Math.PI / 2;
  divider.position.set(x, 0.03, ROAD_CENTER_Z);
  scene.add(divider);
}

const edgeMaterial = new THREE.MeshBasicMaterial({ color: 0xf1faee });
for (const x of [-ROAD_HALF_WIDTH, ROAD_HALF_WIDTH]) {
  const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.18, ROAD_LENGTH), edgeMaterial);
  edge.rotation.x = -Math.PI / 2;
  edge.position.set(x, 0.03, ROAD_CENTER_Z);
  scene.add(edge);
}

// ---------- Roadside scenery (scrolls toward the camera at the car's own speed) ----------
const SCENERY_RECYCLE_Z = Z_REMOVE + 25;
const SCENERY_SPAN = SCENERY_RECYCLE_Z - Z_SPAWN;
const scenery = [];

function addScenery(x, z, children) {
  const group = new THREE.Group();
  for (const child of children) group.add(child);
  group.position.set(x, 0, z);
  scene.add(group);
  scenery.push(group);
}

const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.3 });
const signMat = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.5 });
for (let z = Z_SPAWN; z < Z_REMOVE + 20; z += 22) {
  for (const side of [-1, 1]) {
    const x = side * (ROAD_HALF_WIDTH + 1.4);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 8), poleMat);
    post.position.y = 1.3;
    post.castShadow = true;
    post.receiveShadow = true;
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), signMat);
    sign.position.y = 2.5;
    sign.castShadow = true;
    addScenery(x, z, [post, sign]);
  }
}

const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1 });
const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2f5d34, roughness: 1 });
for (let i = 0; i < 46; i++) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const x = side * (ROAD_HALF_WIDTH + 5 + Math.random() * 22);
  const z = Z_SPAWN + Math.random() * (Math.abs(Z_SPAWN) + Z_REMOVE + 25);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6), trunkMat);
  trunk.position.y = 0.8;
  trunk.castShadow = true;
  const foliage = new THREE.Mesh(new THREE.ConeGeometry(1.3 + Math.random() * 0.5, 2.6, 8), foliageMat);
  foliage.position.y = 2.4;
  foliage.castShadow = true;
  addScenery(x, z, [trunk, foliage]);
}

function updateScenery(dt) {
  const scrollSpeed = speed / 3.6; // matches the car's own speed exactly
  for (const group of scenery) {
    group.position.z += scrollSpeed * dt;
    if (group.position.z > SCENERY_RECYCLE_Z) {
      group.position.z -= SCENERY_SPAN;
    }
  }
}

// ---------- Preview scene (start screen) ----------
const previewScene = new THREE.Scene();
previewScene.background = new THREE.Color(0x2b3648);
const previewCamera = new THREE.PerspectiveCamera(35, previewCanvas.width / previewCanvas.height, 0.1, 80);
const PREVIEW_DIR = new THREE.Vector3(3.4, 2.1, 4.6).normalize();
const previewRenderer = new THREE.WebGLRenderer({ canvas: previewCanvas, antialias: true });
previewRenderer.setSize(previewCanvas.width, previewCanvas.height, false);
previewRenderer.outputEncoding = THREE.sRGBEncoding;
previewRenderer.toneMapping = THREE.ACESFilmicToneMapping;
previewScene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.1));
const previewKey = new THREE.DirectionalLight(0xffffff, 0.9);
previewKey.position.set(3, 5, 4);
previewScene.add(previewKey);

let previewGroup = null;
function rebuildPreview() {
  if (previewGroup) {
    previewScene.remove(previewGroup);
    disposeVehicle(previewGroup);
  }
  previewGroup = buildVehicle(selectedVehicle, hexColor(selectedColor));
  previewScene.add(previewGroup);

  const spec = VEHICLE_SPECS[selectedVehicle];
  const dist = spec.length * 1.3 + 1.5;
  previewCamera.position.set(PREVIEW_DIR.x * dist, PREVIEW_DIR.y * dist + 0.3, PREVIEW_DIR.z * dist);
  previewCamera.lookAt(0, spec.height * 0.4, 0);
}

// ---------- Vehicle / color selection ----------
let selectedVehicle = 'car';
let selectedColor = '#e63946';

document.querySelectorAll('.option-btn').forEach((btn) => {
  if (btn.dataset.vehicle === selectedVehicle) btn.classList.add('selected');
  btn.addEventListener('click', () => {
    document.querySelectorAll('.option-btn').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedVehicle = btn.dataset.vehicle;
    rebuildPreview();
  });
});

document.querySelectorAll('.color-btn').forEach((btn) => {
  if (btn.dataset.color === selectedColor) btn.classList.add('selected');
  btn.addEventListener('click', () => {
    document.querySelectorAll('.color-btn').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedColor = btn.dataset.color;
    rebuildPreview();
  });
});

rebuildPreview();

// ---------- Tutorial (learning mode) ----------
const TUTORIAL_STEP_HOLD = 0.7;

let tutorialSteps = [];
let tutorialFlags = { left: false, right: false, up: false, down: false, space: false };
let tutorialStep = 0;
let tutorialHoldTimer = 0;

const TUTORIAL_SEEN_KEY = 'pranavRacingTutorialSeen';

function hasTutorialBeenSeen() {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
  } catch (e) {
    return false;
  }
}
function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch (e) {
    // storage unavailable (e.g. private browsing) - tutorial will just replay next time
  }
}

function buildTutorialSteps() {
  if (hasTutorialBeenSeen()) return []; // learning mode only ever runs once per browser

  const steps = [
    {
      text: isTouchDevice ? 'Tap ◀ / ▶ to change lanes' : 'Use ← and → to change lanes',
      done: () => tutorialFlags.left && tutorialFlags.right,
    },
  ];
  if (!autoSpeedEnabled) {
    steps.push({
      text: isTouchDevice ? 'Hold SPEED to accelerate' : 'Press ↑ to accelerate',
      done: () => tutorialFlags.up,
    });
  }
  steps.push({
    text: isTouchDevice ? 'Hold BRAKE to slow down' : 'Press ↓ to brake',
    done: () => tutorialFlags.down,
  });
  steps.push({
    text: isTouchDevice ? 'Tap JUMP to hop over traffic' : 'Press SPACE to jump',
    done: () => tutorialFlags.space,
  });
  return steps;
}

function updateTutorialDots() {
  tutorialDotEls.forEach((dot, i) => {
    dot.classList.remove('done', 'active');
    dot.classList.toggle('hidden', i >= tutorialSteps.length);
    if (i < tutorialStep) dot.classList.add('done');
    else if (i === tutorialStep) dot.classList.add('active');
  });
}

function startTutorial() {
  tutorialSteps = buildTutorialSteps();
  if (tutorialSteps.length === 0) {
    beginPlaying(); // nothing to teach - run the game directly, no countdown
    return;
  }
  markTutorialSeen();
  tutorialFlags = { left: false, right: false, up: false, down: false, space: false };
  tutorialStep = 0;
  tutorialHoldTimer = 0;
  tutorialBanner.classList.remove('hidden');
  tutorialText.textContent = tutorialSteps[0].text;
  updateTutorialDots();
}

function updateTutorial(dt) {
  if (tutorialStep >= tutorialSteps.length) {
    beginPlaying(); // walkthrough finished - run the game directly, no countdown
    return;
  }
  if (tutorialSteps[tutorialStep].done()) {
    tutorialText.textContent = 'Nice!';
    tutorialHoldTimer += dt;
    if (tutorialHoldTimer > TUTORIAL_STEP_HOLD) {
      tutorialStep++;
      tutorialHoldTimer = 0;
      updateTutorialDots();
      if (tutorialStep < tutorialSteps.length) {
        tutorialText.textContent = tutorialSteps[tutorialStep].text;
      }
    }
  }
}

function beginPlaying() {
  distance = 0;
  score = 0;
  speed = 0;
  currentAccelValue = 0;
  spawnTimer = 1.2;
  state = 'playing';
  tutorialBanner.classList.add('hidden');
}

// ---------- Game state ----------
let state = 'menu'; // 'menu' | 'tutorial' | 'playing' | 'gameover'
let player = null;
let traffic = [];
let distance = 0;
let score = 0;
let speed = 0;
let currentAccelValue = 0;
let spawnTimer = 1.2;
let lastTime = null;
const camState = { x: 0 };

function initGame() {
  if (player && player.mesh) {
    scene.remove(player.mesh);
    disposeVehicle(player.mesh);
  }
  for (const v of traffic) {
    scene.remove(v.mesh);
    disposeVehicle(v.mesh);
  }
  traffic = [];

  const mesh = buildVehicle(selectedVehicle, hexColor(selectedColor));
  mesh.position.set(0, 0, Z_PLAYER);
  scene.add(mesh);

  player = {
    vehicle: selectedVehicle,
    mesh,
    lane: 1,
    laneF: 1,
    jumping: false,
    jumpT: 0,
  };

  distance = 0;
  score = 0;
  speed = 0;
  currentAccelValue = 0;
  spawnTimer = 1.2;
  camState.x = 0;
}
initGame();

// ---------- Input ----------
const keys = {};
window.addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  if (state !== 'playing' && state !== 'tutorial') return;

  if (!keys[e.code]) {
    if (e.code === 'ArrowLeft') {
      triggerLaneLeft();
    } else if (e.code === 'ArrowRight') {
      triggerLaneRight();
    } else if (e.code === 'Space') {
      triggerJump();
    }
  }
  keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// ---------- Spawning ----------
function spawnVehicle() {
  const lane = LANES[Math.floor(Math.random() * LANES.length)];
  const type = TRAFFIC_TYPES[Math.floor(Math.random() * TRAFFIC_TYPES.length)];
  const color = TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];
  const mesh = buildVehicle(type, color);
  mesh.rotation.y = Math.PI; // oncoming traffic faces the player
  mesh.position.set(LANE_X[lane], 0, Z_SPAWN);
  scene.add(mesh);
  traffic.push({ lane, type, mesh, z: Z_SPAWN, checked: false });
}

// ---------- Update ----------
function update(dt) {
  // Braking always takes priority over accelerating (manual or auto-speed).
  if (keys['ArrowDown']) {
    speed -= BRAKE * dt;
    currentAccelValue = 0; // so releasing the brake doesn't resume at full pull
    if (state === 'tutorial') tutorialFlags.down = true;
  } else if (keys['ArrowUp'] || autoSpeedEnabled) {
    // Real cars pull hard off the line and taper off as they approach top speed
    // (engine power vs. rising aerodynamic drag), but the pull itself also
    // spools up smoothly rather than switching on instantly at full strength.
    // Tuned to roughly: 0-100 in ~6s, 0-200 in ~15s, 0-330 in ~30s.
    const targetAccel = accelForSpeed(speed);
    const rampLerp = 1 - Math.pow(0.06, dt);
    currentAccelValue += (targetAccel - currentAccelValue) * rampLerp;
    speed += currentAccelValue * dt;
    if (state === 'tutorial' && keys['ArrowUp']) tutorialFlags.up = true;
  } else {
    currentAccelValue = 0;
    if (speed > 0) speed -= FRICTION * dt;
  }
  speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, speed));

  if (state === 'playing') {
    distance += (speed * dt) / 3.6;
    score += speed * dt * SCORE_SPEED_FACTOR;
  }

  const laneLerp = 1 - Math.pow(0.001, dt);
  player.laneF += (player.lane - player.laneF) * laneLerp;
  player.mesh.position.x = (player.laneF - 1) * LANE_WIDTH;

  if (player.jumping) {
    player.jumpT += dt;
    if (player.jumpT >= JUMP_DURATION) {
      player.jumping = false;
      player.jumpT = 0;
    }
  }
  player.mesh.position.y = player.jumping ? Math.sin((player.jumpT / JUMP_DURATION) * Math.PI) * JUMP_HEIGHT : 0;

  const wheelRadius = player.mesh.userData.wheelRadius;
  const wheelSpin = (speed / 3.6) * dt / wheelRadius;
  for (const w of player.mesh.userData.wheels) {
    w.userData.spinMesh.rotation.y += wheelSpin;
  }

  dashTexture.offset.y += (speed / 3.6) * dt / 6;

  if (state !== 'playing') return; // tutorial: practice driving, no traffic yet

  const difficulty = Math.min(1, distance / 3000);
  const minGap = 1.1 - 0.7 * difficulty;
  const maxGap = 1.9 - 0.9 * difficulty;

  spawnTimer -= dt;
  if (spawnTimer <= 0) {
    spawnVehicle();
    spawnTimer = minGap + Math.random() * (maxGap - minGap);
  }

  // Traffic closes in faster the harder the player accelerates - closing speed
  // is governed entirely by the player's own speed, plus a small baseline.
  const worldSpeed = (speed / 3.6) * 1.5 + TRAFFIC_BASE_SPEED;
  for (const v of traffic) {
    v.z += worldSpeed * dt;
    v.mesh.position.z = v.z;
    if (!v.checked && v.z >= Z_COLLIDE) {
      v.checked = true;
      if (v.lane === player.lane) {
        if (player.jumping) {
          score = Math.max(0, score - JUMP_BYPASS_PENALTY);
          showScorePopup(-JUMP_BYPASS_PENALTY);
          playPenaltySound();
        } else {
          triggerGameOver();
          return;
        }
      }
    }
  }
  traffic = traffic.filter((v) => {
    if (v.z > Z_REMOVE) {
      scene.remove(v.mesh);
      disposeVehicle(v.mesh);
      return false;
    }
    return true;
  });
}

function triggerGameOver() {
  state = 'gameover';
  const isNewBest = score > topScore;
  if (isNewBest) {
    topScore = score;
    saveTopScore(topScore);
  }
  stopEngineSound();
  playCrashSound();
  speedVignetteEl.style.opacity = '0';
  shakeTime = SHAKE_DURATION;
  crashFlashEl.classList.remove('flash');
  void crashFlashEl.offsetWidth; // restart the CSS animation
  crashFlashEl.classList.add('flash');
  hud.classList.add('hidden');
  mobileControls.classList.add('hidden');
  gameOverScreen.classList.remove('hidden');
  finalScoreEl.textContent = `Score: ${Math.floor(score)}`;
  finalDistanceEl.textContent = `Distance: ${Math.floor(distance)}m`;
  finalBestEl.textContent = isNewBest ? 'New Best Score!' : `Best: ${Math.floor(topScore)}`;
  finalBestEl.classList.toggle('new-best', isNewBest);
}

// ---------- HUD ----------
function updateHud() {
  scoreLineEl.textContent = `Score: ${Math.floor(score)}`;
  distanceLineEl.textContent = `Distance: ${Math.floor(distance)}m`;
  speedEl.textContent = `Speed: ${Math.floor(speed)} km/h`;
  bestLineEl.textContent = `Best: ${Math.floor(topScore)}`;
  speedVignetteEl.style.opacity = Math.min(1, Math.max(0, (speed - 120) / 210));
  updateEngineSound(speed);
}

// ---------- Camera ----------
const SHAKE_DURATION = 0.4;
let shakeTime = 0;

function updateCamera(dt) {
  if (!player) return;
  if (shakeTime > 0) shakeTime = Math.max(0, shakeTime - dt);
  const shakeIntensity = (shakeTime / SHAKE_DURATION) * 0.3;
  const shakeX = shakeIntensity ? (Math.random() * 2 - 1) * shakeIntensity : 0;
  const shakeY = shakeIntensity ? (Math.random() * 2 - 1) * shakeIntensity : 0;

  camera.fov = 62 + Math.min(1, speed / MAX_SPEED) * 14;
  camera.updateProjectionMatrix();

  const followLerp = 1 - Math.pow(0.0005, dt);
  camState.x += (player.mesh.position.x - camState.x) * followLerp;
  camera.position.set(camState.x + shakeX, CAMERA_HEIGHT + shakeY, Z_PLAYER + CAMERA_BACK);
  camera.lookAt(camState.x, 1.2, Z_PLAYER - 14);
}

// ---------- Main loop ----------
function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(0.05, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  try {
    if (state === 'playing' || state === 'tutorial') {
      update(dt);
      updateHud();
      updateScenery(dt);
      if (state === 'tutorial') updateTutorial(dt);
    }
    updateCamera(dt);
    renderer.render(scene, camera);

    if (previewGroup) previewGroup.rotation.y += dt * 0.6;
    previewRenderer.render(previewScene, previewCamera);
  } catch (err) {
    console.error(err);
  }

  requestAnimationFrame(loop);
}

// ---------- Screen transitions ----------
startBtn.addEventListener('click', () => {
  autoSpeedEnabled = isTouchDevice && autoSpeedToggle.checked;
  accelBtn.classList.toggle('hidden', autoSpeedEnabled || !isTouchDevice);
  startEngineSound();
  initGame();
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  if (isTouchDevice) mobileControls.classList.remove('hidden');
  state = 'tutorial';
  startTutorial();
});

restartBtn.addEventListener('click', () => {
  startEngineSound();
  initGame();
  state = 'playing';
  gameOverScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  if (isTouchDevice) mobileControls.classList.remove('hidden');
});

document.querySelectorAll('.option-btn, .color-btn, #start-btn, #restart-btn').forEach((btn) => {
  btn.addEventListener('click', playClickSound);
});

loadingScreen.classList.add('hidden');
requestAnimationFrame(loop);
