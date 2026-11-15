
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import cv2
import easyocr
import numpy as np
import pygame

# Initialize audio
pygame.mixer.pre_init(44100, -16, 2, 512)
pygame.init()

# Root frequencies
notes = {
    "A": 440.00,
    "B": 493.88,
    "C": 261.63,
    "D": 293.66,
    "E": 329.63,
    "F": 349.23,
    "G": 392.00
}

def recognize_text(frame, reader):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    lines = reader.readtext(rgb, detail=0, paragraph=True)
    return "\n".join(lines).strip()


def play_chord(note, duration=0.3):
    sample_rate = 44100
    root = notes[note]

    # Major chord: root, third, fifth
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

    for frequency in frequencies:
        tone = (
            np.sin(2 * np.pi * frequency * t)
            + 0.4 * np.sin(4 * np.pi * frequency * t)
            + 0.2 * np.sin(6 * np.pi * frequency * t)
        )
        wave += tone

    # Piano-like decay
    envelope = np.exp(-5 * t / duration)
    wave *= envelope

    # Normalize audio
    wave /= max(np.max(np.abs(wave)), 1e-10)

    audio = np.int16(wave * 32767 * 0.8)

    # Stereo audio
    stereo_audio = np.column_stack((audio, audio))

    sound = pygame.sndarray.make_sound(stereo_audio)
    sound.play()

    pygame.time.wait(int(duration * 1000))


def play_song(song):
    print("Playing:", "".join(song))

    for note in song:
        play_chord(note)

    print("Finished playing!")


def main():
    reader = easyocr.Reader(['en'], gpu=False)
    camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        raise RuntimeError("Cannot open camera")

    while True:
        success, frame = camera.read()

        if not success:
            break

        cv2.imshow("Text Recognition", frame)
        key = cv2.waitKey(1) & 0xFF

        if key == ord('s'):
            # Step 1: Recognize text
            text = recognize_text(frame, reader)
            print("Detected:", repr(text))

            # Step 2: Parse characters
            apr = []
            elese = []

            for char in text:
                c = char.upper()

                if c in notes:
                    apr.append(c)
                else:
                    elese.append(char)

            print("Valid notes:", apr)
            print("Invalid characters:", elese)

            # Step 3: Play parsed notes
            if apr:
                play_song(apr)
            else:
                print("No valid notes detected!")

        elif key == ord('q'):
            break

    camera.release()
    cv2.destroyAllWindows()
    pygame.quit()


if __name__ == "__main__":
    main()
