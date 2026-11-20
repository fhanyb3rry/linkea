"""Entrena la CNN 1D de Linkea sobre las secuencias de estadías.

    python -m app.ml.cnn_datos   (primero: genera los tensores)
    python -m app.ml.cnn

Equivalente de las Etapas 16 y 17 de SmartAcademy aplicado al problema
del proyecto: clasificar la tendencia de una estadía (Favorable / Estable
/ Descendente) a partir de su serie de bitácoras resumida en 3 tramos.

    - Arquitectura Conv1d + BatchNorm + ReLU (x2), pooling, dropout y
      una capa lineal de 3 salidas, igual que la práctica.
    - Early stopping por pérdida de validación + ReduceLROnPlateau.
    - La prueba se evalúa una sola vez, al final, con el mejor modelo.
    - Después se compara contra un Random Forest sobre los mismos
      tensores aplanados (la comparación de la Etapa 17).

Salida en app/ml/artefactos/cnn/:
    linkea_cnn1d.pth                    pesos + metadatos del modelo
    metricas_cnn.json                   métricas y comparación CNN vs RF
    historial_entrenamiento_cnn.csv     pérdida/accuracy por época
    comparacion_cnn_rf.csv              tabla comparativa
    matriz_confusion_cnn.png            matriz de confusión
"""

import copy
import json
import random

import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from torch.utils.data import DataLoader, TensorDataset

from app.ml.cnn_datos import (
    ARCHIVO_NPZ,
    MAPA_ETIQUETAS,
    RUTA_CNN,
    SEMILLA,
)

CLASES = ["Descendente", "Estable", "Favorable"]
TAMANO_LOTE = 32        # los datos son ~500, no 50,000
NUM_EPOCAS = 40
PACIENCIA = 8
TASA = 0.001

MODELO_PTH = RUTA_CNN / "linkea_cnn1d.pth"
METRICAS_JSON = RUTA_CNN / "metricas_cnn.json"
HISTORIAL_CSV = RUTA_CNN / "historial_entrenamiento_cnn.csv"
COMPARACION_CSV = RUTA_CNN / "comparacion_cnn_rf.csv"
MATRIZ_PNG = RUTA_CNN / "matriz_confusion_cnn.png"


def _semillas() -> None:
    random.seed(SEMILLA)
    np.random.seed(SEMILLA)
    torch.manual_seed(SEMILLA)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(SEMILLA)
        torch.backends.cudnn.deterministic = True
        torch.backends.cudnn.benchmark = False


class LinkeaCNN(nn.Module):
    """Conv1d sobre [lote, 2 canales, 3 tramos] -> 3 clases."""

    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv1d(2, 16, kernel_size=2, padding=1)
        self.bn1 = nn.BatchNorm1d(16)
        self.conv2 = nn.Conv1d(16, 32, kernel_size=2)
        self.bn2 = nn.BatchNorm1d(32)
        self.pool = nn.AdaptiveAvgPool1d(1)
        self.dropout = nn.Dropout(0.25)
        self.clasificador = nn.Linear(32, 3)

    def forward(self, x):
        x = torch.relu(self.bn1(self.conv1(x)))
        x = torch.relu(self.bn2(self.conv2(x)))
        x = torch.flatten(self.pool(x), start_dim=1)
        return self.clasificador(self.dropout(x))


def _epoca(modelo, loader, criterio, optimizador, dispositivo):
    modelo.train()
    perdida, total = 0.0, 0
    for xb, yb in loader:
        xb, yb = xb.to(dispositivo), yb.to(dispositivo)
        optimizador.zero_grad(set_to_none=True)
        salida = modelo(xb)
        loss = criterio(salida, yb)
        loss.backward()
        optimizador.step()
        perdida += loss.item() * len(xb)
        total += len(xb)
    return perdida / total


def _perdida(modelo, loader, criterio, dispositivo):
    modelo.eval()
    perdida, total = 0.0, 0
    with torch.no_grad():
        for xb, yb in loader:
            xb, yb = xb.to(dispositivo), yb.to(dispositivo)
            perdida += criterio(modelo(xb), yb).item() * len(xb)
            total += len(xb)
    return perdida / total


def _predicciones(modelo, loader, dispositivo):
    modelo.eval()
    preds, reales = [], []
    with torch.no_grad():
        for xb, yb in loader:
            preds.extend(torch.argmax(modelo(xb.to(dispositivo)), dim=1).cpu().numpy())
            reales.extend(yb.numpy())
    return np.asarray(preds), np.asarray(reales)


def _metricas(y_real, pred) -> dict:
    return {
        "accuracy": float(accuracy_score(y_real, pred)),
        "precision_macro": float(precision_score(y_real, pred, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_real, pred, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_real, pred, average="macro", zero_division=0)),
    }


def main() -> None:
    _semillas()
    dispositivo = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Dispositivo: {dispositivo}")

    datos = np.load(ARCHIVO_NPZ, allow_pickle=False)
    X_tr, y_tr = datos["X_train"], datos["y_train"]
    X_va, y_va = datos["X_val"], datos["y_val"]
    X_te, y_te = datos["X_test"], datos["y_test"]
    print(f"train {X_tr.shape} | val {X_va.shape} | test {X_te.shape}")

    gen = torch.Generator().manual_seed(SEMILLA)
    loader_tr = DataLoader(
        TensorDataset(torch.tensor(X_tr), torch.tensor(y_tr)),
        batch_size=TAMANO_LOTE, shuffle=True, generator=gen)
    loader_va = DataLoader(
        TensorDataset(torch.tensor(X_va), torch.tensor(y_va)),
        batch_size=TAMANO_LOTE)
    loader_te = DataLoader(
        TensorDataset(torch.tensor(X_te), torch.tensor(y_te)),
        batch_size=TAMANO_LOTE)

    modelo = LinkeaCNN().to(dispositivo)
    n_params = sum(p.numel() for p in modelo.parameters() if p.requires_grad)
    print(f"Parámetros entrenables: {n_params:,}")

    criterio = nn.CrossEntropyLoss()
    optimizador = torch.optim.Adam(modelo.parameters(), lr=TASA)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizador, mode="min", factor=0.5, patience=3, min_lr=1e-5)

    historial, mejor_perdida, mejor_epoca, mejor_estado = [], float("inf"), 0, None
    sin_mejora = 0
    for epoca in range(1, NUM_EPOCAS + 1):
        loss_tr = _epoca(modelo, loader_tr, criterio, optimizador, dispositivo)
        loss_va = _perdida(modelo, loader_va, criterio, dispositivo)
        scheduler.step(loss_va)
        historial.append({"epoca": epoca, "perdida_train": loss_tr,
                          "perdida_val": loss_va,
                          "lr": optimizador.param_groups[0]["lr"]})
        print(f"Época {epoca:02d} | train {loss_tr:.4f} | val {loss_va:.4f}")
        if loss_va < mejor_perdida:
            mejor_perdida, mejor_epoca = loss_va, epoca
            mejor_estado = copy.deepcopy(modelo.state_dict())
            sin_mejora = 0
        else:
            sin_mejora += 1
            if sin_mejora >= PACIENCIA:
                print("Early stopping: la validación dejó de mejorar.")
                break

    if mejor_estado is None:
        raise RuntimeError("No se obtuvo un modelo válido.")
    modelo.load_state_dict(mejor_estado)

    pred, real = _predicciones(modelo, loader_te, dispositivo)
    met_cnn = _metricas(real, pred)
    matriz = confusion_matrix(real, pred, labels=[0, 1, 2])
    print(f"\nCNN en prueba: accuracy {met_cnn['accuracy']:.2%} | "
          f"F1 {met_cnn['f1_macro']:.2%} (mejor época {mejor_epoca})")
    print(classification_report(real, pred, labels=[0, 1, 2],
                                target_names=CLASES, zero_division=0))

    # ---- Etapa 17: Random Forest sobre los mismos tensores aplanados ----
    rf = RandomForestClassifier(n_estimators=300, random_state=SEMILLA, n_jobs=-1)
    rf.fit(X_tr.reshape(len(X_tr), -1), y_tr)
    met_rf = _metricas(y_te, rf.predict(X_te.reshape(len(X_te), -1)))
    print(f"Random Forest en prueba: accuracy {met_rf['accuracy']:.2%} | "
          f"F1 {met_rf['f1_macro']:.2%}")

    comparacion = pd.DataFrame([
        {"modelo": "CNN 1D", **met_cnn},
        {"modelo": "Random Forest", **met_rf},
    ])
    comparacion.to_csv(COMPARACION_CSV, index=False, encoding="utf-8")
    ganador = comparacion.loc[comparacion["f1_macro"].idxmax(), "modelo"]

    # ---- Guardar todo ----
    torch.save({
        "model_state_dict": mejor_estado,
        "arquitectura": "LinkeaCNN (Conv1d x2 + pool + dropout + linear)",
        "canales_entrada": 2, "longitud_secuencia": 3,
        "clases": CLASES, "mejor_epoca": mejor_epoca,
        "mejor_perdida_validacion": mejor_perdida,
        "metricas_prueba": met_cnn,
        "version_pytorch": torch.__version__,
    }, MODELO_PTH)
    joblib.dump(rf, RUTA_CNN / "random_forest_secuencias.joblib")
    pd.DataFrame(historial).to_csv(HISTORIAL_CSV, index=False)

    fig, ax = plt.subplots(figsize=(5, 4))
    ax.imshow(matriz, cmap="Blues")
    ax.set_xticks(range(3), CLASES); ax.set_yticks(range(3), CLASES)
    ax.set_xlabel("Predicho"); ax.set_ylabel("Real")
    for i in range(3):
        for j in range(3):
            ax.text(j, i, matriz[i, j], ha="center", va="center")
    fig.tight_layout(); fig.savefig(MATRIZ_PNG, dpi=150); plt.close(fig)

    METRICAS_JSON.write_text(json.dumps({
        "problema": "tendencia de la estadía a partir de sus bitácoras",
        "clases": CLASES,
        "mejor_epoca": mejor_epoca,
        "mejor_perdida_validacion": mejor_perdida,
        "cnn": met_cnn,
        "random_forest": met_rf,
        "ganador": ganador,
        "matriz_confusion": matriz.tolist(),
        "parametros_entrenables": n_params,
        "epocas_entrenadas": len(historial),
        "advertencia": "La etiqueta de tendencia se deriva de las mismas "
                       "horas usadas como entrada y la mayoría de las "
                       "secuencias son sintéticas: es un ejercicio "
                       "metodológico, no una prueba de rendimiento real.",
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nModelo -> {MODELO_PTH}\nMétricas -> {METRICAS_JSON}")


if __name__ == "__main__":
    main()
