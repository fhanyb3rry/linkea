from fastapi import APIRouter

from app.ai.client import ia_configurada, probar_conexion
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/status")
async def status():
    """¿Hay key configurada? No gasta nada ni llama a la API."""
    return {"configurada": ia_configurada(), "modelo": settings.anthropic_model}


@router.post("/test")
async def test():
    """Prueba real de conexión con la API de Claude (una llamada mínima, gasta una fracción de centavo)."""
    if not ia_configurada():
        return {
            "ok": False,
            "modelo": settings.anthropic_model,
            "detalle": "Falta ANTHROPIC_API_KEY en backend/.env (y reiniciar el backend).",
        }
    return await probar_conexion()
