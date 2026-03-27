import { Router } from 'express'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'
import { Transaction, Alert } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'
import { AppError } from '../middleware/errorHandler.js'

const router = Router()

router.use(authenticate)

const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  zipCode: z.string(),
})

const analyzeTransactionSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  customerEmail: z.string().email(),
  customerName: z.string(),
  paymentMethod: z.enum(['credit_card', 'debit_card', 'paypal', 'crypto', 'bank_transfer']),
  cardLast4: z.string().optional(),
  cardBin: z.string().optional(),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  deviceFingerprint: z.string(),
  ipAddress: z.string(),
  userAgent: z.string().optional(),
})

// Get all transactions
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = {}

    if (req.query.status) {
      filter.status = { $in: (req.query.status as string).split(',') }
    }
    if (req.query.riskLevel) {
      filter.riskLevel = { $in: (req.query.riskLevel as string).split(',') }
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i')
      filter.$or = [
        { transactionId: searchRegex },
        { customerEmail: searchRegex },
        { customerName: searchRegex },
      ]
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter),
    ])

    res.json({
      data: transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    next(error)
  }
})

// Get single transaction
router.get('/:id', async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id)

    if (!transaction) {
      throw new AppError(404, 'Transaction not found')
    }

    res.json({ data: transaction })
  } catch (error) {
    next(error)
  }
})

// Analyze transaction for fraud
router.post('/analyze', async (req, res, next) => {
  try {
    const data = analyzeTransactionSchema.parse(req.body)
    const transactionId = `TXN-${new Date().getFullYear()}-${uuidv4().slice(0, 8).toUpperCase()}`

    // Get customer ID from email hash
    const customerId = Buffer.from(data.customerEmail).toString('base64').slice(0, 12)

    // Calculate velocity data
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    const [ordersLast24h, ordersLast1h, amountLast24h] = await Promise.all([
      Transaction.countDocuments({
        customerId,
        createdAt: { $gte: oneDayAgo },
      }),
      Transaction.countDocuments({
        customerId,
        createdAt: { $gte: oneHourAgo },
      }),
      Transaction.aggregate([
        { $match: { customerId, createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ])

    const velocity = {
      ordersLast24h,
      ordersLast1h,
      uniqueCardsLast24h: 1, // Simplified
      failedAttemptsLast1h: 0,
      amountLast24h: amountLast24h[0]?.total || 0,
    }

    // Call ML service for fraud prediction
    let riskScore = 0
    let fraudSignals: Array<{ type: string; description: string; score: number; severity: 'low' | 'medium' | 'high' }> = []

    try {
      const mlResponse = await axios.post(
        `${process.env.ML_SERVICE_URL || 'http://localhost:8000'}/predict`,
        {
          amount: data.amount,
          payment_method: data.paymentMethod,
          billing_country: data.billingAddress.country,
          shipping_country: data.shippingAddress.country,
          billing_state: data.billingAddress.state,
          shipping_state: data.shippingAddress.state,
          device_fingerprint: data.deviceFingerprint,
          ip_address: data.ipAddress,
          velocity_24h: velocity.ordersLast24h,
          velocity_1h: velocity.ordersLast1h,
          amount_24h: velocity.amountLast24h,
        },
        { timeout: 5000 }
      )

      riskScore = mlResponse.data.risk_score
      fraudSignals = mlResponse.data.signals || []
    } catch {
      // Fallback to rule-based scoring
      riskScore = calculateRuleBasedScore(data, velocity)
      fraudSignals = detectFraudSignals(data, velocity)
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high'
    if (riskScore < 30) {
      riskLevel = 'low'
    } else if (riskScore < 70) {
      riskLevel = 'medium'
    } else {
      riskLevel = 'high'
    }

    // Determine status
    let status: 'approved' | 'blocked' | 'review'
    if (riskScore >= 80) {
      status = 'blocked'
    } else if (riskScore >= 50) {
      status = 'review'
    } else {
      status = 'approved'
    }

    // Create transaction
    const transaction = await Transaction.create({
      transactionId,
      ...data,
      customerId,
      riskScore,
      riskLevel,
      status,
      fraudSignals,
      velocity,
      processedAt: new Date(),
    })

    // Create alerts for high-risk transactions
    if (riskLevel === 'high') {
      await createAlerts(transaction, fraudSignals)
    }

    // Emit real-time update
    const io = req.app.get('io')
    io?.emit('transaction:new', transaction)

    res.status(201).json({ data: transaction })
  } catch (error) {
    next(error)
  }
})

// Update transaction review
router.put('/:id/review', async (req, res, next) => {
  try {
    const { status, notes } = req.body

    const transaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      {
        status,
        reviewedBy: req.user?.userId,
        reviewNotes: notes,
      },
      { new: true }
    )

    if (!transaction) {
      throw new AppError(404, 'Transaction not found')
    }

    const io = req.app.get('io')
    io?.emit('transaction:updated', transaction)

    res.json({ data: transaction })
  } catch (error) {
    next(error)
  }
})

// Helper functions
function calculateRuleBasedScore(
  data: z.infer<typeof analyzeTransactionSchema>,
  velocity: { ordersLast24h: number; ordersLast1h: number; amountLast24h: number }
): number {
  let score = 0

  // High amount check
  if (data.amount > 1000) score += 15
  if (data.amount > 5000) score += 25

  // Address mismatch
  if (data.billingAddress.state !== data.shippingAddress.state) score += 20
  if (data.billingAddress.country !== data.shippingAddress.country) score += 30

  // Velocity checks
  if (velocity.ordersLast1h >= 3) score += 25
  if (velocity.ordersLast24h >= 10) score += 20
  if (velocity.amountLast24h > 5000) score += 15

  // High-risk payment methods
  if (data.paymentMethod === 'crypto') score += 15

  return Math.min(score, 100)
}

function detectFraudSignals(
  data: z.infer<typeof analyzeTransactionSchema>,
  velocity: { ordersLast24h: number; ordersLast1h: number; amountLast24h: number }
): Array<{ type: string; description: string; score: number; severity: 'low' | 'medium' | 'high' }> {
  const signals: Array<{ type: string; description: string; score: number; severity: 'low' | 'medium' | 'high' }> = []

  if (data.billingAddress.state !== data.shippingAddress.state) {
    signals.push({
      type: 'address_mismatch',
      description: 'Billing and shipping address in different states',
      score: 20,
      severity: 'medium',
    })
  }

  if (velocity.ordersLast1h >= 3) {
    signals.push({
      type: 'high_velocity',
      description: `${velocity.ordersLast1h} orders in the last hour`,
      score: 25,
      severity: 'high',
    })
  }

  if (data.amount > 2000) {
    signals.push({
      type: 'high_amount',
      description: `Transaction amount $${data.amount} is unusually high`,
      score: 15,
      severity: 'medium',
    })
  }

  return signals
}

async function createAlerts(
  transaction: InstanceType<typeof Transaction>,
  signals: Array<{ type: string; description: string; score: number; severity: 'low' | 'medium' | 'high' }>
) {
  const alerts = signals.map((signal) => ({
    type: signal.type.includes('velocity') ? 'velocity' as const :
          signal.type.includes('amount') ? 'amount' as const :
          signal.type.includes('address') ? 'location' as const :
          'pattern' as const,
    title: `${signal.type.replace('_', ' ').toUpperCase()}`,
    description: signal.description,
    severity: signal.severity,
    transactionId: transaction.transactionId,
  }))

  await Alert.insertMany(alerts)
}

export { router as transactionsRouter }
