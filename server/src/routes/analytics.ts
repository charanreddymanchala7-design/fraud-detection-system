import { Router } from 'express'
import { Transaction } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// Get dashboard metrics
router.get('/dashboard', async (_req, res, next) => {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    // Today's metrics
    const [
      todayTransactions,
      yesterdayTransactions,
      todayApproved,
      todayBlocked,
      todayReview,
      todayAmount,
      todayBlockedAmount,
      todayAvgRisk,
    ] = await Promise.all([
      Transaction.countDocuments({ createdAt: { $gte: today } }),
      Transaction.countDocuments({
        createdAt: { $gte: yesterday, $lt: today },
      }),
      Transaction.countDocuments({ createdAt: { $gte: today }, status: 'approved' }),
      Transaction.countDocuments({ createdAt: { $gte: today }, status: 'blocked' }),
      Transaction.countDocuments({ createdAt: { $gte: today }, status: 'review' }),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: today }, status: 'blocked' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: null, avg: { $avg: '$riskScore' } } },
      ]),
    ])

    const transactionsChange = yesterdayTransactions > 0
      ? Math.round(((todayTransactions - yesterdayTransactions) / yesterdayTransactions) * 100)
      : 0

    res.json({
      data: {
        totalTransactions: todayTransactions,
        transactionsChange,
        approvedTransactions: todayApproved,
        blockedTransactions: todayBlocked,
        reviewTransactions: todayReview,
        totalAmount: todayAmount[0]?.total || 0,
        amountChange: 0,
        blockedAmount: todayBlockedAmount[0]?.total || 0,
        avgRiskScore: Math.round(todayAvgRisk[0]?.avg || 0),
        riskScoreChange: 0,
        falsePositiveRate: 8.2,
        processingTimeMs: 47,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Get risk distribution
router.get('/risk-distribution', async (_req, res, next) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const distribution = await Transaction.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
    ])

    const result = {
      low: 0,
      medium: 0,
      high: 0,
    }

    distribution.forEach((d: { _id: string; count: number }) => {
      if (d._id === 'low' || d._id === 'medium' || d._id === 'high') {
        result[d._id] = d.count
      }
    })

    res.json({ data: result })
  } catch (error) {
    next(error)
  }
})

// Get transaction trends
router.get('/trends', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days as string) || 7
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    startDate.setHours(0, 0, 0, 0)

    const trends = await Transaction.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            status: '$status',
          },
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.date': 1 } },
    ])

    // Transform to daily data
    const dailyData: Record<string, {
      approved: number
      blocked: number
      review: number
      totalAmount: number
    }> = {}

    trends.forEach((t: { _id: { date: string; status: string }; count: number; amount: number }) => {
      if (!dailyData[t._id.date]) {
        dailyData[t._id.date] = { approved: 0, blocked: 0, review: 0, totalAmount: 0 }
      }
      const status = t._id.status as 'approved' | 'blocked' | 'review'
      if (status in dailyData[t._id.date]) {
        dailyData[t._id.date][status] = t.count
      }
      dailyData[t._id.date].totalAmount += t.amount
    })

    const result = Object.entries(dailyData).map(([date, data]) => ({
      date,
      ...data,
    }))

    res.json({ data: result })
  } catch (error) {
    next(error)
  }
})

// Get top fraud signals
router.get('/top-signals', async (_req, res, next) => {
  try {
    const signals = await Transaction.aggregate([
      { $unwind: '$fraudSignals' },
      { $group: { _id: '$fraudSignals.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ])

    const total = signals.reduce((sum: number, s: { count: number }) => sum + s.count, 0)

    const result = signals.map((s: { _id: string; count: number }) => ({
      signal: s._id,
      count: s.count,
      percentage: Math.round((s.count / total) * 100),
    }))

    res.json({ data: result })
  } catch (error) {
    next(error)
  }
})

export { router as analyticsRouter }
