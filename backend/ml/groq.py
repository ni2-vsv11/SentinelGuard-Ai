from __future__ import annotations

import os
from urllib.parse import urlparse

from groq import Groq


_LOGIN_PATH_HINTS = (
	"login",
	"sign-in",
	"signin",
	"verify",
	"verification",
	"secure",
	"account",
	"update",
	"confirm",
	"reset",
)

_FINANCIAL_PATH_HINTS = (
	"bank",
	"billing",
	"invoice",
	"payment",
	"wallet",
	"checkout",
	"transfer",
)

_EMAIL_THREAT_HINTS = (
	("urgent", "uses urgency to pressure the reader"),
	("immediately", "uses urgency to pressure the reader"),
	("password", "asks for credentials or password-related action"),
	("verify", "pushes the reader to verify information on a link"),
	("account", "targets account access or account recovery"),
	("invoice", "tries to make the message look like a payment notice"),
	("payment", "tries to steer the reader toward a financial action"),
	("click", "pushes the reader to click a link quickly"),
	("attachment", "may try to deliver a malicious file"),
	("security", "uses security-themed language to build trust"),
)

_GROQ_MODEL = "llama-3.3-70b-versatile"


def _normalize_input_type(input_type: str | None) -> str:
	if input_type in {"email", "url", "both"}:
		return input_type
	return "both"


def _clean_text(value: str) -> str:
	return value.strip() if value else ""


def _extract_domain(url: str) -> str:
	if not url:
		return ""

	parsed = urlparse(url)
	host = parsed.netloc or parsed.path
	host = host.split("@")[-1].split(":")[0].strip().lower()
	return host


def _infer_url_site_type(url: str) -> str:
	parsed = urlparse(url or "")
	url_text = f"{parsed.netloc} {parsed.path} {parsed.query}".lower()

	if any(hint in url_text for hint in _FINANCIAL_PATH_HINTS):
		return "a finance or payment-related page"
	if any(hint in url_text for hint in _LOGIN_PATH_HINTS):
		return "a login or account-verification page"
	if "support" in url_text or "help" in url_text:
		return "a support or help-page impersonation"
	return "a potentially impersonated web page"


def _infer_email_harm(email: str) -> str:
	email_text = email.lower()
	hints = [description for keyword, description in _EMAIL_THREAT_HINTS if keyword in email_text]

	if not hints:
		return "The email should be treated carefully because it may be trying to move you to the linked site."

	unique_hints = list(dict.fromkeys(hints))
	if len(unique_hints) == 1:
		return f"The email {unique_hints[0]}."

	return "The email " + ", ".join(unique_hints[:-1]) + f", and {unique_hints[-1]}."


def _extract_sender(email: str) -> str:
	"""Try to extract a sender name or email address from the raw email text."""
	if not email:
		return "(unknown sender)"

	import re

	m = re.search(r"^From:\s*(.+)$", email, flags=re.IGNORECASE | re.MULTILINE)
	if m:
		return m.group(1).strip()

	m2 = re.search(r"[\w.+-]+@[\w-]+\.[\w.-]+", email)
	if m2:
		return m2.group(0)

	return "(unknown sender)"


def _build_context_summary(
	email: str,
	url: str,
	input_type: str,
	prediction: str,
	confidence: float,
) -> dict[str, str]:
	input_type = _normalize_input_type(input_type)
	domain = _extract_domain(url)
	site_type = _infer_url_site_type(url)
	email_present = bool(email)
	url_present = bool(url)

	if input_type == "email" and email_present:
		site_summary = "Site: No URL was provided, so only the email was analyzed."
	elif input_type == "url" and url_present:
		site_summary = f"Site: {domain} appears to be {site_type}."
	elif url_present:
		site_summary = f"Site: {domain} appears to be {site_type}."
	else:
		site_summary = "Site: No URL was provided, so the site type could not be identified."

	harm_summary = (
		"Harm: This could steal credentials, redirect to a fake login, or expose personal data."
		if prediction == "Phishing"
		else "Harm: The current score does not show strong signs of direct harm, but it should still be verified before trusting it."
	)
	if input_type == "url" and not email_present:
		email_summary = "Email: No email content was provided, so only the URL was analyzed."
	else:
		email_summary = f"Email: {_infer_email_harm(email)}"
	recommendation = (
		"Action: Do not click the link or reply. Open the real site manually and verify the sender independently."
		if prediction == "Phishing"
		else "Action: Verify the sender, inspect the domain, and only continue if the message matches the official source."
	)

	sender = _extract_sender(email)
	domain_only = domain or "(no domain)"

	return {
		"site_summary": site_summary,
		"harm_summary": harm_summary,
		"email_summary": email_summary,
		"recommendation": recommendation,
		"identified_sender": sender,
		"site_domain": domain_only,
	}


def _build_fallback_explanation(
	email: str,
	url: str,
	input_type: str,
	prediction: str,
	confidence: float,
) -> str:
	context = _build_context_summary(
		email=email,
		url=url,
		input_type=input_type,
		prediction=prediction,
		confidence=confidence,
	)
	return "\n".join(
		[
			context["site_summary"],
			context["harm_summary"],
			context["email_summary"],
			context["recommendation"],
		]
	)


def _normalize_explanation(explanation: str) -> str:
	lines = [line.strip() for line in explanation.splitlines() if line.strip()]
	if not lines:
		return ""
	return "\n".join(lines[:4])


def _build_prompt(
	email: str,
	url: str,
	input_type: str,
	prediction: str,
	confidence: float,
	context: dict[str, str],
) -> str:
	input_type = _normalize_input_type(input_type)
	if input_type == "email":
		focus_note = "Focus on the email only. Ignore the URL because none was provided."
	elif input_type == "url":
		focus_note = "Focus on the URL only. Ignore the email because none was provided."
	else:
		focus_note = "Use both the email and URL together to explain the threat."

	return (
		"You are a cybersecurity analyst helping a user understand a suspicious message.\n"
		"Write 3-4 short lines with these exact ideas: Site, Harm, Email, Action.\n"
		"Be specific about the domain or site type, the likely harm, and why the email is risky.\n"
		"Do not mention policies, AI, or disclaimers. Do not be vague.\n\n"
		f"Analysis scope: {focus_note}\n\n"
		f"Site hint: {context['site_summary']}\n"
		f"Risk hint: {context['harm_summary']}\n"
		f"Email hint: {context['email_summary']}\n"
		f"Action hint: {context['recommendation']}\n\n"
		f"Email content:\n{_clean_text(email)[:2000] if email else '(none)'}\n\n"
		f"URL:\n{_clean_text(url) if url else '(none)'}\n\n"
		f"ML prediction result:\nPrediction: {prediction}\nConfidence: {confidence:.2f}%"
	)


def _create_client() -> Groq:
	api_key = os.getenv("GROQ_API_KEY", "").strip()
	if not api_key:
		raise RuntimeError("GROQ_API_KEY is not set in the environment.")
	return Groq(api_key=api_key)


def generate_ai_explanation(
	email: str,
	url: str,
	input_type: str,
	prediction: str,
	confidence: float,
) -> str:
	"""Generate a customized human explanation from Groq for phishing analysis results."""
	context = _build_context_summary(
		email=email,
		url=url,
		input_type=input_type,
		prediction=prediction,
		confidence=confidence,
	)
	fallback_explanation = _build_fallback_explanation(email, url, input_type, prediction, confidence)

	try:
		client = _create_client()
	except RuntimeError:
		return fallback_explanation

	prompt = _build_prompt(
		email=email,
		url=url,
		input_type=input_type,
		prediction=prediction,
		confidence=confidence,
		context=context,
	)

	try:
		response = client.chat.completions.create(
			model=_GROQ_MODEL,
			messages=[
				{"role": "system", "content": "You provide concise phishing analysis for security tools."},
				{"role": "user", "content": prompt},
			],
			temperature=0.2,
			max_tokens=220,
		)
		content = getattr(response.choices[0].message, "content", "") if response.choices else ""
		explanation = _normalize_explanation(str(content))
		if explanation:
			return explanation
	except Exception:
		return fallback_explanation

	return fallback_explanation


def build_analysis_context(
	email: str,
	url: str,
	input_type: str,
	prediction: str,
	confidence: float,
) -> dict[str, str]:
	"""Build structured site and email summaries for the UI and API response."""
	context = _build_context_summary(
		email=email,
		url=url,
		input_type=input_type,
		prediction=prediction,
		confidence=confidence,
	)
	context["prediction_summary"] = (
		f"Prediction: {prediction} ({confidence:.1f}% confidence)."
		if prediction in {"Phishing", "Suspicious", "Safe"}
		else f"Prediction: {prediction}."
	)
	return context