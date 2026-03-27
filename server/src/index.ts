import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import mongoose from 'mongoose'
import { createServer } from 'http'
import { Server } from 'socket.io'
import Redis from 'ioredis'
import dotenv from 'dotenv'

import { authRouter, transactionsRouter, analyticsRouter, alertsRouter } from './routes/index.js'
import { errorHandler } from './middleware/errorHandler.js'

dotenv.config()

const app = express()
const httpServer = createServer(app)

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})

// Redis client (optional - graceful fallback if not available)
let redis: Redis | null = null
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

  redis.on('error', (err) => {
    console.warn('Redis connection error (caching disabled):', err.message)
    redis = null
  })

  redis.on('connect', () => {
    console.log('Connected to Redis')
  })
} catch (err) {
  console.warn('Redis not available, caching disabled')
}

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// Make io and redis available to routes
app.set('io', io)
app.set('redis', redis)

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.use('/api/auth', authRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/analytics', analyticsRouter)
app.use('/api/alerts', alertsRouter)

// Error handler
app.use(errorHandler)

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('subscribe:alerts', () => {
    socket.join('alerts')
    console.log(`Socket ${socket.id} subscribed to alerts`)
  })

  socket.on('subscribe:transactions', () => {
    socket.join('transactions')
    console.log(`Socket ${socket.id} subscribed to transactions`)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Export io for use in routes
export { io, redis }

// MongoDB connection and server start
const PORT = process.env.PORT || 3001
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud-detection'

async function start() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
