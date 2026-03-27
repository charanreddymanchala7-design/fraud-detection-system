import numpy as np
import joblib
from pathlib import Path
from typing import Tuple, Optional
from sklearn.ensemble import IsolationForest
from xgboost import XGBClassifier

from .models import TransactionRequest, FraudAnalysisResponse, RiskLevel, FraudSignal
from .feature_engineering import extract_features, detect_fraud_signals


class FraudDetector:
    """
    Fraud detection model combining XGBoost classifier and Isolation Forest.

    In production, models would be trained on historical fraud data.
    This implementation uses pre-configured models for demonstration.
    """

    def __init__(self):
        self.xgb_model: Optional[XGBClassifier] = None
        self.isolation_forest: Optional[IsolationForest] = None
        self.model_loaded = False
        self._initialize_models()

    def _initialize_models(self):
        """Initialize or load pre-trained models"""
        model_path = Path(__file__).parent.parent / "models"
        model_path.mkdir(exist_ok=True)

        xgb_path = model_path / "xgb_fraud_model.joblib"
        iso_path = model_path / "isolation_forest.joblib"

        # Try to load existing models
        if xgb_path.exists() and iso_path.exists():
            try:
                self.xgb_model = joblib.load(xgb_path)
                self.isolation_forest = joblib.load(iso_path)
                self.model_loaded = True
                print("Loaded pre-trained models")
                return
            except Exception as e:
                print(f"Failed to load models: {e}")

        # Create and train new models with synthetic data
        self._train_synthetic_models()

        # Save models for future use
        try:
            joblib.dump(self.xgb_model, xgb_path)
            joblib.dump(self.isolation_forest, iso_path)
            print("Saved trained models")
        except Exception as e:
            print(f"Failed to save models: {e}")

    def _train_synthetic_models(self):
        """Train models on synthetic data for demonstration"""
        print("Training models on synthetic data...")

        # Generate synthetic training data
        np.random.seed(42)
        n_samples = 10000
        n_features = 19  # Number of features from extract_features

        # Generate features
        X = np.random.randn(n_samples, n_features)

        # Make features more realistic
        X[:, 0] = np.abs(X[:, 0]) * 1000  # amount
        X[:, 1] = np.log1p(X[:, 0])  # log_amount
        X[:, 2] = np.abs(X[:, 2]).astype(int) % 10  # orders_24h
        X[:, 3] = np.abs(X[:, 3]).astype(int) % 5  # orders_1h
        X[:, 4] = np.abs(X[:, 4]).astype(int) % 4  # unique_cards_24h
        X[:, 5] = np.abs(X[:, 5]).astype(int) % 3  # failed_attempts_1h

        # Generate labels (5% fraud rate)
        # Fraud correlates with velocity, failed attempts, and amount
        fraud_score = (
            X[:, 3] * 0.3 +  # orders_1h
            X[:, 5] * 0.4 +  # failed_attempts
            (X[:, 0] > 2000).astype(float) * 0.2 +  # high amount
            np.random.randn(n_samples) * 0.1
        )
        y = (fraud_score > np.percentile(fraud_score, 95)).astype(int)

        # Train XGBoost classifier
        self.xgb_model = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            use_label_encoder=False,
            eval_metric='logloss'
        )
        self.xgb_model.fit(X, y)

        # Train Isolation Forest for anomaly detection
        self.isolation_forest = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42
        )
        self.isolation_forest.fit(X)

        self.model_loaded = True
        print("Models trained successfully")

    def predict(self, transaction: TransactionRequest) -> FraudAnalysisResponse:
        """
        Analyze a transaction and return fraud assessment.

        Combines:
        1. Rule-based fraud signals
        2. XGBoost classification probability
        3. Isolation Forest anomaly score
        """
        import time
        start_time = time.time()

        # Extract features
        features = extract_features(transaction)

        # Get rule-based signals and base score
        fraud_signals, rule_score = detect_fraud_signals(transaction)

        # Get ML predictions
        if self.model_loaded and self.xgb_model is not None:
            # XGBoost fraud probability
            xgb_proba = self.xgb_model.predict_proba(features)[0][1]

            # Isolation Forest anomaly score (-1 for anomaly, 1 for normal)
            iso_score = self.isolation_forest.decision_function(features)[0]
            # Convert to 0-1 scale (more negative = more anomalous)
            iso_normalized = max(0, min(1, 0.5 - iso_score))

            # Combine scores (weighted average)
            ml_score = int((xgb_proba * 0.6 + iso_normalized * 0.4) * 100)

            # Final score combines rule-based and ML scores
            final_score = int(rule_score * 0.4 + ml_score * 0.6)
            confidence = 0.85 + (0.1 * min(len(fraud_signals) / 5, 1))
        else:
            # Fallback to rule-based only
            final_score = rule_score
            confidence = 0.65

        # Ensure score is in valid range
        final_score = max(0, min(100, final_score))

        # Determine risk level
        if final_score >= 70:
            risk_level = RiskLevel.HIGH
            recommendation = "Block transaction - high fraud risk detected"
        elif final_score >= 40:
            risk_level = RiskLevel.MEDIUM
            recommendation = "Manual review recommended"
        else:
            risk_level = RiskLevel.LOW
            recommendation = "Approve transaction"

        # Calculate processing time
        processing_time_ms = int((time.time() - start_time) * 1000)

        return FraudAnalysisResponse(
            transactionId=transaction.transactionId,
            riskScore=final_score,
            riskLevel=risk_level,
            fraudSignals=fraud_signals,
            recommendation=recommendation,
            confidence=round(confidence, 2),
            processingTimeMs=processing_time_ms
        )

    def get_feature_importance(self) -> dict:
        """Get feature importance from XGBoost model"""
        if not self.model_loaded or self.xgb_model is None:
            return {}

        from .feature_engineering import get_feature_names

        feature_names = get_feature_names()
        importances = self.xgb_model.feature_importances_

        return dict(zip(feature_names, importances.tolist()))


# Singleton instance
fraud_detector = FraudDetector()
