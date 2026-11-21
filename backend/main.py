
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

from pathlib import Path
import shutil
import uuid

from backend.schemas import JobRequest
from backend.services.prediction_service import predict_job
from backend.services.ai_service import generate_ai_response
from backend.services.ocr_service import extract_text_from_image
from backend.services.job_extraction_service import extract_job_details

from pydantic import BaseModel, Field
from typing import Literal

from backend.services.ai_service import (
    generate_ai_response,
    generate_chat_response
)

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list)

app = FastAPI(
    title="ScamGuard AI",
    description="AI-Powered Job Scam Detection and Risk Analysis System",
    version="1.0.0"
)


# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# Upload Directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# Home Route
@app.get("/")
def home():
    return {
        "application": "ScamGuard AI",
        "message": "Welcome to ScamGuard AI",
        "status": "Backend is running"
    }


# Health Check Route
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "message": "ScamGuard AI backend is working"
    }


# Job Scam Prediction + AI Explanation
@app.post("/predict")
def predict_job_endpoint(job: JobRequest):

    try:
        # Step 1: CatBoost prediction
        job_data = job.model_dump()
        result = predict_job(job_data)

        # Step 2: Prepare AI prompt
        prompt = f"""
        You are ScamGuard AI, an expert job scam analysis assistant.

        Analyze this job posting using the ML prediction below.

        Job Details:
        {job_data}

        CatBoost Prediction:
        Prediction: {result['prediction']}
        Scam Probability: {result['scam_probability']}%
        Risk Level: {result['risk_level']}

        Tasks:
        1. Explain the prediction.
        2. Identify suspicious indicators.
        3. Identify positive indicators.
        4. Provide practical safety advice.

        Rules:
        - Never change the CatBoost prediction.
        - Do not invent company facts.
        - Missing information must be mentioned.
        - A prediction is an estimate, not proof of fraud.
        - Use simple, clear language.
        """

        # Step 3: Groq AI explanation
        ai_explanation = generate_ai_response(prompt)

        # Step 4: Combine results
        result["ai_explanation"] = ai_explanation

        return result

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:
        print(f"Prediction error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Prediction failed. Please try again."
        )


# Screenshot Upload + OCR + AI Extraction
@app.post("/scan-image")
async def scan_job_image(file: UploadFile = File(...)):

    allowed_types = ["image/jpeg", "image/png"]

    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Only JPG, JPEG and PNG images are allowed."
        )

    file_extension = Path(file.filename or "").suffix.lower()

    if file_extension not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid image extension."
        )

    image_path = UPLOAD_DIR / f"{uuid.uuid4()}{file_extension}"

    try:
        # Step 1: Save uploaded image
        with image_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Step 2: Extract text using Tesseract OCR
        extracted_text = extract_text_from_image(
            str(image_path)
        )

        # Step 3: Extract structured job details using Groq
        job_details = extract_job_details(extracted_text)

        # Step 4: Return extracted information
        return {
            "message": "Image scanned and job details extracted successfully",
            "extracted_text": extracted_text,
            "job_details": job_details
        }

    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    except Exception as e:
        print(f"Image scanning error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Unable to process image."
        )

    finally:
        await file.close()

        if image_path.exists():
            image_path.unlink()

@app.post("/chat")
def chat_endpoint(chat: ChatRequest):

    message = chat.message.strip()

    if not message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty."
        )

    try:
        history = [
            item.model_dump()
            for item in chat.history[-10:]
        ]

        ai_response = generate_chat_response(
            history=history,
            message=message
        )

        return {
            "response": ai_response
        }

    except Exception as e:
        print(f"Chat endpoint error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Unable to generate chatbot response."
        )
