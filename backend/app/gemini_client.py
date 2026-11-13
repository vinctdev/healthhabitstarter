import json
from collections.abc import AsyncIterator
from dataclasses import dataclass

import httpx
from fastapi import HTTPException

from .config import settings

API_VERSION = "v1beta"
AI_DISABLED_MESSAGE = "AI features are disabled: set GEMINI_API_KEY (see docs/gemini.md)."


def ai_enabled() -> bool:
    """AI features are optional: without GEMINI_API_KEY the rest of the app works as usual."""
    return bool(settings.gemini_api_key.strip())


def require_ai() -> None:
    if not ai_enabled():
        raise HTTPException(status_code=503, detail=AI_DISABLED_MESSAGE)


def _headers() -> dict[str, str]:
    # The key goes in a header, not the URL: URLs end up in logs and error messages.
    return {"Content-Type": "application/json", "x-goog-api-key": settings.gemini_api_key}


def _model_url(method: str) -> str:
    return f"https://generativelanguage.googleapis.com/{API_VERSION}/models/{settings.gemini_model}:{method}"


async def call_gemini(payload: dict, timeout: int = 15) -> dict:
    require_ai()
    url = _model_url("generateContent")

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(
                url,
                json=payload,
                headers=_headers(),
            )
            if response.status_code == 200:
                return response.json()
            body = await response.aread()
            detail = f"Gemini API: HTTP {response.status_code} - {body.decode()[:300]}"
            raise HTTPException(status_code=502, detail=detail)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API: {e}") from e


@dataclass
class GeminiStreamChunk:
    text: str | None = None
    function_call: dict | None = None
    error: str | None = None


def _process_candidates(
    candidates: list[dict], function_call_buffers: list[dict] | None
) -> tuple[list[GeminiStreamChunk], list[dict]]:
    chunks: list[GeminiStreamChunk] = []
    bufs = list(function_call_buffers) if function_call_buffers is not None else []

    for candidate in candidates:
        content = candidate.get("content")
        if not content:
            continue

        parts = content.get("parts", [])

        for part in parts:
            if "text" in part and part["text"]:
                chunks.append(GeminiStreamChunk(text=part["text"]))

            elif "functionCall" in part:
                fc = part["functionCall"]
                name = fc.get("name", "")
                buf = next((b for b in bufs if b.get("name") == name), None)
                if buf is None:
                    buf = {}
                    bufs.append(buf)
                for key, val in fc.items():
                    if key == "args" and isinstance(val, dict):
                        if "args" not in buf:
                            buf["args"] = {}
                        for k, v in val.items():
                            if isinstance(v, str):
                                buf["args"][k] = buf["args"].get(k, "") + v
                            else:
                                buf["args"][k] = v
                    elif key == "name":
                        buf["name"] = val
                    else:
                        buf[key] = val

                for k, v in part.items():
                    if k.startswith("thought"):
                        buf[k] = v

            elif bufs and (
                any(k.startswith("thought") for k in part) or "thoughtSignature" in part
            ):
                target = bufs[-1]
                for k, v in part.items():
                    if k not in ("text", "functionCall"):
                        target[k] = v

        thought_sig = candidate.get("thoughtSignature") or content.get("thoughtSignature")
        if thought_sig and bufs:
            bufs[-1]["thought_signature"] = thought_sig

    return chunks, bufs


async def stream_chat_gemini(payload: dict, timeout: int = 60) -> AsyncIterator[GeminiStreamChunk]:
    require_ai()
    url = _model_url("streamGenerateContent")

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                url,
                params={"alt": "sse"},
                json=payload,
                headers=_headers(),
            ) as response:
                content_type = response.headers.get("content-type", "")
                if response.status_code != 200:
                    body = await response.aread()
                    err_text = body.decode()[:500]
                    raise HTTPException(
                        status_code=502,
                        detail=f"Gemini API: HTTP {response.status_code} - {err_text}",
                    )

                is_json = "application/json" in content_type

                if is_json:
                    body = await response.aread()
                    try:
                        items = json.loads(body)
                    except json.JSONDecodeError as je:
                        raise HTTPException(
                            status_code=502, detail=f"Gemini API: invalid JSON - {je}"
                        ) from je

                    if not isinstance(items, list):
                        raise HTTPException(
                            status_code=502, detail="Gemini API: expected a JSON array"
                        )

                    function_call_buffers: list[dict] = []

                    for item in items:
                        prompt_feedback = item.get("promptFeedback")
                        if prompt_feedback:
                            block_reason = prompt_feedback.get("blockReason", "UNKNOWN")
                            yield GeminiStreamChunk(error=f"Prompt blocked: {block_reason}")
                            continue

                        candidates = item.get("candidates", [])
                        if not candidates:
                            continue

                        chunk_list, function_call_buffers = _process_candidates(
                            candidates, function_call_buffers
                        )
                        for chunk in chunk_list:
                            yield chunk

                    for buf in function_call_buffers:
                        if buf.get("name"):
                            yield GeminiStreamChunk(function_call=buf)

                    return

                # SSE path
                function_call_buffers: list[dict] = []

                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    if not line.startswith("data:"):
                        continue

                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        break

                    try:
                        data = json.loads(data_str)
                    except json.JSONDecodeError:
                        continue

                    prompt_feedback = data.get("promptFeedback")
                    if prompt_feedback:
                        block_reason = prompt_feedback.get("blockReason", "UNKNOWN")
                        yield GeminiStreamChunk(error=f"Prompt blocked: {block_reason}")
                        continue

                    candidates = data.get("candidates", [])
                    if not candidates:
                        continue

                    chunk_list, function_call_buffers = _process_candidates(
                        candidates, function_call_buffers
                    )
                    for chunk in chunk_list:
                        yield chunk

                for buf in function_call_buffers:
                    if buf.get("name"):
                        yield GeminiStreamChunk(function_call=buf)

                return

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gemini API: {type(e).__name__}: {e}") from e
