# Working in this repo

## Layout

- `backend/` — FastAPI + scikit-learn. The model is the source of truth for
  everything the UI draws.
- `frontend/` — Next.js App Router, React 19, Tailwind v4, React Three Fiber.

## The rule that matters

**Nothing in the scene is decorative.** Neuron brightness is a real activation,
line thickness is a real weight, pulse brightness is a real contribution. If a
visual can't be traced back to a number in the API response, it doesn't ship.

Two consequences:

1. The API never rescales values to look nicer. All display normalisation lives
   in `frontend/lib/normalize.ts` and is documented in the README legend.
2. `backend/tests/test_forward.py` checks the manual NumPy forward pass against
   `predict_proba` on 200 random inputs within `1e-6`. Never skip it.

## Conventions

- The scene is built from `architecture` alone. Any code that assumes four
  layers or three classes is a bug — test with `[4,8,8,3]`.
- Animation runs through GSAP writing into `lib/anim.ts`, which `useFrame`
  reads. Never put per-frame values in React state.
- Server state goes through TanStack Query; only scene/interaction state goes
  in Zustand.
- Parameter counts, layer names and feature metadata are always derived, never
  hardcoded.

## shadcn components

UI primitives live in `frontend/components/ui/` and are generated, not
hand-written. Add one with:

```bash
cd frontend && npx shadcn@latest add <component>
```

Accept whichever primitive layer (Base UI or Radix) `shadcn init` picks, and do
not mix both. The shadcn MCP server can be configured so agents compose these
accurately.

## Before opening a PR

```bash
cd backend  && python -m pytest -q
cd frontend && npm run typecheck && npm run test && npm run build
```
