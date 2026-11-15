
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import threading
import cv2
import easyocr

from flask import Flask, jsonify, send_from_directory

app = Flask(__name__, static_folder='.')

latest = {
    'id': 0,
    'text': '',
    'notes': [],
    'lyrics': ''
}

lock = threading.Lock()


@app.get('/')
def home():
    return send_from_directory('.', 'index.html')


@app.get('/choir.js')
def choir_js():
    return send_from_directory(
        '.', 'choir.js', mimetype='text/javascript'
    )


@app.get('/latest')
def get_latest():
    with lock:
        return jsonify(latest.copy())


def recognize_text(frame, reader):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    lines = reader.readtext(
        rgb,
        detail=0,
        paragraph=True
    )

    return '\n'.join(lines).strip()


def main():
    threading.Thread(
        target=lambda: app.run(
            host='127.0.0.1',
            port=5000,
            use_reloader=False
        ),
        daemon=True
    ).start()

    print("Open http://127.0.0.1:5000")
    print("Press S to scan, Q to quit.")

    reader = easyocr.Reader(['en'], gpu=False)
    camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        raise RuntimeError("Cannot open camera")

    try:
        while True:
            success, frame = camera.read()

            if not success:
                break

            cv2.imshow(
                'OCR - S to scan, Q to quit',
                frame
            )

            key = cv2.waitKey(1) & 0xFF

            if key == ord('s'):
                text = recognize_text(frame, reader)

                notes = [
                    c.lower()
                    for c in text
                    if c.lower() in 'abcdefg'
                ]

                lyrics = ''.join(
                    c for c in text
                    if c.lower() not in 'abcdefg'
                ).strip()

                print("Detected:", repr(text))
                print("Notes:", notes)
                print("Lyrics:", repr(lyrics))

                with lock:
                    latest.update(
                        id=latest['id'] + 1,
                        text=text,
                        notes=notes,
                        lyrics=lyrics
                    )

            elif key == ord('q'):
                break

    finally:
        camera.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
