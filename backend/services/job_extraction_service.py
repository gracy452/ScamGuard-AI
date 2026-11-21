
import json
from groq import Groq
import os
from dotenv import load_dotenv

load_dotenv()


def extract_job_details(ocr_text: str) -> dict:

    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        raise ValueError("Groq API key is missing.")

    client = Groq(api_key=api_key)

    prompt = f"""
You are a job advertisement information extraction system.

Extract job information from the OCR text below.

Return ONLY valid JSON with these exact fields:

{{
    "title": "",
    "location": "",
    "department": "",
    "salary_range": "",
    "company_profile": "",
    "description": "",
    "requirements": "",
    "benefits": "",
    "telecommuting": "f",
    "has_company_logo": "f",
    "has_questions": "f",
    "employment_type": "",
    "required_experience": "",
    "required_education": "",
    "industry": "",
    "function": ""
}}

Rules:
1. Extract only information explicitly present in the text.
2. Never invent missing information.
3. Use empty strings for unknown text fields.
4. For binary fields use "t" only when explicitly indicated,
   otherwise use "f".
5. Do not assume that a logo placeholder is a real company logo.
6. Keep extracted information faithful to the source.
7. Return JSON only. No markdown or explanation.

OCR TEXT:
{ocr_text}
"""

    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": "Extract job advertisement fields accurately. Never invent information."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0,
        max_tokens=1200
    )

    content = response.choices[0].message.content

    if not content:
        raise ValueError("AI could not extract job details.")

    # Remove accidental markdown formatting
    content = content.strip()

    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        content = content.rsplit("```", 1)[0]

    job_details = json.loads(content)

    return job_details
