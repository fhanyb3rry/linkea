"""Conexión con la API de Claude.

Todo lo que habla con la IA pasa por aquí, para que la key y el modelo vivan en un solo lugar.
Si no hay key en el .env, `ia_configurada()` devuelve False y el resto de la app sigue funcionando
sin IA (el matching por reglas no depende de esto).
"""

import anthropic

from app.core.config import settings

# Cliente único (se crea la primera vez que se necesita, no al arrancar el servidor).
_cliente: anthropic.AsyncAnthropic | None = None


def ia_configurada() -> bool:
    return bool(settings.anthropic_api_key.strip())


def obtener_cliente() -> anthropic.AsyncAnthropic:
    global _cliente
    if not ia_configurada():
        raise RuntimeError("Falta ANTHROPIC_API_KEY en backend/.env")
    if _cliente is None:
        _cliente = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key.strip())
    return _cliente


def explicar_error(error: Exception) -> str:
    """Traduce los errores de la API a un mensaje en español que diga qué hacer.

    Va de lo más específico a lo más general (por eso el orden de los `isinstance`).
    """
    if isinstance(error, anthropic.AuthenticationError):
        return "La key no es válida. Revisa ANTHROPIC_API_KEY en backend/.env (sin espacios ni comillas)."
    if isinstance(error, anthropic.PermissionDeniedError):
        return "La key no tiene permiso para usar este modelo."
    if isinstance(error, anthropic.NotFoundError):
        return f"El modelo «{settings.anthropic_model}» no existe o no está disponible para tu cuenta."
    if isinstance(error, anthropic.RateLimitError):
        return "Demasiadas peticiones seguidas. Espera un momento e inténtalo de nuevo."
    if isinstance(error, anthropic.BadRequestError):
        texto = str(error).lower()
        if "credit balance" in texto:
            return "No hay saldo en la cuenta de la API. Carga créditos en console.anthropic.com → Billing."
        return f"La API rechazó la petición: {error}"
    if isinstance(error, anthropic.APIConnectionError):
        return "No se pudo conectar con la API de Claude. Revisa tu conexión a internet."
    if isinstance(error, anthropic.APIStatusError):
        return f"La API respondió con un error ({error.status_code})."
    return f"Error inesperado al llamar a la IA: {error}"


async def probar_conexion() -> dict:
    """Hace UNA llamada mínima (cuesta una fracción de centavo) para comprobar que todo funciona."""
    cliente = obtener_cliente()
    try:
        respuesta = await cliente.messages.create(
            model=settings.anthropic_model,
            max_tokens=300,
            output_config={"effort": "low"},
            messages=[{"role": "user", "content": "Responde solo con la palabra: listo"}],
        )
    except anthropic.APIError as error:
        return {"ok": False, "modelo": settings.anthropic_model, "detalle": explicar_error(error)}

    texto = "".join(bloque.text for bloque in respuesta.content if bloque.type == "text").strip()
    return {
        "ok": True,
        "modelo": settings.anthropic_model,
        "respuesta": texto,
        "tokens_entrada": respuesta.usage.input_tokens,
        "tokens_salida": respuesta.usage.output_tokens,
    }
