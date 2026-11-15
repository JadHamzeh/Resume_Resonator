import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import cv2
import easyocr

def recognize_text(frame, reader):
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    lines = reader.readtext(rgb, detail=0, paragraph=True)
    return "\n".join(lines).strip()

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
            text = recognize_text(frame, reader)
            print("Detected:", repr(text))

        elif key == ord('q'):
            break

    camera.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
