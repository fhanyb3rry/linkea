from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import close_mongo_connection, connect_to_mongo
from app.routers import (
    agent,
    ai,
    applications,
    auth,
    catalogo,
    companies,
    coordinacion,
    eligibility,
    organizations,
    search,
    seguimientos,
    students,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(title="Linkea API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(students.router)
app.include_router(organizations.router)
app.include_router(companies.router)
app.include_router(eligibility.router)
app.include_router(agent.router)
app.include_router(applications.router)
app.include_router(search.router)
app.include_router(ai.router)
app.include_router(seguimientos.router)
app.include_router(catalogo.router)
app.include_router(coordinacion.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
