"""Prepara las secuencias temporales de las estadías para la CNN 1D.

    python -m app.ml.cnn_datos

Equivalente Linkea de la Etapa 15/18.1 de SmartAcademy. Allá la secuencia
eran 3 parciales; aquí la estadía de cada estudiante se divide en
3 tramos temporales (inicio / medio / final) y de cada tramo se toman
dos canales:

    canal 0  horas promedio por bitácora del tramo
    canal 1  fracción de bitácoras validadas del tramo

La etiqueta es la tendencia de la estadía, calculada con el cambio de
ritmo entre el primer y el último tramo:

    Favorable   sube al menos MARGEN_TENDENCIA horas
    Descendente baja al menos MARGEN_TENDENCIA horas
    Estable     se mantiene

Lo que la práctica aporta y aquí se respeta:
    - GroupShuffleSplit por estudiante: todas las secuencias de un mismo
      estudiante caen en un solo conjunto (sin fuga de información).
    - Normalización Z por canal calculada SOLO con el entrenamiento.
    - El conjunto de prueba no participa en nada hasta la evaluación final.

Datos reales: bitácoras de la colección `seguimientos` (hoy hay pocas
estadías, así que se generan estadías sintéticas, igual que el resto del
pipeline de ML del proyecto).

Salida: app/ml/artefactos/cnn/
    linkea_datos_cnn.npz    tensores train/val/test + grupos
    metadatos_cnn.json      mapa de etiquetas, normalización, orígenes
"""

import asyncio
import json
import random
from pathlib import Path

import numpy as np
from sklearn.model_selection import GroupShuffleSplit

from app.core.database import close_mongo_connection, connect_to_mongo, get_database
from app.ml.generar_dataset import ARTEFACTOS

RUTA_CNN = ARTEFACTOS / "cnn"
RUTA_CNN.mkdir(parents=True, exist_ok=True)

ARCHIVO_NPZ = RUTA_CNN / "linkea_datos_cnn.npz"
ARCHIVO_JSON = RUTA_CNN / "metadatos_cnn.json"

SEMILLA = 42
MAPA_ETIQUETAS = {"Descendente": 0, "Estable": 1, "Favorable": 2}

# Estadías sintéticas: 2 por estudiante sintético para que la separación
# por grupo tenga efecto real (como las 5 materias por alumno del ejercicio).
ESTUDIANTES_SINTETICOS = 250
ESTADIAS_POR_ESTUDIANTE = 2
BITACORAS_MIN, BITACORAS_MAX = 12, 24

# Margen en horas promedio entre tramo final e inicial para cambiar de clase.
MARGEN_TENDENCIA = 1.2

PROPORCION_PRUEBA = 0.15
PROPORCION_VALIDACION = 0.15


def _secuencia_de_bitacoras(bitacoras: list[dict]) -> np.ndarray | None:
    """Convierte las bitácoras ordenadas en una fila [2 canales, 3 tramos].

    Divide las bitácoras en tres tramos por orden cronológico y promedia
    horas y fracción validada en cada uno. Se necesitan al menos 3
    bitácoras para que cada tramo tenga información.
    """
    if len(bitacoras) < 3:
        return None
    ordenadas = sorted(bitacoras, key=lambda b: b.get("fecha", ""))
    tramos = np.array_split(np.asarray(ordenadas, dtype=object), 3)
    x = np.zeros((2, 3), dtype=np.float32)
    for i, tramo in enumerate(tramos):
        horas = [float(b.get("horas", 0)) for b in tramo]
        x[0, i] = float(np.mean(horas))
        x[1, i] = float(np.mean(
            [1.0 if b.get("estado") == "validada" else 0.0 for b in tramo]
        ))
    return x


def _etiqueta(x: np.ndarray) -> int:
    """Tendencia por cambio de ritmo horario (regla de los parciales)."""
    diff = float(x[0, 2] - x[0, 0])
    if diff >= MARGEN_TENDENCIA:
        return MAPA_ETIQUETAS["Favorable"]
    if diff <= -MARGEN_TENDENCIA:
        return MAPA_ETIQUETAS["Descendente"]
    return MAPA_ETIQUETAS["Estable"]


async def _secuencias_reales() -> list[tuple[np.ndarray, str]]:
    """Lee los seguimientos y arma una secuencia por estadía."""
    db = get_database()
    secuencias = []
    async for seg in db.seguimientos.find({}, {"student_id": 1, "bitacoras": 1}):
        x = _secuencia_de_bitacoras(seg.get("bitacoras", []))
        if x is not None:
            secuencias.append((x, seg["student_id"]))
    return secuencias


def _estadia_sintetica(rng: random.Random, patron: int) -> np.ndarray:
    """Genera una secuencia [2,3] simulando el ritmo de una estadía.

    patron: 0 favorable, 1 estable, 2 descendente (igual que el generador
    masivo de SmartAcademy: la etiqueta luego se RECALCULA con la regla,
    no se usa el patrón directamente).
    """
    base = rng.uniform(6.0, 12.0)  # horas típicas por bitácora
    if patron == 0:
        cambio = rng.uniform(1.4, 2.6)
        medias = [base, base + cambio * 0.5, base + cambio]
        p_val = [0.65, 0.75, 0.85]
    elif patron == 2:
        cambio = rng.uniform(1.4, 2.6)
        medias = [base, base - cambio * 0.5, base - cambio]
        p_val = [0.80, 0.70, 0.55]
    else:
        medias = [base, base + rng.uniform(-0.4, 0.4), base + rng.uniform(-0.4, 0.4)]
        p_val = [0.72, 0.72, 0.72]

    n = rng.randint(BITACORAS_MIN, BITACORAS_MAX)
    x = np.zeros((2, 3), dtype=np.float32)
    por_tramo = np.array_split(np.arange(n), 3)
    for i, idx in enumerate(por_tramo):
        horas = [max(1.0, rng.gauss(medias[i], 1.0)) for _ in idx]
        x[0, i] = float(np.mean(horas))
        x[1, i] = float(np.clip(rng.gauss(p_val[i], 0.08), 0.0, 1.0))
    return x


def _sinteticas() -> list[tuple[np.ndarray, str]]:
    rng = random.Random(SEMILLA)
    secuencias = []
    for est in range(1, ESTUDIANTES_SINTETICOS + 1):
        grupo = f"SYN-EST-{est:04d}"
        for _ in range(ESTADIAS_POR_ESTUDIANTE):
            patron = rng.choices([0, 1, 2], weights=[0.40, 0.35, 0.25])[0]
            secuencias.append((_estadia_sintetica(rng, patron), grupo))
    return secuencias


def _dividir(X, y, grupos):
    """70/15/15 por estudiante: nadie comparte dos conjuntos."""
    sep1 = GroupShuffleSplit(n_splits=1, test_size=PROPORCION_PRUEBA,
                             random_state=SEMILLA)
    i_tv, i_test = next(sep1.split(X, y, groups=grupos))

    # Del 85% restante se aparta ~17.65% para quedar en 70/15/15 global.
    sep2 = GroupShuffleSplit(
        n_splits=1,
        test_size=PROPORCION_VALIDACION / (1 - PROPORCION_PRUEBA),
        random_state=SEMILLA,
    )
    i_tr_rel, i_val_rel = next(
        sep2.split(X[i_tv], y[i_tv], groups=grupos[i_tv]))
    i_tr, i_val = i_tv[i_tr_rel], i_tv[i_val_rel]

    for a, b in [(i_tr, i_val), (i_tr, i_test), (i_val, i_test)]:
        assert set(grupos[a]).isdisjoint(set(grupos[b])), \
            "Un estudiante cayó en dos conjuntos (fuga de información)"
    return i_tr, i_val, i_test


async def main() -> None:
    await connect_to_mongo()
    try:
        reales = await _secuencias_reales()
    finally:
        await close_mongo_connection()

    sinteticas = _sinteticas()
    filas = reales + sinteticas
    print(f"Secuencias reales: {len(reales)} | sintéticas: {len(sinteticas)}")

    X = np.stack([x for x, _ in filas])
    y = np.asarray([_etiqueta(x) for x, _ in filas], dtype=np.int64)
    grupos = np.asarray([g for _, g in filas])
    origen = np.asarray(
        ["real"] * len(reales) + ["sintetico"] * len(sinteticas))
    print(f"X: {X.shape} | estudiantes-grupo: {len(set(grupos))}")

    i_tr, i_val, i_test = _dividir(X, y, grupos)

    # Z-score por canal calculado SOLO con el entrenamiento.
    medias = X[i_tr].transpose(0, 2, 1).reshape(-1, 2).mean(axis=0)
    desv = X[i_tr].transpose(0, 2, 1).reshape(-1, 2).std(axis=0)
    desv = np.where(desv == 0, 1.0, desv)
    normaliza = lambda A: ((A - medias[None, :, None])
                           / desv[None, :, None]).astype(np.float32)

    np.savez_compressed(
        ARCHIVO_NPZ,
        X_train=normaliza(X[i_tr]), y_train=y[i_tr], grupos_train=grupos[i_tr],
        X_val=normaliza(X[i_val]), y_val=y[i_val], grupos_val=grupos[i_val],
        X_test=normaliza(X[i_test]), y_test=y[i_test], grupos_test=grupos[i_test],
    )
    ARCHIVO_JSON.write_text(json.dumps({
        "proyecto": "Linkea",
        "problema": "tendencia de la estadía (clasificación)",
        "forma_entrada": [2, 3],
        "canales": ["horas_promedio_por_tramo", "fraccion_validada_por_tramo"],
        "tramos": ["inicio", "medio", "final"],
        "mapa_etiquetas": MAPA_ETIQUETAS,
        "secuencias": {
            "total": int(len(X)), "reales": len(reales),
            "sinteticas": len(sinteticas),
        },
        "separacion": {
            "entrenamiento": int(len(i_tr)), "validacion": int(len(i_val)),
            "prueba": int(len(i_test)),
            "metodo": "GroupShuffleSplit por student_id (sin fuga por estudiante)",
        },
        "normalizacion": {
            "metodo": "Z-score por canal, solo con entrenamiento",
            "media": medias.tolist(), "desviacion": desv.tolist(),
        },
        "semilla": SEMILLA,
        "advertencia": "Las tendencias se derivan de la misma serie; son "
                       "un experimento metodológico, no una predicción real "
                       "de desempeño.",
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    for nombre, idx in [("train", i_tr), ("val", i_val), ("test", i_test)]:
        dist = {k: int((y[idx] == v).sum()) for k, v in MAPA_ETIQUETAS.items()}
        print(f"{nombre}: {len(idx)} secuencias | {dist}")
    print(f"\nTensores -> {ARCHIVO_NPZ}\nMetadatos -> {ARCHIVO_JSON}")


if __name__ == "__main__":
    asyncio.run(main())
