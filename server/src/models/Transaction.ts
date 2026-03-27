import mongoose, { Schema, Document } from 'mongoose'

export interface IAddress {
  street: string
  city: string
  state: string
  country: string
  zipCode: string
}

export interface IFraudSignal {
  type: string
  description: string
  score: number
  severity: 'low' | 'medium' | 'high'
}

export interface IVelocityData {
  ordersLast24h: number
  ordersLast1h: number
  uniqueCardsLast24h: number
  failedAttemptsLast1h: number
  amountLast24h: number
}

export interface ITransaction extends Document {
  transactionId: string
  amount: number
  currency: string
  customerId: string
  customerEmail: string
  customerName: string
  paymentMethod: 'credit_card' | 'debit_card' | 'paypal' | 'crypto' | 'bank_transfer'
  cardLast4?: string
  cardBin?: string
  billingAddress: IAddress
  shippingAddress: IAddress
  deviceFingerprint: string
  ipAddress: string
  userAgent: string
  riskScore: number
  riskLevel: 'low' | 'medium' | 'high'
  status: 'pending' | 'approved' | 'blocked' | 'review'
  fraudSignals: IFraudSignal[]
  velocity: IVelocityData
  mlModelVersion: string
  processedAt: Date
  reviewedBy?: string
  reviewNotes?: string
  createdAt: Date
  updatedAt: Date
}

const AddressSchema = new Schema<IAddress>({
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  country: { type: String, required: true },
  zipCode: { type: String, required: true },
})

const FraudSignalSchema = new Schema<IFraudSignal>({
  type: { type: String, required: true },
  description: { type: String, required: true },
  score: { type: Number, required: true },
  severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
})

const VelocitySchema = new Schema<IVelocityData>({
  ordersLast24h: { type: Number, default: 0 },
  ordersLast1h: { type: Number, default: 0 },
  uniqueCardsLast24h: { type: Number, default: 0 },
  failedAttemptsLast1h: { type: Number, default: 0 },
  amountLast24h: { type: Number, default: 0 },
})

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    customerId: { type: String, required: true, index: true },
    customerEmail: { type: String, required: true },
    customerName: { type: String, required: true },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'crypto', 'bank_transfer'],
      required: true,
    },
    cardLast4: { type: String },
    cardBin: { type: String },
    billingAddress: { type: AddressSchema, required: true },
    shippingAddress: { type: AddressSchema, required: true },
    deviceFingerprint: { type: String, required: true, index: true },
    ipAddress: { type: String, required: true, index: true },
    userAgent: { type: String },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'blocked', 'review'],
      default: 'pending',
      index: true,
    },
    fraudSignals: [FraudSignalSchema],
    velocity: { type: VelocitySchema, required: true },
    mlModelVersion: { type: String, default: 'v1.0.0' },
    processedAt: { type: Date, default: Date.now },
    reviewedBy: { type: String },
    reviewNotes: { type: String },
  },
  { timestamps: true }
)

// Indexes for analytics
TransactionSchema.index({ createdAt: -1 })
TransactionSchema.index({ status: 1, createdAt: -1 })
TransactionSchema.index({ riskLevel: 1, createdAt: -1 })

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema)
