# Imagen de Spark para los procesos por lotes de ML.
# La imagen oficial apache/spark trae Java + PySpark pero sin intérprete
# Python; este Dockerfile solo agrega python3 y apunta PYTHONPATH al
# PySpark que ya viene dentro de la imagen.
FROM apache/spark:3.5.3-scala2.12-java11-ubuntu

USER root

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONPATH=/opt/spark/python:/opt/spark/python/lib/py4j-0.10.9.7-src.zip

WORKDIR /app
