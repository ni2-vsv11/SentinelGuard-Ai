from __future__ import annotations

import csv
import pickle
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from warnings import warn

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATASET_PATH = BASE_DIR / "data" / "phishing_dataset.csv"
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "phishing_model.pkl"

SUSPICIOUS_URL_WORDS = {
    "login",
    "verify",
    "secure",
    "update",
    "password",
    "reset",
    "account",
    "wallet",
    "bank",
    "confirm",
    "signin",
}

_MODEL_CACHE: Pipeline | None = None
_MODEL_CACHE_MTIME: float | None = None


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _extract_url_feature_tokens(url: str) -> list[str]:
    normalized = _clean_text(url)
    if not normalized:
        return ["url_empty"]

    tokens: list[str] = []
    tokens.append("url_https" if normalized.startswith("https://") else "url_not_https")
    tokens.append("url_has_ip" if bool(re.search(r"\d+\.\d+\.\d+\.\d+", normalized)) else "url_no_ip")
    tokens.append("url_has_at" if "@" in normalized else "url_no_at")

    slash_parts = [part for part in normalized.split("/") if part]
    domain_part = slash_parts[0].replace("https://", "").replace("http://", "")
    dot_count = domain_part.count(".")
    tokens.append(f"url_subdomain_dots_{min(dot_count, 5)}")

    domain_chunks = domain_part.split(".")
    tld = domain_chunks[-1] if len(domain_chunks) > 1 else "unknown"
    tokens.append(f"url_tld_{tld}")
    tokens.append("url_long" if len(normalized) >= 55 else "url_short")

    for word in SUSPICIOUS_URL_WORDS:
        if word in normalized:
            tokens.append(f"url_kw_{word}")

    return tokens


def _extract_email_feature_tokens(email: str) -> list[str]:
    normalized = _clean_text(email)
    if not normalized:
        return ["email_empty"]

    tokens: list[str] = []
    tokens.append("email_has_urgency" if any(w in normalized for w in ["urgent", "immediately", "now"]) else "email_no_urgency")
    tokens.append("email_has_action" if any(w in normalized for w in ["click", "verify", "confirm", "reset"]) else "email_no_action")
    tokens.append("email_has_financial" if any(w in normalized for w in ["bank", "wallet", "billing", "payment"]) else "email_no_financial")
    return tokens


def _combine_features(email: str, url: str) -> str:
    normalized_email = _clean_text(email)
    normalized_url = _clean_text(url)
    feature_tokens = _extract_email_feature_tokens(normalized_email) + _extract_url_feature_tokens(normalized_url)
    return f"email: {normalized_email} url: {normalized_url} features: {' '.join(feature_tokens)}"


def _load_dataset(dataset_path: Path) -> tuple[list[str], list[str]]:
    texts: list[str] = []
    labels: list[str] = []

    with dataset_path.open("r", encoding="utf-8", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            email = str(row.get("email", ""))
            url = str(row.get("url", ""))
            label = str(row.get("label", "")).strip().lower()

            if label not in {"phishing", "safe"}:
                continue

            texts.append(_combine_features(email=email, url=url))
            labels.append(label)

    if not texts:
        raise ValueError("Dataset is empty or invalid. Expected columns: email,url,label")

    return texts, labels


def _build_pipeline(ngram_range: tuple[int, int], c_value: float) -> Pipeline:
    return Pipeline(
        [
            (
                "vectorizer",
                TfidfVectorizer(
                    analyzer="word",
                    ngram_range=ngram_range,
                    min_df=1,
                    sublinear_tf=True,
                ),
            ),
            (
                "classifier",
                LogisticRegression(
                    max_iter=3000,
                    solver="liblinear",
                    C=c_value,
                    class_weight="balanced",
                ),
            ),
        ]
    )


def _safe_cv_folds(labels: list[str]) -> int:
    class_counts: dict[str, int] = {}
    for label in labels:
        class_counts[label] = class_counts.get(label, 0) + 1
    min_class = min(class_counts.values())
    return max(2, min(5, min_class))


def train_and_save_model(
    dataset_path: str | Path = DEFAULT_DATASET_PATH,
    model_path: str | Path = DEFAULT_MODEL_PATH,
) -> dict[str, Any]:
    global _MODEL_CACHE, _MODEL_CACHE_MTIME

    dataset_path = Path(dataset_path)
    model_path = Path(model_path)

    texts, labels = _load_dataset(dataset_path)
    cv_folds = _safe_cv_folds(labels)

    candidates = [
        {"ngram_range": (1, 2), "c": 0.5},
        {"ngram_range": (1, 2), "c": 1.0},
        {"ngram_range": (1, 3), "c": 1.0},
        {"ngram_range": (1, 3), "c": 1.5},
    ]

    splitter = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)

    best_candidate = candidates[0]
    best_score = -1.0
    for candidate in candidates:
        candidate_pipeline = _build_pipeline(
            ngram_range=candidate["ngram_range"],
            c_value=candidate["c"],
        )
        scores = cross_val_score(
            candidate_pipeline,
            texts,
            labels,
            cv=splitter,
            scoring="f1_macro",
        )
        mean_score = float(scores.mean())
        if mean_score > best_score:
            best_score = mean_score
            best_candidate = candidate

    pipeline = _build_pipeline(
        ngram_range=best_candidate["ngram_range"],
        c_value=best_candidate["c"],
    )
    pipeline.fit(texts, labels)
    training_accuracy = float(pipeline.score(texts, labels))

    artifact = {
        "version": 2,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "pipeline": pipeline,
        "metrics": {
            "cv_f1_macro": round(best_score, 4),
            "training_accuracy": round(training_accuracy, 4),
            "cv_folds": cv_folds,
        },
        "config": {
            "ngram_range": best_candidate["ngram_range"],
            "c": best_candidate["c"],
        },
    }

    model_path.parent.mkdir(parents=True, exist_ok=True)
    with model_path.open("wb") as model_file:
        pickle.dump(artifact, model_file)

    _MODEL_CACHE = pipeline
    _MODEL_CACHE_MTIME = model_path.stat().st_mtime

    return {
        "dataset_size": len(texts),
        "cv_f1_macro": round(best_score, 4),
        "training_accuracy": round(training_accuracy, 4),
        "cv_folds": cv_folds,
        "ngram_range": best_candidate["ngram_range"],
        "c": best_candidate["c"],
        "model_path": str(model_path),
    }


def _load_model(model_path: Path = DEFAULT_MODEL_PATH) -> Pipeline:
    with model_path.open("rb") as model_file:
        artifact = pickle.load(model_file)

    # Backward compatibility with old pickled format (pipeline only).
    if isinstance(artifact, Pipeline):
        return artifact

    if isinstance(artifact, dict) and isinstance(artifact.get("pipeline"), Pipeline):
        return artifact["pipeline"]

    raise ValueError("Unsupported model artifact format.")


def _get_or_load_cached_model(model_path: Path = DEFAULT_MODEL_PATH) -> Pipeline:
    global _MODEL_CACHE, _MODEL_CACHE_MTIME

    if not model_path.exists():
        train_and_save_model(model_path=model_path)

    current_mtime = model_path.stat().st_mtime
    if _MODEL_CACHE is not None and _MODEL_CACHE_MTIME == current_mtime:
        return _MODEL_CACHE

    loaded = _load_model(model_path)
    _MODEL_CACHE = loaded
    _MODEL_CACHE_MTIME = current_mtime
    return loaded


def _phishing_probability_percent(pipeline: Pipeline, features: list[str]) -> float:
    if hasattr(pipeline, "predict_proba"):
        probabilities = pipeline.predict_proba(features)[0]
        class_names = list(pipeline.classes_)
        phishing_index = class_names.index("phishing")
        return float(probabilities[phishing_index]) * 100

    # Fallback path for estimators without predict_proba.
    decision = float(pipeline.decision_function(features)[0])
    probability = 1.0 / (1.0 + pow(2.718281828459045, -decision))
    return probability * 100


def predict_phishing(email: str, url: str) -> dict[str, str | float]:
    try:
        pipeline = _get_or_load_cached_model(DEFAULT_MODEL_PATH)
    except Exception as exc:
        # Recover from incompatible/corrupted pickle artifacts by retraining in-place.
        warn(f"Failed to load model at {DEFAULT_MODEL_PATH}: {exc}. Re-training model.")
        train_and_save_model(model_path=DEFAULT_MODEL_PATH)
        pipeline = _get_or_load_cached_model(DEFAULT_MODEL_PATH)

    features = [_combine_features(email=email, url=url)]
    phishing_probability = _phishing_probability_percent(pipeline, features)
    prediction = "Phishing" if phishing_probability >= 50 else "Safe"

    return {
        "prediction": prediction,
        "confidence": round(max(phishing_probability, 100 - phishing_probability), 2),
        "phishing_probability": round(phishing_probability, 2),
    }
