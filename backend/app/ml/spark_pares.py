"""Procesa el dataset de pares con Apache Spark (Etapa 13 adaptada).

    spark-submit app/ml/spark_pares.py            (dentro del contenedor Spark)
    python app/ml/spark_pares.py                  (si el host tiene Java + pyspark)

Lee app/ml/artefactos/pares.csv — el dataset que genera_dataset.py produce
desde Mongo — y le aplica el tratamiento masivo de la práctica:

    1. Esquema explícito (sin inferencia).
    2. Validaciones: cantidad, duplicados, nulos y rangos.
    3. Transformaciones: categoría de traslado (las mismas bandas del
       puntaje de ubicación) y elegibilidad recalculada para cruzar
       contra la etiqueta real (como la «tendencia recalculada»).
    4. Análisis estadístico distribuido por origen y por elegibilidad.
    5. Escritura en Parquet particionado + CSV de resumen.

No toca Mongo ni los módulos anteriores: es una etapa de ETL que deja
artefactos reutilizables cuando el dataset crezca.

Salida: app/ml/artefactos/spark/
    pares_procesados/      Parquet particionado por origen
    resumen_spark.csv      conteos y promedios por grupo
"""

import csv
from pathlib import Path

from pyspark.sql import SparkSession
from pyspark.sql.types import (
    DoubleType,
    LongType,
    StringType,
    StructField,
    StructType,
)
from pyspark.sql.functions import (
    avg,
    col,
    count,
    countDistinct,
    lit,
    when,
)

RUTA_PROYECTO = Path(__file__).resolve().parents[2]
RUTA_CSV = RUTA_PROYECTO / "app" / "ml" / "artefactos" / "pares.csv"
RUTA_PARQUET = RUTA_PROYECTO / "app" / "ml" / "artefactos" / "spark" / "pares_procesados"
RUTA_RESUMEN = RUTA_PROYECTO / "app" / "ml" / "artefactos" / "spark" / "resumen_spark.csv"
NUM_PARTICIONES = 8

ESQUEMA = StructType([
    StructField("student_id", StringType(), True),
    StructField("vacancy_id", StringType(), True),
    StructField("estudiante", StringType(), True),
    StructField("vacante", StringType(), True),
    StructField("carrera", DoubleType(), True),
    StructField("cobertura_skills", DoubleType(), True),
    StructField("razon_horas", DoubleType(), True),
    StructField("minutos", DoubleType(), True),
    StructField("elegible", LongType(), True),
    StructField("resultado_real", LongType(), True),
    StructField("origen", StringType(), True),
])


def crear_sesion() -> SparkSession:
    spark = (
        SparkSession.builder
        .appName("LINKEA_PARES_MASIVO")
        .master("local[*]")
        .config("spark.sql.shuffle.partitions", str(NUM_PARTICIONES))
        .config("spark.sql.adaptive.enabled", "true")
        .config("spark.ui.enabled", "false")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("WARN")
    return spark


def cargar(spark: SparkSession):
    if not RUTA_CSV.exists():
        raise FileNotFoundError(f"No existe {RUTA_CSV}; corre primero generar_dataset.py")
    df = (
        spark.read.format("csv")
        .option("header", "true")
        .option("encoding", "UTF-8")
        .option("mode", "FAILFAST")
        .schema(ESQUEMA)
        .load(str(RUTA_CSV))
    )
    df.printSchema()
    return df


def validar(df) -> int:
    """Las mismas comprobaciones de integridad de la práctica."""
    print("\n=== VALIDACIÓN ===")
    total = df.count()
    print(f"Registros: {total:,} | esperados en pares.csv")

    # Un solo par estudiante-vacante (los sintéticos no repiten par).
    pares_unicos = df.select("student_id", "vacancy_id").distinct().count()
    if pares_unicos != total:
        # Los sintéticos sí pueden repetir "par" vacío; contamos duplicados reales.
        duplicados = total - pares_unicos
        print(f"Pares repetidos (incluye sintéticos sin ids): {duplicados}")

    nulos = df.select(
        *[col(c).isNull() for c in [
            "carrera", "cobertura_skills", "razon_horas", "minutos", "elegible"]]
    ).filter(col("carrera").isNull() | col("cobertura_skills").isNull()
             | col("razon_horas").isNull() | col("minutos").isNull()
             | col("elegible").isNull()).count()
    print(f"Filas con features nulas: {nulos}")

    fuera_rango = df.filter(
        (col("carrera").isin(0, 1) == False)  # noqa: E712
        | (col("cobertura_skills") < 0) | (col("cobertura_skills") > 1)
        | (col("razon_horas") <= 0)
        | (col("minutos") < 0)
        | (~col("elegible").isin(0, 1))
    ).count()
    print(f"Filas fuera de rango: {fuera_rango}")

    por_origen = df.groupBy("origen").agg(count("*").alias("n")).orderBy("origen")
    por_origen.show(truncate=False)
    return total


def transformar(df):
    """Nuevas variables + elegibilidad recalculada (control de etiquetas)."""
    print("\n=== TRANSFORMACIÓN ===")
    df = df.withColumn(
        "categoria_minutos",
        when(col("minutos") <= 30, lit("cercano"))
        .when(col("minutos") <= 45, lit("medio"))
        .when(col("minutos") <= 60, lit("lejano"))
        .otherwise(lit("muy_lejano")),
    )
    # La regla del filtro 1 escrita en Spark: (carrera O skills) Y horas Y <=45 min.
    df = df.withColumn(
        "elegible_regla",
        when(
            ((col("carrera") > 0) | (col("cobertura_skills") > 0))
            & (col("razon_horas") >= 1.0) & (col("minutos") <= 45),
            lit(1),
        ).otherwise(lit(0)),
    )
    diferencias = df.filter(col("elegible") != col("elegible_regla")).count()
    print(f"Pares donde la etiqueta difiere de la regla recalculada: {diferencias}")
    return df


def analizar(df):
    print("\n=== ANÁLISIS DISTRIBUIDO ===")
    df.groupBy("elegible").agg(
        count("*").alias("total"),
        avg("cobertura_skills").alias("cobertura_prom"),
        avg("razon_horas").alias("horas_prom"),
    ).show(truncate=False)

    df.groupBy("origen", "elegible").agg(count("*").alias("n")).orderBy("origen", "elegible").show(truncate=False)

    df.groupBy("categoria_minutos").agg(count("*").alias("n")).orderBy("categoria_minutos").show(truncate=False)

    df.groupBy("origen").agg(
        count("*").alias("registros"),
        countDistinct("estudiante").alias("estudiantes"),
        avg("razon_horas").alias("horas_promedio"),
    ).show(truncate=False)


def guardar(df):
    RUTA_PARQUET.parent.mkdir(parents=True, exist_ok=True)
    resumen = df.groupBy("origen", "elegible").agg(
        count("*").alias("registros"),
        avg("cobertura_skills").alias("cobertura_prom"),
        avg("minutos").alias("minutos_prom"),
    ).orderBy("origen", "elegible").collect()
    RUTA_RESUMEN.parent.mkdir(parents=True, exist_ok=True)
    with open(RUTA_RESUMEN, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["origen", "elegible", "registros", "cobertura_prom", "minutos_prom"])
        for r in resumen:
            w.writerow([r["origen"], r["elegible"], r["registros"], r["cobertura_prom"], r["minutos_prom"]])

    df.repartition(NUM_PARTICIONES, "origen").write.mode("overwrite").partitionBy("origen").parquet(str(RUTA_PARQUET))
    print(f"\nParquet -> {RUTA_PARQUET}\nResumen -> {RUTA_RESUMEN}")


def main() -> None:
    spark = crear_sesion()
    try:
        print("Sesión Spark iniciada |", spark.version)
        df = cargar(spark)
        validar(df)
        df = transformar(df)
        analizar(df)
        guardar(df)
    finally:
        spark.stop()
        print("Sesión Spark cerrada")


if __name__ == "__main__":
    main()
