# NeuralCanvas

### See a neural network think.

NeuralCanvas is an interactive **3D neural-network visualization platform** that turns real machine-learning inference into a visual, explorable experience.

Instead of displaying a static diagram, NeuralCanvas renders the actual model architecture, learned weights, neuron activations, and forward-pass propagation in real time.

Built for **machine learning interpretability, scientific visualization, and interactive AI education**.

---

## ✦ What NeuralCanvas Does

Select a dataset, provide an input, and watch the model perform inference through a 3D neural network.

Every visual element is driven by data from the actual model:

- **Neuron intensity** → activation magnitude
- **Connection thickness** → weight magnitude
- **Connection direction/color** → weight sign
- **Propagation pulses** → forward-pass contribution
- **Output probabilities** → model prediction
- **Network structure** → actual model architecture

The visualization is therefore not an animation layered on top of a model.

**The visualization is the model's computation.**

---

## ◈ Supported Datasets

NeuralCanvas currently supports five classification problems with different input dimensions, architectures, and decision structures.

| Dataset | Input | Architecture | Classes |
|---|---:|---|---:|
| Iris | 4 features | `4 → 6 → 4 → 3` | 3 |
| Wine | 13 features | `13 → 16 → 10 → 3` | 3 |
| Digits | 64 pixels → 8 PCA features | `8 → 16 → 12 → 10` | 10 |
| Two-Moons | 2 features | `2 → 8 → 8 → 2` | 2 |
| Concentric Circles | 2 features | `2 → 8 → 8 → 2` | 2 |

### Digits

The Digits model accepts the original **8×8 handwritten image representation** and applies PCA dimensionality reduction before inference.

The frontend includes an interactive digit-selection interface with a live pixel-grid representation.

---

## ◉ Real Model, Real Inference

NeuralCanvas does not use a pre-scripted animation pretending to represent a neural network.

The backend loads trained **scikit-learn MLPClassifier models** and exposes their learned parameters to the visualization layer.

For each inference, the system processes:

```text
Input
  ↓
Feature preprocessing
  ↓
Neural network layers
  ↓
Activations
  ↓
Output probabilities
  ↓
Prediction
