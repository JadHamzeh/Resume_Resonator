
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Frequencies for individual notes
const FREQUENCIES = {
    c: 261.63,
    d: 293.66,
    e: 329.63,
    f: 349.23,
    g: 392.00,
    a: 440.00,
    b: 493.88
};

// Major chords: root, major third, perfect fifth
const CHORDS = {
    c: [261.63, 311.13, 392.00],  // C minor: C Eb G
    d: [293.66, 349.23, 440.00],  // D minor: D F A
    e: [329.63, 392.00, 493.88],  // E minor: E G B
    f: [349.23, 415.30, 523.25],  // F minor: F Ab C
    g: [392.00, 466.16, 587.33],  // G minor: G Bb D
    a: [440.00, 523.25, 659.25],  // A minor: A C E
    b: [493.88, 587.33, 739.99]   // B minor: B D F#
};

// Enable browser audio
export async function unlockAudio() {
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
    }

    return audioCtx.state === 'running';
}

// Play a piano-like major chord
function playPianoNote(note, duration = 0.7) {
    const chord = CHORDS[note];

    if (!chord) return;

    const startTime = audioCtx.currentTime;

    // Play all three notes of the major chord
    for (const frequency of chord) {
        const masterGain = audioCtx.createGain();

        // Piano-like attack and decay
        masterGain.gain.setValueAtTime(
            0.0001,
            startTime
        );

        masterGain.gain.exponentialRampToValueAtTime(
            0.12,
            startTime + 0.01
        );

        masterGain.gain.exponentialRampToValueAtTime(
            0.001,
            startTime + duration
        );

        masterGain.connect(audioCtx.destination);

        // Harmonics to create a piano-like sound
        const harmonics = [
            [1, 1.0],
            [2, 0.35],
            [3, 0.15],
            [4, 0.08]
        ];

        for (const [multiplier, volume] of harmonics) {
            const oscillator = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            oscillator.type = 'sine';

            oscillator.frequency.value =
                frequency * multiplier;

            gain.gain.value = volume;

            oscillator.connect(gain);
            gain.connect(masterGain);

            oscillator.start(startTime);

            oscillator.stop(
                startTime + duration + 0.02
            );
        }
    }
}

// Wait for a specified number of milliseconds
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Speak all lyrics continuously
function speakLyrics(lyrics) {
    if (!('speechSynthesis' in window)) {
        console.warn('Speech synthesis not supported');
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
        lyrics || 'LA'
    );

    utterance.lang = 'en-US';

    // Speech settings
    utterance.rate = 1.5;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
}

// Main function called by index.html
export async function singSamChoir(notesArray, textArray) {
    await unlockAudio();

    // Validate detected notes
    const notes = notesArray
        .map(note => String(note).toLowerCase().trim())
        .filter(note => Object.hasOwn(CHORDS, note));

    // Convert lyrics to a string
    const lyrics = Array.isArray(textArray)
        ? textArray.join('')
        : String(textArray || '');

    if (notes.length === 0) {
        console.warn('No valid notes detected');
        return 0;
    }

    console.log('Detected notes:', notes);
    console.log('Lyrics:', lyrics);

    // Start speaking lyrics
    speakLyrics(lyrics);

    // Play major chords sequentially
    for (let i = 0; i < notes.length; i++) {
        const note = notes[i];

        console.log(
            `Playing ${note.toUpperCase()} major chord`
        );

        // Play chord
        playPianoNote(note, 0.5);
        document.getElementById("myImage").src = "images.png";
        // Delay before next chord
        await sleep(350);
        document.getElementById("myImage").src = "latest.png";
    }

    console.log('Finished playing chords');

    return notes.length;
}
