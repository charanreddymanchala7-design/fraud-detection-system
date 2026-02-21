from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum


class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    CRYPTO = "crypto"
    BANK_TRANSFER = "bank_transfer"


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Address(BaseModel):
    street: str
    city: str
    state: str
    country: str
    zipCode: str = Field(alias="zipCode")

    class Config:
        populate_by_name = True


class VelocityData(BaseModel):
    ordersLast24h: int = Field(default=0, alias="ordersLast24h")
    ordersLast1h: int = Field(default=0, alias="ordersLast1h")
    uniqueCardsLast24h: int = Field(default=0, alias="uniqueCardsLast24h")
    failedAttemptsLast1h: int = Field(default=0, alias="failedAttemptsLast1h")
    amountLast24h: float = Field(default=0.0, alias="amountLast24h")

    class Config:
        populate_by_name = True


class FraudSignal(BaseModel):
    type: str
    description: str
    score: int
    severity: str


class TransactionRequest(BaseModel):
    transactionId: str = Field(alias="transactionId")
    amount: float
    currency: str = "USD"
    customerId: str = Field(alias="customerId")
    customerEmail: str = Field(alias="customerEmail")
    paymentMethod: PaymentMethod = Field(alias="paymentMethod")
    cardLast4: Optional[str] = Field(default=None, alias="cardLast4")
    billingAddress: Address = Field(alias="billingAddress")
    shippingAddress: Address = Field(alias="shippingAddress")
    deviceFingerprint: str = Field(alias="deviceFingerprint")
    ipAddress: str = Field(alias="ipAddress")
    userAgent: str = Field(alias="userAgent")
    velocity: VelocityData
    isNewCustomer: bool = Field(default=False, alias="isNewCustomer")
    accountAgeDays: int = Field(default=0, alias="accountAgeDays")

    class Config:
        populate_by_name = True


class FraudAnalysisResponse(BaseModel):
    transactionId: str = Field(alias="transactionId")
    riskScore: int = Field(alias="riskScore")
    riskLevel: RiskLevel = Field(alias="riskLevel")
    fraudSignals: List[FraudSignal] = Field(alias="fraudSignals")
    recommendation: str
    confidence: float
    processingTimeMs: int = Field(alias="processingTimeMs")

    class Config:
        populate_by_name = True


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str
