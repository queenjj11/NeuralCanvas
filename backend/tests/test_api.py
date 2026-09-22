from app import db


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok" and body["model_loaded"] is True


def test_model_endpoint_shape(client):
    m = client.get("/api/model").json()
    assert m["architecture"][0] == len(m["features"])
    assert m["architecture"][-1] == len(m["classes"])
    assert len(m["weights"]) == len(m["architecture"]) - 1
    assert m["parameters"] == 73
    assert m["test_accuracy"] >= 0.93


def test_predict_returns_layers_and_persists(client):
    r = client.post("/api/predict", json={"features": [5.1, 3.5, 1.4, 0.2]})
    assert r.status_code == 200
    body = r.json()
    assert body["prediction"] == "Iris-setosa"
    assert body["confidence"] > 0.5
    assert [l["name"] for l in body["layers"]][0] == "input"
    assert db.count_predictions() == 1


def test_predict_rejects_wrong_length(client):
    r = client.post("/api/predict", json={"features": [1.0, 2.0]})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "validation_error"


def test_predict_rejects_out_of_hard_limits(client):
    r = client.post("/api/predict", json={"features": [99.0, 3.5, 1.4, 0.2]})
    assert r.status_code == 422


def test_history_list_and_replay(client):
    created = client.post("/api/predict", json={"features": [6.3, 3.3, 6.0, 2.5]}).json()
    items = client.get("/api/history?limit=5").json()
    assert items[0]["id"] == created["id"]
    assert "layers" not in items[0]

    full = client.get(f"/api/history/{created['id']}").json()
    assert full["layers"] == created["layers"]


def test_history_404(client):
    r = client.get("/api/history/999999")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "not_found"


def test_history_clear(client):
    client.post("/api/predict", json={"features": [6.4, 3.2, 4.5, 1.5]})
    assert client.delete("/api/history").status_code == 204
    assert db.count_predictions() == 0


def test_history_is_trimmed_to_the_cap(client, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "history_max_rows", 3)
    for _ in range(5):
        client.post("/api/predict", json={"features": [5.1, 3.5, 1.4, 0.2]})
    assert db.count_predictions() == 3


def test_list_datasets(client):
    r = client.get("/api/datasets")
    assert r.status_code == 200
    datasets = r.json()
    assert len(datasets) == 5
    ids = [d["id"] for d in datasets]
    assert ids == ["iris", "wine", "digits", "moons", "circles"]


def test_model_endpoint_all_datasets(client):
    expected_archs = {
        "iris": [4, 6, 4, 3],
        "wine": [13, 16, 10, 3],
        "digits": [8, 16, 12, 10],
        "moons": [2, 8, 8, 2],
        "circles": [2, 8, 8, 2],
    }
    for ds, arch in expected_archs.items():
        m = client.get(f"/api/model?dataset={ds}").json()
        assert m["architecture"] == arch
        assert len(m["classes"]) == arch[-1]
        assert len(m["features"]) == arch[0]
        assert len(m["weights"]) == len(arch) - 1
        assert m["test_accuracy"] > 0.85


def test_predict_all_datasets(client):
    test_inputs = {
        "iris": [5.1, 3.5, 1.4, 0.2],
        "wine": [13.0, 2.0, 2.3, 19.0, 100.0, 2.8, 3.0, 0.28, 2.0, 5.6, 1.0, 3.1, 1000.0],
        "digits": [0.5] * 8,
        "moons": [0.5, 0.5],
        "circles": [0.0, 0.0],
    }
    for ds, feats in test_inputs.items():
        r = client.post("/api/predict", json={"dataset": ds, "features": feats})
        assert r.status_code == 200
        body = r.json()
        assert "prediction" in body
        assert len(body["probabilities"]) == (3 if ds in ("iris", "wine") else 10 if ds == "digits" else 2)


def test_digits_samples_endpoint(client):
    r = client.get("/api/samples?dataset=digits")
    assert r.status_code == 200
    samples = r.json()
    assert len(samples) == 10
    assert samples[0]["digit"] == 0
    assert len(samples[0]["raw_features"]) == 64
    assert len(samples[0]["pca_features"]) == 8

