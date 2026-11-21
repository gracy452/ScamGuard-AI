
import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()


def generate_ai_response(prompt: str) -> str:

    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        return "AI explanation unavailable: Groq API key is missing."

    try:
        client = Groq(api_key=api_key)

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": "You are ScamGuard AI, an assistant that explains job scam risks and provides safe recruitment advice."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=500
        )

        return response.choices[0].message.content or "No explanation generated."

    except Exception as e:
        print(f"Groq API Error: {e}")
        return "AI explanation is temporarily unavailable."

def generate_chat_response(history: list, message: str) -> str:
    """
    Generate chatbot responses using Groq API.
    Supports conversation history.
    """

    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        return "Chatbot unavailable: Groq API key is missing."

    try:
        client = Groq(api_key=api_key)

        messages = [
            {
                "role": "system",
                "content": """
You are ScamGuard Assistant, an expert assistant for job recruitment
fraud detection and online job safety.

Your responsibilities:
1. Answer questions about fake job postings and recruitment scams.
2. Explain common job fraud techniques.
3. Help users identify suspicious job advertisements.
4. Provide practical job search and online safety advice.
5. Explain employment-related concepts in simple language.

Important rules:
- Give clear, helpful and accurate answers.
- Use simple English.
- Never claim that a company is verified unless reliable evidence is provided.
- Never ask users for passwords, OTPs or sensitive personal information.
- Warn users against paying registration, interview or job offer fees.
- Do not guarantee that a job is legitimate or fraudulent.
- Do not invent facts.
- Keep answers concise but informative.
"""
            }
        ]

        # Include recent conversation history
        for item in history[-10:]:
            if item.get("role") in ["user", "assistant"]:
                messages.append({
                    "role": item["role"],
                    "content": item["content"]
                })

        # Add current user message
        messages.append({
            "role": "user",
            "content": message
        })

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
            temperature=0.3,
            max_tokens=700
        )

        answer = response.choices[0].message.content

        return answer or "I couldn't generate a response. Please try again."

    except Exception as e:
        print(f"Chatbot API Error: {e}")
        return "Sorry, the AI assistant is temporarily unavailable. Please try again."
