# NeuralCanvas

### See a neural network think.

NeuralCanvas is an interactive 3D machine-learning visualization platform that transforms real model inference into a spatial, animated experience.

Instead of treating a neural network as a static diagram, NeuralCanvas visualizes what happens during inference — from input features entering the network to activations propagating through hidden layers and producing a final prediction.

Built with **Next.js, React Three Fiber, Three.js, FastAPI, and scikit-learn**.

---

## ✦ What makes NeuralCanvas different?

Most neural-network visualizers are either:

- static architecture diagrams,
- educational simulations using manually defined values, or
- visual demonstrations disconnected from an actual trained model.

NeuralCanvas connects the visualization directly to **real machine-learning models**.

Every inference produces data that drives the 3D scene:

```text
Input
  ↓
Feature Transformation
  ↓
Hidden Layer Activations
  ↓
Weighted Connections
  ↓
Output Probabilities
  ↓
Prediction
