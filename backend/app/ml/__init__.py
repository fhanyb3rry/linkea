"""Primer modelo de IA propio de Linkea (sin depender de servicios externos).

Pipeline igual al de las prácticas de la materia:

    datos.py            -> qué variables se miden de cada par estudiante-vacante (X)
    generar_dataset.py  -> saca los pares reales de Mongo + ejemplos sintéticos -> CSV
    entrenar.py         -> limpia, divide, entrena el árbol y compara reglas vs ML
    modelo.py           -> carga el árbol ya entrenado y predice con explicación
"""
