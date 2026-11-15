
import SamJs from 'https://esm.sh/sam-js';

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const PITCHES = {
    c: 40,
    d: 45,
    e: 50,
    f: 53,
    g: 60,
    a: 67,
    b: 75
};

export async function unlockAudio() {
    if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
    }

    console.log("Audio state:", audioCtx.state);
    return audioCtx.state === 'running';
}

function getSamPitch(note, octaveJump) {
    return Math.min(255, PITCHES[note] + octaveJump * 12);
}

export async function singSamChoir(notesArray, textArray) {
    await unlockAudio();

    const noteCounts = {};

    for (const rawNote of notesArray) {
        const note = String(rawNote).toLowerCase().trim();

        if (Object.hasOwn(PITCHES, note)) {
            noteCounts[note] = (noteCounts[note] || 0) + 1;
        }
    }

    const uniqueNotes = Object.keys(noteCounts);

    if (uniqueNotes.length === 0) {
        console.warn("No valid notes detected");
        return 0;
    }

    const rawLyric = textArray.join('').trim();
    const lyric = rawLyric
        .replace(/[^a-zA-Z ]/g, '')
        .trim() || 'LA';

    console.log("Singing:", lyric);
    console.log("Notes:", uniqueNotes);

    const masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.6 / Math.sqrt(uniqueNotes.length);
    masterGain.connect(audioCtx.destination);

    const startTime = audioCtx.currentTime + 0.1;
    let voicesPlayed = 0;

    for (const note of uniqueNotes) {
        const octaveJump = Math.min(2, noteCounts[note] - 1);
        const pitch = getSamPitch(note, octaveJump);

        const sam = new SamJs({
            pitch: pitch,
            singmode: true,
            speed: 72,
            mouth: 128,
            throat: 128
        });

        let samples = null;

        try {
            samples = sam.buf32(lyric);

            if (!samples || samples.length === 0) {
                console.warn("SAM failed for:", lyric);
                samples = sam.buf32("LA");
            }
        } catch (error) {
            console.error("SAM synthesis error:", error);
        }

        if (!samples || samples.length === 0) {
            console.warn("Using oscillator fallback for:", note);

            const oscillator = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            const frequencies = {
                c: 130.81,
                d: 146.83,
                e: 164.81,
                f: 174.61,
                g: 196.00,
                a: 220.00,
                b: 246.94
            };

            oscillator.type = 'sine';
            oscillator.frequency.value =
                frequencies[note] * Math.pow(2, octaveJump);

            gain.gain.setValueAtTime(0.15, startTime);
            gain.gain.exponentialRampToValueAtTime(
                0.001, startTime + 0.8
            );

            oscillator.connect(gain);
            gain.connect(masterGain);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.8);

            voicesPlayed++;
            continue;
        }

        const audioBuffer = audioCtx.createBuffer(
            1,
            samples.length,
            22050
        );

        audioBuffer.getChannelData(0).set(samples);

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(masterGain);
        source.start(startTime);

        voicesPlayed++;
    }

    console.log("Voices scheduled:", voicesPlayed);
    return voicesPlayed;
}
