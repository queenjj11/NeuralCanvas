"""The parity test the whole product rests on (PRD 2.3, 8.2)."""

import numpy as np
import pytest

from app.model import get_model


def test_forward_matches_predict_proba():
    for ds in ["iris", "wine", "digits", "moons", "circles"]:
        model = get_model(ds)
        rng = np.random.default_rng(0)
        lows = np.array([f["min"] for f in model.meta["features"]])
        highs = np.array([f["max"] for f in model.meta["features"]])

        for _ in range(50):
            x = rng.uniform(lows, highs)
            mine = np.asarray(model.forward(x.tolist())["probabilities"])
            theirs = model.clf.predict_proba(model.scaler.transform([x]))[0]
            assert np.allclose(mine, theirs, atol=1e-6)


def test_parameter_count_is_derived_from_the_arrays():
    model = get_model()
    expected = 0
    arch = model.architecture
    for a, b in zip(arch, arch[1:]):
        expected += a * b + b
    assert model.parameters == expected
    if arch == [4, 6, 4, 3]:
        assert model.parameters == 73  # not 83


def test_layer_shapes_follow_the_architecture():
    model = get_model()
    out = model.forward([5.1, 3.5, 1.4, 0.2])
    assert [len(l["activations"]) for l in out["layers"]] == model.architecture
    assert out["layers"][0]["name"] == "input"
    assert out["layers"][-1]["name"] == "output"
    assert pytest.approx(sum(out["layers"][-1]["activations"]), abs=1e-9) == 1.0


def test_relu_layers_are_never_negative():
    model = get_model()
    out = model.forward([7.0, 2.0, 6.5, 2.4])
    for layer in out["layers"][1:-1]:
        assert min(layer["activations"]) >= 0.0


def test_softmax_is_stable_for_large_inputs():
    model = get_model()
    out = model.forward([10.0, 10.0, 10.0, 10.0])
    assert all(np.isfinite(out["probabilities"]))
