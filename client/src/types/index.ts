export type RiskLevel = 'low' | 'medium' | 'high'
export type TransactionStatus = 'pending' | 'approved' | 'blocked' | 'review'
export type PaymentMethod = 'credit_card' | 'debit_card' | 'paypal' | 'crypto' | 'bank_transfer'

export interface Transaction {
  id: string
  transactionId: string
  amount: number
  currency: string
  customerId: string
  customerEmail: string
  customerName: string
  paymentMethod: PaymentMethod
  cardLast4?: string
  billingAddress: Address
  shippingAddress: Address
  deviceFingerprint: string
  ipAddress: string
  userAgent: string
  riskScore: number
  riskLevel: RiskLevel
  status: TransactionStatus
  fraudSignals: FraudSignal[]
  velocity: VelocityData
  createdAt: string
  processedAt: string
  reviewedBy?: string
  reviewNotes?: string
}

export interface Address {
  street: string
  city: string
  state: string
  country: string
  zipCode: string
}

export interface FraudSignal {
  type: string
  description: string
  score: number
  severity: RiskLevel
}

export interface VelocityData {
  ordersLast24h: number
  ordersLast1h: number
  uniqueCardsLast24h: number
  failedAttemptsLast1h: number
  amountLast24h: number
}

export interface Alert {
  id: string
  type: 'velocity' | 'amount' | 'location' | 'device' | 'pattern'
  title: string
  description: string
  severity: RiskLevel
  transactionId?: string
  createdAt: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: string
}

export interface DashboardMetrics {
  totalTransactions: number
  transactionsChange: number
  approvedTransactions: number
  blockedTransactions: number
  reviewTransactions: number
  totalAmount: number
  amountChange: number
  blockedAmount: number
  avgRiskScore: number
  riskScoreChange: number
  falsePositiveRate: number
  processingTimeMs: number
}

export interface RiskDistribution {
  low: number
  medium: number
  high: number
}

export interface TrendData {
  date: string
  approved: number
  blocked: number
  review: number
  totalAmount: number
}

export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'analyst' | 'viewer'
}
