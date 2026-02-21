import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { User } from '../models/index.js'
import { AppError } from '../middleware/errorHandler.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body)

    const user = await User.findOne({ email, isActive: true })

    if (!user) {
      throw new AppError(401, 'Invalid email or password')
    }

    const isValidPassword = await user.comparePassword(password)

    if (!isValidPassword) {
      throw new AppError(401, 'Invalid email or password')
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '7d' }
    )

    res.json({
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    })
  } catch (error) {
    next(error)
  }
})

// Logout
router.post('/logout', authenticate, (_req, res) => {
  res.json({ message: 'Logged out successfully' })
})

// Get current user
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.userId).select('-password')

    if (!user) {
      throw new AppError(404, 'User not found')
    }

    res.json({
      data: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    next(error)
  }
})

export { router as authRouter }
