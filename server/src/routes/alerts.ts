import { Router } from 'express'
import { Alert } from '../models/index.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// Get all alerts
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20
    const skip = (page - 1) * limit

    const filter: Record<string, unknown> = {}

    if (req.query.severity) {
      filter.severity = req.query.severity
    }

    if (req.query.acknowledged !== undefined) {
      filter.acknowledged = req.query.acknowledged === 'true'
    }

    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Alert.countDocuments(filter),
    ])

    res.json({
      data: alerts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    next(error)
  }
})

// Get single alert
router.get('/:id', async (req, res, next) => {
  try {
    const alert = await Alert.findById(req.params.id).lean()

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    res.json({ data: alert })
  } catch (error) {
    next(error)
  }
})

// Acknowledge alert
router.patch('/:id/acknowledge', async (req, res, next) => {
  try {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user?.userId,
      },
      { new: true }
    ).lean()

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' })
    }

    res.json({ data: alert })
  } catch (error) {
    next(error)
  }
})

// Bulk acknowledge alerts
router.post('/acknowledge-bulk', async (req, res, next) => {
  try {
    const { ids } = req.body

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid alert IDs' })
    }

    const result = await Alert.updateMany(
      { _id: { $in: ids } },
      {
        acknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user?.userId,
      }
    )

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    next(error)
  }
})

// Get alert statistics
router.get('/stats/summary', async (_req, res, next) => {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      totalUnacknowledged,
      todayAlerts,
      weekAlerts,
      bySeverity,
      byType,
    ] = await Promise.all([
      Alert.countDocuments({ acknowledged: false }),
      Alert.countDocuments({ createdAt: { $gte: today } }),
      Alert.countDocuments({ createdAt: { $gte: thisWeek } }),
      Alert.aggregate([
        { $match: { acknowledged: false } },
        { $group: { _id: '$severity', count: { $sum: 1 } } },
      ]),
      Alert.aggregate([
        { $match: { createdAt: { $gte: thisWeek } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ])

    const severityCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }

    bySeverity.forEach((s: { _id: string; count: number }) => {
      if (s._id in severityCounts) {
        severityCounts[s._id as keyof typeof severityCounts] = s.count
      }
    })

    res.json({
      data: {
        totalUnacknowledged,
        todayAlerts,
        weekAlerts,
        bySeverity: severityCounts,
        topTypes: byType.map((t: { _id: string; count: number }) => ({
          type: t._id,
          count: t.count,
        })),
      },
    })
  } catch (error) {
    next(error)
  }
})

export { router as alertsRouter }
