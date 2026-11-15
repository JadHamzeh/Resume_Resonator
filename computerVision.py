
import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import threading
import base64

import cv2
import easyocr
import numpy as np

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='.')
@app.get('/latest.png')
def latest_png():
    return send_from_directory('.', 'latest.png')

@app.get('/images.png')
def images_png():
    return send_from_directory('.', 'images.png')
latest = {
    'id': 0,
    'text': '',
    'notes': [],
    'lyrics': ''
}

lock = threading.Lock()
ocr_lock = threading.Lock()

# Initialize OCR once
reader = easyocr.Reader(['en'], gpu=False)


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


@app.post('/scan')
def scan():
    try:
        data = request.get_json()

        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400

        # Decode image received from browser
        image_data = data['image'].split(',')[-1]
        image_bytes = base64.b64decode(image_data)

        np_array = np.frombuffer(image_bytes, np.uint8)
        frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

        if frame is None:
            return jsonify({'error': 'Invalid image'}), 400

        # Perform OCR
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        with ocr_lock:
            lines = reader.readtext(
                rgb,
                detail=0,
                paragraph=True
            )

        text = '\n'.join(lines).strip()

        # Extract musical notes A-G
        notes = [
            c.lower()
            for c in text
            if c.lower() in 'abcdefg'
        ]

        # Preserve the complete text for speech
        lyrics = text

        print('Detected:', repr(text))
        print('Notes:', notes)
        print('Lyrics:', repr(lyrics))

        with lock:
            latest.update(
                id=latest['id'] + 1,
                text=text,
                notes=notes,
                lyrics=lyrics
            )

            result = latest.copy()

        return jsonify(result)

    except Exception as error:
        print('Scan error:', error)
        return jsonify({'error': str(error)}), 500


if __name__ == '__main__':
    print('Open http://127.0.0.1:5000')

    app.run(
        host='127.0.0.1',
        port=5000,
        debug=False
    )
