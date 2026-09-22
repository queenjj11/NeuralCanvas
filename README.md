# NeuralCanvas

An interactive 3D WebGL visualization engine that renders real machine learning model inference, layer activations, connection weights, and data propagation in real time.

---

## Demo

![NeuralCanvas Demo](docs/images/demo.png)
*(Placeholder for project demo recording — see `docs/` for recording guidelines)*

---

## Overview

NeuralCanvas is a multi-dataset 3D neural-network visualization platform. It pairs a **FastAPI + scikit-learn** Python backend with a **Next.js 15 + React Three Fiber (R3F)** frontend. Nothing rendered on screen is decorative: neuron brightness corresponds to mathematical activations, line thickness maps to weight magnitude ($|W_{ij}|$), connection colors show weight signs, and travelling pulses represent real forward-pass contribution values ($W_{ij} \cdot a_i$).

Supported datasets:
- **Iris Classification**: Botanical species classification (`4 → 6 → 4 → 3`).
- **Wine Classification**: Chemical profile classification across three cultivars (`13 → 16 → 10 → 3`).
- **Digits Classification**: 8x8 handwritten optical digit recognition with PCA feature reduction (`8 → 16 → 12 → 10`).
- **Two-Moons Classification**: Synthetic 2D non-linear moon dataset (`2 → 8 → 8 → 2`).
- **Concentric Circles Classification**: Synthetic 2D concentric ring dataset (`2 → 8 → 8 → 2`).

---

## Key Features

- **Multi-Dataset Model Engine**: Switch between 5 distinct machine learning datasets dynamically.
- **Real-Time ML Inference**: Executes standard scikit-learn predictions on demand with 100% mathematical parity.
- **Data-Driven 3D Scene**: Neural geometry and layer positions are derived dynamically from `model.architecture`.
- **Layer Activation Visualization**: Exposes raw and normalized activation values for every hidden layer unit.
- **Weight-Aware Connections**: Edge thickness and colors reflect standardized weight matrices ($coefs\_$).
- **Animated Inference Propagation**: GSAP-driven particle physics and camera transitions follow the exact forward pass.
- **Interactive Digit Selector**: Interactive 0–9 handwritten digit selector with live 8x8 pixel grid rendering.
- **Inference History & Replay**: Stores historical predictions in SQLite for instant visualization replay.
- **Focus Network Mode**: One-click header toggle to hide interface overlays for an unobstructed 3D scene view.

---

## Supported Models

| Dataset | Architecture | Features | Classes |
| :--- | :--- | :--- | :--- |
| **Iris Classification** | `4 → 6 → 4 → 3` | 4 (Sepal/Petal dims) | 3 (Setosa, Versicolor, Virginica) |
| **Wine Classification** | `13 → 16 → 10 → 3` | 13 (Chemical attributes) | 3 (Class 1, Class 2, Class 3) |
| **Digits Classification** | `8 → 16 → 12 → 10` | 64 (PCA 64 → 8) | 10 (Digits 0–9) |
| **Two-Moons** | `2 → 8 → 8 → 2` | 2 (X, Y coords) | 2 (Moon A, Moon B) |
| **Concentric Circles** | `2 → 8 → 8 → 2` | 2 (X, Y coords) | 2 (Inner, Outer Circle) |

---

## Architecture

```
Frontend (Next.js 15, React 19, Three.js / React Three Fiber)
       │
       ▼
FastAPI Server (Pydantic v2, REST endpoints)
       │
       ▼
Model Registry (Lazy multi-model dataset loader)
       │
       ▼
scikit-learn Model (MLPClassifier, StandardScaler, PCA)
       │
       ▼
Activations / Weights (Extracted NumPy matrices)
       │
       ▼
Three.js / React Three Fiber (Data-driven 3D scene & GSAP animations)
```

---

## Tech Stack

- **Frontend**: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, React Three Fiber, Drei, GSAP, Zustand, TanStack Query, Radix UI / shadcn, Vitest, Playwright.
- **Backend**: Python 3.12, FastAPI, Pydantic v2, scikit-learn 1.6, NumPy 2.2, joblib, SQLite (SQLAlchemy), SlowAPI, pytest.

---

## Project Structure

```
neuralcanvas/
├── backend/
│   ├── app/               # FastAPI application, routes, schemas & dataset registry
│   │   ├── main.py        # FastAPI entrypoint
│   │   ├── dataset_registry.py # Lazy multi-dataset loader & registry
│   │   ├── model.py       # NumPy forward pass & scikit-learn model wrapper
│   │   └── routes/        # API route handlers (/health, /datasets, /model, /predict, /history)
│   ├── artifacts/         # Pre-trained model artifacts per dataset
│   │   ├── iris/          # Iris model artifacts
│   │   ├── wine/          # Wine model artifacts
│   │   ├── digits/        # Digits model artifacts
│   │   ├── moons/         # Two-moons model artifacts
│   │   └── circles/       # Circles model artifacts
│   ├── train.py           # Deterministic multi-dataset training script
│   ├── requirements.txt   # Backend dependencies
│   └── tests/             # pytest test suite
├── frontend/
│   ├── app/               # Next.js App Router layout & pages
│   ├── components/        # 3D canvas components & floating UI panels
│   ├── hooks/             # Custom React hooks (useInference, useDatasets)
│   ├── lib/               # Layout calculations, GSAP animation timelines, API client
│   ├── store/             # Zustand scene state
│   ├── tests/             # Vitest unit tests & Playwright E2E specs
│   └── package.json       # Frontend dependencies & scripts
└── docs/                  # Documentation & visual asset guidelines
```

---

## Installation

### 1. Backend Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train.py
```

### 2. Frontend Setup

```bash
cd frontend
cp .env.local.example .env.local
npm install
```

---

## Running

### Launch Backend Server

```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

### Launch Frontend Server

```bash
cd frontend
npm run dev
```

### Server Access URLs

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend**: [http://localhost:8000](http://localhost:8000)
- **API Docs**: [http://localhost:8000/api/docs](http://localhost:8000/api/docs)

---

## API Endpoints

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/health` | `GET` | Service health status and dataset availability |
| `/api/datasets` | `GET` | List all 5 supported datasets and metadata |
| `/api/model?dataset={id}` | `GET` | Architecture, weight matrices, biases, and feature bounds for specified dataset |
| `/api/samples?dataset={id}` | `GET` | Preset sample inputs for the specified dataset |
| `/api/predict` | `POST` | Executes inference for target dataset, returning probabilities and layer activations |
| `/api/history` | `GET` | Retrieves recent inference history log |
| `/api/history/{id}` | `GET` | Retrieves activation payload for replaying a specific historical inference |
| `/api/history` | `DELETE` | Clears stored inference history |

---

## Testing

```bash
# 1. Backend pytest suite
cd backend && source .venv/bin/activate && python -m pytest -q

# 2. Frontend TypeScript typecheck
cd frontend && npm run typecheck

# 3. Frontend Vitest unit tests
cd frontend && npm run test

# 4. Frontend Playwright E2E tests
cd frontend && npx playwright test --workers=1
```

- **Backend Pytest**: `18 passed`
- **TypeScript Check**: `0 errors`
- **Frontend Unit Tests**: `30 passed`
- **Playwright E2E Tests**: `8 passed`

---

## Design

NeuralCanvas features a restrained scientific visualization aesthetic designed for clarity and depth. All scene elements (neuron activations, connection thickness, propagation pulses, and completion ripples) directly represent mathematical quantities returned by the backend. Floating UI panels use compact glass overlays that keep the 3D neural network as the central focus. The **Focus Network** mode allows toggling off interface panels for an uninhibited view of data propagation.

---

## License

No license is currently specified. A suitable license (e.g. MIT) should be selected before publishing to GitHub.
