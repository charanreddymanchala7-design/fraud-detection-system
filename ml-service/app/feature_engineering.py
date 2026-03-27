import numpy as np
from typing import Dict, Any, List, Tuple
from .models import TransactionRequest, FraudSignal


# High-risk countries (simplified list)
HIGH_RISK_COUNTRIES = {'RU', 'NG', 'VN', 'ID', 'PH', 'UA', 'BY', 'KZ'}

# Suspicious email domains
SUSPICIOUS_DOMAINS = {
    'tempmail.com', 'throwaway.com', 'mailinator.com', 'guerrillamail.com',
    'temp-mail.org', 'fakeinbox.com', '10minutemail.com', 'trashmail.com'
}

# High-risk IP ranges (simplified - VPN/proxy indicators)
VPN_INDICATORS = ['185.', '194.', '195.', '176.']


def extract_features(transaction: TransactionRequest) -> np.ndarray:
    """Extract numerical features from transaction for ML model"""
    features = []

    # Amount features
    features.append(transaction.amount)
    features.append(np.log1p(transaction.amount))  # Log transform

    # Velocity features
    features.append(transaction.velocity.ordersLast24h)
    features.append(transaction.velocity.ordersLast1h)
    features.append(transaction.velocity.uniqueCardsLast24h)
    features.append(transaction.velocity.failedAttemptsLast1h)
    features.append(transaction.velocity.amountLast24h)

    # Velocity ratios
    velocity_ratio = (
        transaction.velocity.ordersLast1h / max(transaction.velocity.ordersLast24h, 1)
    )
    features.append(velocity_ratio)

    # Address match features
    address_match = 1 if (
        transaction.billingAddress.city == transaction.shippingAddress.city and
        transaction.billingAddress.state == transaction.shippingAddress.state
    ) else 0
    features.append(address_match)

    country_match = 1 if (
        transaction.billingAddress.country == transaction.shippingAddress.country
    ) else 0
    features.append(country_match)

    # High-risk country indicator
    is_high_risk_country = 1 if (
        transaction.billingAddress.country in HIGH_RISK_COUNTRIES or
        transaction.shippingAddress.country in HIGH_RISK_COUNTRIES
    ) else 0
    features.append(is_high_risk_country)

    # Email features
    email_domain = transaction.customerEmail.split('@')[-1].lower()
    is_suspicious_email = 1 if email_domain in SUSPICIOUS_DOMAINS else 0
    features.append(is_suspicious_email)

    is_free_email = 1 if email_domain in {'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'} else 0
    features.append(is_free_email)

    # IP features
    is_vpn_likely = 1 if any(transaction.ipAddress.startswith(prefix) for prefix in VPN_INDICATORS) else 0
    features.append(is_vpn_likely)

    # Customer features
    features.append(1 if transaction.isNewCustomer else 0)
    features.append(transaction.accountAgeDays)
    features.append(min(transaction.accountAgeDays / 365, 1))  # Normalized account age

    # Payment method encoding (one-hot style scores)
    payment_risk = {
        'credit_card': 0.3,
        'debit_card': 0.2,
        'paypal': 0.1,
        'bank_transfer': 0.1,
        'crypto': 0.8,
    }
    features.append(payment_risk.get(transaction.paymentMethod.value, 0.5))

    # Amount percentile (simulated - in production, use historical data)
    amount_percentile = min(transaction.amount / 5000, 1)  # Normalize to $5000 max
    features.append(amount_percentile)

    return np.array(features).reshape(1, -1)


def detect_fraud_signals(transaction: TransactionRequest) -> Tuple[List[FraudSignal], int]:
    """Detect specific fraud signals and return base rule score"""
    signals: List[FraudSignal] = []
    base_score = 0

    # Velocity checks
    if transaction.velocity.ordersLast1h >= 5:
        signals.append(FraudSignal(
            type="velocity_exceeded",
            description=f"{transaction.velocity.ordersLast1h} orders in the last hour",
            score=35,
            severity="high"
        ))
        base_score += 35
    elif transaction.velocity.ordersLast1h >= 3:
        signals.append(FraudSignal(
            type="velocity_warning",
            description=f"{transaction.velocity.ordersLast1h} orders in the last hour",
            score=15,
            severity="medium"
        ))
        base_score += 15

    # Failed attempts
    if transaction.velocity.failedAttemptsLast1h >= 3:
        signals.append(FraudSignal(
            type="card_testing",
            description=f"{transaction.velocity.failedAttemptsLast1h} failed attempts in the last hour",
            score=40,
            severity="high"
        ))
        base_score += 40
    elif transaction.velocity.failedAttemptsLast1h >= 1:
        signals.append(FraudSignal(
            type="failed_attempts",
            description=f"{transaction.velocity.failedAttemptsLast1h} failed attempt(s) recently",
            score=10,
            severity="low"
        ))
        base_score += 10

    # Address mismatch
    if transaction.billingAddress.country != transaction.shippingAddress.country:
        signals.append(FraudSignal(
            type="address_mismatch",
            description="Billing and shipping in different countries",
            score=30,
            severity="high"
        ))
        base_score += 30
    elif transaction.billingAddress.state != transaction.shippingAddress.state:
        signals.append(FraudSignal(
            type="address_mismatch",
            description="Billing and shipping in different states",
            score=15,
            severity="medium"
        ))
        base_score += 15

    # High-risk country
    if transaction.billingAddress.country in HIGH_RISK_COUNTRIES:
        signals.append(FraudSignal(
            type="high_risk_country",
            description=f"Transaction from high-risk country: {transaction.billingAddress.country}",
            score=25,
            severity="high"
        ))
        base_score += 25

    # Suspicious email
    email_domain = transaction.customerEmail.split('@')[-1].lower()
    if email_domain in SUSPICIOUS_DOMAINS:
        signals.append(FraudSignal(
            type="suspicious_email",
            description="Disposable email address detected",
            score=30,
            severity="high"
        ))
        base_score += 30

    # VPN/Proxy detection
    if any(transaction.ipAddress.startswith(prefix) for prefix in VPN_INDICATORS):
        signals.append(FraudSignal(
            type="vpn_detected",
            description="Connection appears to be from VPN or proxy",
            score=20,
            severity="medium"
        ))
        base_score += 20

    # Unusual amount
    if transaction.amount >= 2000:
        signals.append(FraudSignal(
            type="unusual_amount",
            description=f"High transaction amount: ${transaction.amount:.2f}",
            score=15,
            severity="medium"
        ))
        base_score += 15
    elif transaction.amount >= 5000:
        signals.append(FraudSignal(
            type="unusual_amount",
            description=f"Very high transaction amount: ${transaction.amount:.2f}",
            score=25,
            severity="high"
        ))
        base_score += 25

    # New customer with high amount
    if transaction.isNewCustomer and transaction.amount >= 500:
        signals.append(FraudSignal(
            type="new_customer_high_value",
            description=f"New customer with ${transaction.amount:.2f} order",
            score=20,
            severity="medium"
        ))
        base_score += 20

    # Multiple cards used
    if transaction.velocity.uniqueCardsLast24h >= 3:
        signals.append(FraudSignal(
            type="multiple_cards",
            description=f"{transaction.velocity.uniqueCardsLast24h} different cards used in 24 hours",
            score=30,
            severity="high"
        ))
        base_score += 30

    # Crypto payment (higher risk)
    if transaction.paymentMethod.value == 'crypto':
        signals.append(FraudSignal(
            type="crypto_payment",
            description="Cryptocurrency payment method",
            score=15,
            severity="medium"
        ))
        base_score += 15

    return signals, min(base_score, 100)


def get_feature_names() -> List[str]:
    """Return list of feature names for model interpretation"""
    return [
        'amount',
        'log_amount',
        'orders_24h',
        'orders_1h',
        'unique_cards_24h',
        'failed_attempts_1h',
        'amount_24h',
        'velocity_ratio',
        'address_city_match',
        'country_match',
        'high_risk_country',
        'suspicious_email',
        'free_email',
        'vpn_likely',
        'is_new_customer',
        'account_age_days',
        'account_age_normalized',
        'payment_risk_score',
        'amount_percentile',
    ]
