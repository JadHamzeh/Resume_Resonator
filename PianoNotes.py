
import numpy as np
import pygame

pygame.mixer.pre_init(44100, -16, 2, 512)
pygame.init()

song = "ABCDEFGABABABCDCDCDEEEEEEEFFGG"

# Root frequencies (4th octave)
notes = {
    "A": 440.00,
    "B": 493.88,
    "C": 261.63,
    "D": 293.66,
    "E": 329.63,
    "F": 349.23,
    "G": 392.00
}

def play_chord(note, duration=0.3):
    sample_rate = 44100
    root = notes[note]

    # Major chord: root, major third, perfect fifth
    frequencies = [
        root,
        root * 2 ** (4 / 12),
        root * 2 ** (7 / 12)
    ]

    t = np.linspace(
        0, duration,
        int(sample_rate * duration),
        endpoint=False
    )

    wave = np.zeros_like(t)

    # Generate all three notes simultaneously
    for frequency in frequencies:
        tone = (
            np.sin(2 * np.pi * frequency * t)
            + 0.4 * np.sin(4 * np.pi * frequency * t)
            + 0.2 * np.sin(6 * np.pi * frequency * t)
        )
        wave += tone

    # Apply decay for piano-like sound
    envelope = np.exp(-5 * t / duration)
    wave *= envelope

    # Normalize to avoid distortion
    wave /= max(np.max(np.abs(wave)), 1e-10)

    audio = np.int16(wave * 32767 * 0.8)

    # Convert mono to stereo
    stereo_audio = np.column_stack((audio, audio))

    sound = pygame.sndarray.make_sound(stereo_audio)
    sound.play()

    pygame.time.wait(int(duration * 1000))

for note in song:
    play_chord(note)

pygame.quit()
