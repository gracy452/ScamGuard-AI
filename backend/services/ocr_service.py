
import cv2
import pytesseract

from pathlib import Path


# Configure Tesseract OCR for Windows
TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


def extract_text_from_image(image_path: str) -> str:

    image_path = Path(image_path)

    # Check whether image exists
    if not image_path.exists():
        raise FileNotFoundError("Image file not found.")

    # Read image
    image = cv2.imread(str(image_path))

    if image is None:
        raise ValueError("Unable to read the uploaded image.")

    # Convert image to grayscale
    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    # Improve image quality for OCR
    processed_image = cv2.threshold(
        gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )[1]

    # Extract text using Tesseract
    extracted_text = pytesseract.image_to_string(
        processed_image,
        config="--oem 3 --psm 6"
    )

    extracted_text = extracted_text.strip()

    if not extracted_text:
        raise ValueError("No readable text found in the image.")

    return extracted_text
