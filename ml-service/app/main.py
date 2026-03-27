from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time

from .models import TransactionRequest, FraudAnalysisResponse, HealthResponse
from .fraud_detector import fraud_detector


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize models on startup"""
    print("Fraud Detection ML Service starting...")
    print(f"Model loaded: {fraud_detector.model_loaded}")
    yield
    print("Fraud Detection ML Service shutting down...")


app = FastAPI(
    title="Fraud Detection ML Service",
    description="Real-time fraud detection using XGBoost and Isolation Forest",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=fraud_detector.model_loaded,
        version="1.0.0"
    )


@app.post("/analyze", response_model=FraudAnalysisResponse)
async def analyze_transaction(transaction: TransactionRequest):
    """
    Analyze a transaction for fraud signals.

    Returns risk score (0-100), risk level, and detected fraud signals.
    """
    try:
        result = fraud_detector.predict(transaction)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/batch-analyze")
async def batch_analyze(transactions: list[TransactionRequest]):
    """
    Analyze multiple transactions in batch.

    Returns list of fraud analysis results.
    """
    try:
        results = []
        for txn in transactions:
            result = fraud_detector.predict(txn)
            results.append(result)
        return {"results": results, "count": len(results)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch analysis failed: {str(e)}")


@app.get("/model/info")
async def model_info():
    """Get model information and feature importance"""
    return {
        "model_loaded": fraud_detector.model_loaded,
        "model_type": "XGBoost + Isolation Forest Ensemble",
        "feature_importance": fraud_detector.get_feature_importance(),
        "description": "Combines gradient boosting classification with anomaly detection"
    }


@app.get("/model/thresholds")
async def get_thresholds():
    """Get current risk score thresholds"""
    return {
        "low": {"min": 0, "max": 39, "action": "approve"},
        "medium": {"min": 40, "max": 69, "action": "review"},
        "high": {"min": 70, "max": 100, "action": "block"}
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
