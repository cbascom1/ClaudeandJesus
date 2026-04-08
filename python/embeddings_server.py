"""
Scripture Study — Embeddings Sidecar Server

FastAPI micro-server that exposes sentence-transformers for:
  /health          — liveness check (returns model name + version)
  /encode          — encode one or more texts → 384-dim float32 vectors
  /classify        — zero-shot topic classification via cosine similarity

Designed to be spawned by the Electron main process and killed on app quit.
Port is passed as a CLI argument so Electron can assign a free port dynamically.
"""

from __future__ import annotations

import argparse
import sys
from contextlib import asynccontextmanager
from typing import Optional

import numpy as np
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

MODEL_NAME = "all-MiniLM-L6-v2"
model = None  # loaded lazily at startup


def load_model():
    global model
    from sentence_transformers import SentenceTransformer
    print(f"[embeddings] Loading model {MODEL_NAME}…", flush=True)
    model = SentenceTransformer(MODEL_NAME)
    print(f"[embeddings] Model loaded — dim={model.get_sentence_embedding_dimension()}", flush=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    load_model()
    yield


app = FastAPI(title="Scripture Embeddings", lifespan=lifespan)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class EncodeRequest(BaseModel):
    texts: list[str]


class EncodeResponse(BaseModel):
    """Each embedding is a list of 384 floats."""
    embeddings: list[list[float]]


class ClassifyRequest(BaseModel):
    """Classify a verse against a set of candidate topic labels."""
    text: str
    labels: list[str]
    top_k: int = 5


class ClassifyResult(BaseModel):
    label: str
    score: float  # cosine similarity [0, 1]


class ClassifyResponse(BaseModel):
    results: list[ClassifyResult]


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": MODEL_NAME,
        "dim": model.get_sentence_embedding_dimension() if model else 0,
    }


@app.post("/encode", response_model=EncodeResponse)
def encode(req: EncodeRequest):
    assert model is not None, "Model not loaded"
    embeddings = model.encode(req.texts, convert_to_numpy=True, normalize_embeddings=True)
    return EncodeResponse(embeddings=embeddings.tolist())


@app.post("/classify", response_model=ClassifyResponse)
def classify(req: ClassifyRequest):
    """
    Zero-shot topic classification:
    Encode the verse and all candidate labels, return top-K by cosine similarity.
    """
    assert model is not None, "Model not loaded"

    # Encode verse + labels in one batch for efficiency.
    all_texts = [req.text] + req.labels
    vecs = model.encode(all_texts, convert_to_numpy=True, normalize_embeddings=True)

    verse_vec = vecs[0]
    label_vecs = vecs[1:]

    # Cosine similarity — vectors are already normalized, so dot product suffices.
    similarities = np.dot(label_vecs, verse_vec)

    # Build results sorted by score descending, take top_k.
    scored = [(req.labels[i], float(similarities[i])) for i in range(len(req.labels))]
    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[: req.top_k]

    return ClassifyResponse(results=[ClassifyResult(label=l, score=s) for l, s in top])


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=0, help="Port to listen on (0 = random)")
    args = parser.parse_args()

    # When port=0, uvicorn picks a free port. We print it so the Electron
    # sidecar manager can read it from stdout.
    config = uvicorn.Config(app, host="127.0.0.1", port=args.port, log_level="warning")
    server = uvicorn.Server(config)

    # Override startup to print the actual bound port.
    original_startup = server.startup

    async def custom_startup(sockets=None):
        await original_startup(sockets)
        # After startup, the server's sockets list has the actual port.
        for sock in server.servers:
            for s in sock.sockets:
                addr = s.getsockname()
                print(f"SIDECAR_PORT={addr[1]}", flush=True)
                break
            break

    server.startup = custom_startup
    server.run()
