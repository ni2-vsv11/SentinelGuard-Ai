from __future__ import annotations

import csv
import pickle
import re
from datetime import datetime, timezone
from ipaddress import ip_address
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse
from warnings import warn

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import FeatureUnion, Pipeline

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATASET_PATH = BASE_DIR / "data" / "phishing_dataset.csv"
DEFAULT_MODEL_PATH = Path(__file__).resolve().parent / "phishing_model.pkl"

SUSPICIOUS_URL_WORDS = {
    "account",
    "admin",
    "auth",
    "bank",
    "billing",
    "bonus",
    "cgi-bin",
    "checkout",
    "claim",
    "confirm",
    "gift",
    "invoice",
    "login",
    "mail",
    "password",
    "payment",
    "portal",
    "prize",
    "reset",
    "secure",
    "signin",
    "unlock",
    "update",
    "verify",
    "wallet",
    "webscr",
}

SUSPICIOUS_EMAIL_WORDS = {
    "account",
    "attachment",
    "billing",
    "click",
    "confirm",
    "credential",
    "immediately",
    "invoice",
    "locked",
    "password",
    "payment",
    "reset",
    "security",
    "suspend",
    "unlock",
    "urgent",
    "verify",
}

SAFE_EMAIL_PHRASES = (
    "meeting notes",
    "monthly report",
    "newsletter",
    "onboarding checklist",
    "product updates",
    "project review",
    "shipment is on the way",
    "standup",
    "support ticket update",
    "teammate",
    "welcome",
)

SHORTENER_DOMAINS = {
    "bit.ly",
    "cutt.ly",
    "goo.gl",
    "ow.ly",
    "rb.gy",
    "rebrand.ly",
    "shorturl.at",
    "t.co",
    "tinyurl.com",
}

SUSPICIOUS_TLDS = {
    "biz",
    "cc",
    "cf",
    "click",
    "cn",
    "fit",
    "ga",
    "gq",
    "info",
    "ml",
    "monster",
    "rest",
    "ru",
    "shop",
    "support",
    "tk",
    "top",
    "work",
    "xyz",
}

TRUSTED_ROOT_DOMAINS = {
    "amazon.com",
    "apple.com",
    "cloudflare.com",
    "dropbox.com",
    "github.com",
    "gitlab.com",
    "google.com",
    "linkedin.com",
    "microsoft.com",
    "microsoftonline.com",
    "mozilla.org",
    "openai.com",
    "paypal.com",
    "slack.com",
}

KNOWN_BRAND_ROOTS = {
    "adobe": "adobe.com",
    "amazon": "amazon.com",
    "apple": "apple.com",
    "dropbox": "dropbox.com",
    "github": "github.com",
    "gitlab": "gitlab.com",
    "google": "google.com",
    "linkedin": "linkedin.com",
    "microsoft": "microsoft.com",
    "office365": "microsoft.com",
    "openai": "openai.com",
    "outlook": "microsoft.com",
    "paypal": "paypal.com",
    "slack": "slack.com",
}

COMPOUND_TLDS = {
    "ac.in",
    "ac.uk",
    "co.in",
    "co.jp",
    "co.uk",
    "com.au",
    "com.br",
    "com.mx",
    "org.uk",
}

_MODEL_CACHE: Pipeline | None = None
_MODEL_CACHE_MTIME: float | None = None


def _clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())


def _normalize_url(url: str) -> str:
    normalized = _clean_text(url)
    if normalized and "://" not in normalized:
        return f"https://{normalized}"
    return normalized


def _extract_host(url: str) -> str:
    parsed = urlparse(_normalize_url(url))
    host = parsed.netloc or parsed.path
    return host.split("@")[-1].split(":")[0].strip().lower()


def _extract_root_domain(host: str) -> str:
    labels = [label for label in host.split(".") if label]
    if len(labels) <= 2:
        return ".".join(labels)

    suffix = ".".join(labels[-2:])
    if suffix in COMPOUND_TLDS and len(labels) >= 3:
        return ".".join(labels[-3:])

    return ".".join(labels[-2:])


def _is_ip_host(host: str) -> bool:
    try:
        ip_address(host)
    except ValueError:
        return False
    return True


def _is_trusted_root_domain(host: str) -> bool:
    root_domain = _extract_root_domain(host)
    return root_domain in TRUSTED_ROOT_DOMAINS


def _extract_url_feature_tokens(url: str) -> list[str]:
    normalized = _normalize_url(url)
    if not normalized:
        return ["url_empty"]

    parsed = urlparse(normalized)
    host = _extract_host(normalized)
    root_domain = _extract_root_domain(host)
    path_query = f"{parsed.path} {parsed.query}".lower()

    tokens: list[str] = []
    tokens.append("url_https" if parsed.scheme == "https" else "url_not_https")
    tokens.append("url_has_ip" if _is_ip_host(host) else "url_no_ip")
    tokens.append("url_has_at" if "@" in parsed.netloc else "url_no_at")
    tokens.append("url_punycode" if "xn--" in host else "url_plain_ascii")
    tokens.append("url_trusted_root" if root_domain in TRUSTED_ROOT_DOMAINS else "url_untrusted_root")
    tokens.append(f"url_tld_{root_domain.split('.')[-1] if root_domain else 'unknown'}")
    tokens.append("url_long" if len(normalized) >= 70 else "url_short")
    tokens.append(f"url_subdomain_dots_{min(host.count('.'), 5)}")
    tokens.append("url_has_query" if parsed.query else "url_no_query")

    for word in SUSPICIOUS_URL_WORDS:
        if word in f"{host} {path_query}":
            tokens.append(f"url_kw_{word}")

    return tokens


def _extract_email_feature_tokens(email: str) -> list[str]:
    normalized = _clean_text(email)
    if not normalized:
        return ["email_empty"]

    tokens: list[str] = []
    tokens.append("email_has_urgency" if any(w in normalized for w in ["urgent", "immediately", "now"]) else "email_no_urgency")
    tokens.append("email_has_action" if any(w in normalized for w in ["click", "verify", "confirm", "reset"]) else "email_no_action")
    tokens.append("email_has_financial" if any(w in normalized for w in ["bank", "wallet", "billing", "payment", "invoice"]) else "email_no_financial")
    tokens.append("email_has_links" if "http://" in normalized or "https://" in normalized else "email_no_links")
    tokens.append("email_safe_context" if any(phrase in normalized for phrase in SAFE_EMAIL_PHRASES) else "email_no_safe_context")

    for word in SUSPICIOUS_EMAIL_WORDS:
        if word in normalized:
            tokens.append(f"email_kw_{word}")

    return tokens


def _combine_features(email: str, url: str, input_type: str = "both") -> str:
    normalized_email = _clean_text(email)
    normalized_url = _normalize_url(url)

    if input_type == "email":
        feature_tokens = _extract_email_feature_tokens(normalized_email) + ["url_not_provided"]
        return f"email: {normalized_email} features: {' '.join(feature_tokens)}"

    if input_type == "url":
        feature_tokens = _extract_url_feature_tokens(normalized_url) + ["email_not_provided"]
        return f"url: {normalized_url} features: {' '.join(feature_tokens)}"

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
                "features",
                FeatureUnion(
                    [
                        (
                            "word",
                            TfidfVectorizer(
                                analyzer="word",
                                ngram_range=ngram_range,
                                min_df=1,
                                sublinear_tf=True,
                            ),
                        ),
                        (
                            "char",
                            TfidfVectorizer(
                                analyzer="char_wb",
                                ngram_range=(3, 5),
                                min_df=1,
                                sublinear_tf=True,
                            ),
                        ),
                    ]
                ),
            ),
            (
                "classifier",
                LogisticRegression(
                    max_iter=4000,
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
        {"ngram_range": (1, 2), "c": 0.75},
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
        "version": 3,
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

    decision = float(pipeline.decision_function(features)[0])
    probability = 1.0 / (1.0 + pow(2.718281828459045, -decision))
    return probability * 100


def _domain_brand_impersonation(host: str, root_domain: str) -> bool:
    host_lower = host.lower()
    host_parts = host_lower.split(".")
    
    for brand, official_root in KNOWN_BRAND_ROOTS.items():
        # Check if brand appears anywhere in the host
        if brand in host_lower and root_domain != official_root:
            # If brand is part of a subdomain (but not the root), it's impersonation
            if brand in host_parts[:-2]:  # Check if brand is in subdomain parts, not TLD/root
                return True
            # Also catch cases where brand.com appears as part of the subdomain
            if f"{brand}.com" in host_lower and root_domain != official_root:
                return True
    return False


def _score_url_risk(url: str) -> tuple[float, dict[str, Any]]:
    normalized = _normalize_url(url)
    if not normalized:
        return 0.0, {"host": "", "root_domain": "", "trusted_domain": False, "major_flags": 0}

    parsed = urlparse(normalized)
    host = _extract_host(normalized)
    root_domain = _extract_root_domain(host)
    lower_combined = f"{host} {parsed.path} {parsed.query}".lower()
    tld = root_domain.split(".")[-1] if root_domain else ""

    risk = 0.0
    major_flags = 0

    if parsed.scheme != "https":
        risk += 12
    if "@" in parsed.netloc:
        risk += 28
        major_flags += 1
    if _is_ip_host(host):
        risk += 45
        major_flags += 1
    if "xn--" in host:
        risk += 35
        major_flags += 1
    if parsed.port and parsed.port not in {80, 443}:
        risk += 15
    if host.count(".") >= 3:
        risk += 8
    if len(normalized) >= 120:
        risk += 18
    elif len(normalized) >= 75:
        risk += 10
    if host.count("-") >= 3:
        risk += 10
    if tld in SUSPICIOUS_TLDS:
        risk += 18

    keyword_hits = [word for word in SUSPICIOUS_URL_WORDS if word in lower_combined]
    risk += min(24, len(keyword_hits) * 5)

    query_params = {key.lower() for key in parse_qs(parsed.query).keys()}
    if query_params.intersection({"redirect", "redirect_uri", "next", "return", "continue", "target", "url"}):
        risk += 12

    if re.search(r"\.(?:apk|bat|cmd|dmg|exe|iso|js|msi|scr|zip)$", parsed.path.lower()):
        risk += 20

    # Check for brand names appearing in subdomain structure (e.g., paypal.com in subdomains)
    for brand, official_root in KNOWN_BRAND_ROOTS.items():
        if f"{brand}.com" in host.lower() and root_domain != official_root:
            risk += 25  # Additional penalty for brand.com appearing in subdomains
            major_flags += 1
            break

    brand_impersonation = _domain_brand_impersonation(host, root_domain)
    if brand_impersonation:
        risk += 22
        major_flags += 1

    trusted_domain = _is_trusted_root_domain(host)
    if trusted_domain and parsed.scheme == "https" and major_flags == 0:
        risk -= 25
        if not keyword_hits:
            risk -= 5

    return max(0.0, min(100.0, risk)), {
        "host": host,
        "root_domain": root_domain,
        "trusted_domain": trusted_domain,
        "major_flags": major_flags,
    }


def _score_email_risk(email: str) -> float:
    normalized = _clean_text(email)
    if not normalized:
        return 0.0

    risk = 0.0

    if any(word in normalized for word in ("urgent", "immediately", "now", "asap")):
        risk += 12
    if any(word in normalized for word in ("click", "verify", "confirm", "reset", "login", "sign in")):
        risk += 12
    if any(word in normalized for word in ("password", "credential", "passcode", "2fa", "otp")):
        risk += 16
    if any(word in normalized for word in ("bank", "wallet", "billing", "payment", "invoice", "card")):
        risk += 12
    if any(word in normalized for word in ("locked", "suspend", "suspended", "disabled", "breach", "security alert")):
        risk += 12
    if any(word in normalized for word in ("attachment", "attached file", "download")):
        risk += 8
    if any(domain in normalized for domain in SHORTENER_DOMAINS):
        risk += 12
    if normalized.count("!") >= 3 or re.search(r"\b[A-Z]{5,}\b", email):
        risk += 6

    safe_hits = sum(1 for phrase in SAFE_EMAIL_PHRASES if phrase in normalized)
    risk -= min(18, safe_hits * 6)

    return max(0.0, min(100.0, risk))


def _heuristic_risk(email: str, url: str, input_type: str) -> tuple[float, dict[str, Any]]:
    url_risk, url_meta = _score_url_risk(url)
    email_risk = _score_email_risk(email)

    if input_type == "url":
        return url_risk, {"url_risk": url_risk, "email_risk": 0.0, **url_meta}
    if input_type == "email":
        return email_risk, {"url_risk": 0.0, "email_risk": email_risk, **url_meta}

    combined = (url_risk * 0.6) + (email_risk * 0.4)
    return combined, {"url_risk": url_risk, "email_risk": email_risk, **url_meta}


def classify_risk(risk_score: float) -> str:
    if risk_score >= 70:
        return "Harmful"
    if risk_score >= 35:
        return "Suspicious"
    return "Safe"


def predict_phishing(email: str, url: str, input_type: str = "both") -> dict[str, str | float | bool]:
    try:
        pipeline = _get_or_load_cached_model(DEFAULT_MODEL_PATH)
    except Exception as exc:
        warn(f"Failed to load model at {DEFAULT_MODEL_PATH}: {exc}. Re-training model.")
        train_and_save_model(model_path=DEFAULT_MODEL_PATH)
        pipeline = _get_or_load_cached_model(DEFAULT_MODEL_PATH)

    features = [_combine_features(email=email, url=url, input_type=input_type)]
    ml_probability = _phishing_probability_percent(pipeline, features)
    heuristic_risk, heuristic_meta = _heuristic_risk(email=email, url=url, input_type=input_type)

    risk_score = (ml_probability * 0.45) + (heuristic_risk * 0.55)

    if heuristic_meta.get("trusted_domain") and heuristic_meta.get("url_risk", 0.0) <= 15 and ml_probability < 60:
        risk_score = min(risk_score, 20.0)
    elif heuristic_risk <= 10 and ml_probability <= 45:
        risk_score = min(risk_score, 18.0)
    elif heuristic_risk >= 80 and ml_probability >= 50:
        risk_score = max(risk_score, 80.0)

    risk_score = round(max(0.0, min(100.0, risk_score)), 2)
    prediction = "Phishing" if risk_score >= 60 else "Safe"

    return {
        "prediction": prediction,
        "risk_score": risk_score,
        "confidence": round(max(risk_score, 100 - risk_score), 2),
        "phishing_probability": risk_score,
        "ml_probability": round(ml_probability, 2),
        "heuristic_risk": round(heuristic_risk, 2),
        "trusted_domain": bool(heuristic_meta.get("trusted_domain")),
        "url_risk": round(float(heuristic_meta.get("url_risk", 0.0)), 2),
        "email_risk": round(float(heuristic_meta.get("email_risk", 0.0)), 2),
    }
