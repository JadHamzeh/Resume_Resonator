import SamJs from 'https://esm.sh/sam-js';

// Base frequencies for Octave 3 (C3 to B3)
const BASE_FREQUENCIES = {
  c: 130.81,
  d: 146.83,
  e: 164.81,
  f: 174.61,
  g: 196.00,
  a: 220.00,
  b: 246.94
};

// Shared AudioContext for simultaneous playback
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/**
 * Converts a note letter + octave jump (0, 1, or 2) into a SAM pitch byte.
 */
function getSamPitch(noteLetter, octaveJump) {
  const baseHz = BASE_FREQUENCIES[noteLetter];
  // Each octave jump doubles the frequency (2^0 = 1x, 2^1 = 2x, 2^2 = 4x)
  const targetHz = baseHz * Math.pow(2, octaveJump);
  const rawPitch = Math.round(7735 / targetHz);
  return Math.max(1, Math.min(255, rawPitch));
}

/**
 * Plays up to 7 SAM voices simultaneously based on unique notes and duplicate counts.
 * @param {string[]} notesArray - Array of letters 'a'-'g', e.g. ['a', 'b', 'b', 'a', 'c', 'd']
 * @param {string[]} textArray - Array of characters/syllables, e.g. ['h', 'e', 'l', 'l', 'o']
 */
export function singSamChoir(notesArray, textArray) {
  // Resume AudioContext if browser paused it prior to user click
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  // 1. Count occurrences of each valid note ('a' through 'g')
  const noteCounts = {};
  for (const rawNote of notesArray) {
    const note = rawNote.toLowerCase().trim();
    if (BASE_FREQUENCIES[note]) {
      noteCounts[note] = (noteCounts[note] || 0) + 1;
    }
  }

  // 2. Cap at up to 7 unique voices (one per unique note a-g)
  const uniqueNotes = Object.keys(noteCounts).slice(0, 7);
  if (uniqueNotes.length === 0) return;

  // 3. Join the text array into a single string for SAM to pronounce
  const lyric = textArray.join('');

  // 4. Master gain node prevents audio clipping when 7 SAMs sing at once
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 1 / Math.sqrt(uniqueNotes.length);
  masterGain.connect(audioCtx.destination);

  // Sync start time so every SAM begins at the exact same millisecond
  const startTime = audioCtx.currentTime + 0.05;

  // 5. Render and schedule each unique SAM voice
  for (const note of uniqueNotes) {
    const count = noteCounts[note];

    // 1 occurrence -> +0 octaves (Base: Octave 3)
    // 2 occurrences (1 duplicate) -> +1 octave (Octave 4)
    // 3+ occurrences (2+ duplicates) -> +2 octaves (Octave 5, capped)
    const octaveJump = Math.min(2, count - 1);
    const samPitch = getSamPitch(note, octaveJump);

    const sam = new SamJs({
      pitch: samPitch,
      singmode: true,
      speed: 72,
      mouth: 128,
      throat: 128
    });

    // Extract raw 22050 Hz Float32 audio samples from SAM
    const float32Samples = sam.buf32(lyric);
    if (!float32Samples || float32Samples.length === 0) continue;

    // Load samples into a Web Audio buffer and schedule simultaneous playback
    const audioBuffer = audioCtx.createBuffer(1, float32Samples.length, 22050);
    audioBuffer.getChannelData(0).set(float32Samples);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(masterGain);
    source.start(startTime);
  }
}
