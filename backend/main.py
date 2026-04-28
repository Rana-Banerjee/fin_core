from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes import graphs


app = FastAPI(title="FinCore API", description="Backend API for financial graphs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(graphs.router)


@app.get("/")
async def root():
    return {"message": "FinCore API is running", "docs": "/docs"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
