
import json
import re
import joblib
import pandas as pd

from pathlib import Path
from bs4 import BeautifulSoup
from catboost import CatBoostClassifier


# -------------------------------
# 1. Load saved model artifacts
# -------------------------------

BASE_DIR = Path(__file__).resolve().parents[2]
MODEL_DIR = BASE_DIR / "models"

with open(MODEL_DIR / "model_config.json", "r") as file:
    MODEL_CONFIG = json.load(file)

with open(MODEL_DIR / "feature_schema.json", "r") as file:
    FEATURE_SCHEMA = json.load(file)

model = CatBoostClassifier()
model.load_model(str(MODEL_DIR / "scamguard_catboost.cbm"))

tfidf = joblib.load(MODEL_DIR / "tfidf_vectorizer.pkl")
svd = joblib.load(MODEL_DIR / "svd_transformer.pkl")


# -------------------------------
# 2. Feature configuration
# -------------------------------

CATEGORICAL_FEATURES = FEATURE_SCHEMA["categorical_features"]
NUMERICAL_FEATURES = FEATURE_SCHEMA["numerical_features"]
CLEAN_TEXT_COLUMNS = FEATURE_SCHEMA["clean_text_columns"]
MODEL_FEATURE_ORDER = FEATURE_SCHEMA["model_feature_order"]

THRESHOLD = MODEL_CONFIG["threshold"]


# -------------------------------
# 3. Clean HTML and text
# -------------------------------

def clean_text(value):

    if value is None:
        value = ""

    cleaned = BeautifulSoup(
        str(value), "html.parser"
    ).get_text(separator=" ")

    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    return cleaned


# -------------------------------
# 4. Convert binary values
# -------------------------------

def convert_binary(value):

    if value is None or value == "":
        return 0

    if isinstance(value, bool):
        return int(value)

    value = str(value).strip().lower()

    if value in ["t", "true", "yes", "1"]:
        return 1

    if value in ["f", "false", "no", "0"]:
        return 0

    raise ValueError(f"Invalid binary value: {value}")


# -------------------------------
# 5. Prepare model features
# -------------------------------


def prepare_features(job_data: dict):

    # Clean the original input text fields
    cleaned_text = {}

    for col in CLEAN_TEXT_COLUMNS:
        raw_column = col.removesuffix("_clean")

        cleaned_text[col] = clean_text(
            job_data.get(raw_column)
        )

    # Prepare structured features
    structured_data = {}

    for col in CATEGORICAL_FEATURES:
        value = job_data.get(col)

        if value is None or str(value).strip() == "":
            value = "Not Provided"

        structured_data[col] = str(value)

    # Convert binary features
    binary_columns = [
        "telecommuting",
        "has_company_logo",
        "has_questions"
    ]

    for col in binary_columns:
        structured_data[col] = convert_binary(
            job_data.get(col)
        )

    # Calculate cleaned text lengths
    for col in CLEAN_TEXT_COLUMNS:
        structured_data[col + "_length"] = len(
            cleaned_text[col]
        )

    structured_df = pd.DataFrame([structured_data])

    # Combine text in the same order as training
    combined_text = " ".join(
        cleaned_text[col]
        for col in CLEAN_TEXT_COLUMNS
    )

    # TF-IDF transformation
    text_tfidf = tfidf.transform([combined_text])

    # SVD transformation
    text_svd = svd.transform(text_tfidf)

    svd_columns = [
        f"text_svd_{i}"
        for i in range(text_svd.shape[1])
    ]

    text_df = pd.DataFrame(
        text_svd,
        columns=svd_columns
    )

    # Combine structured and text features
    final_features = pd.concat(
        [structured_df, text_df],
        axis=1
    )

    # Match training feature order
    final_features = final_features.reindex(
        columns=MODEL_FEATURE_ORDER
    )

    return final_features


# -------------------------------
# 6. Predict job scam risk
# -------------------------------

def predict_job(job_data: dict):

    features = prepare_features(job_data)

    probability = float(
        model.predict_proba(features)[0][1]
    )

    prediction = (
        "Potential Scam"
        if probability >= THRESHOLD
        else "Likely Legitimate"
    )

    risk_percentage = round(probability * 100, 2)

    if probability < 0.30:
        risk_level = "Low"
    elif probability < 0.60:
        risk_level = "Medium"
    else:
        risk_level = "High"

    return {
        "prediction": prediction,
        "scam_probability": risk_percentage,
        "risk_level": risk_level,
        "threshold": THRESHOLD
    }
