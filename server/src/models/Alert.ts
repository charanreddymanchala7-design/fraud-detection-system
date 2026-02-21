import mongoose, { Schema, Document } from 'mongoose'

export interface IAlert extends Document {
  type: 'velocity' | 'amount' | 'location' | 'device' | 'pattern'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
  transactionId?: string
  acknowledged: boolean
  acknowledgedBy?: string
  acknowledgedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const AlertSchema = new Schema<IAlert>(
  {
    type: {
      type: String,
      enum: ['velocity', 'amount', 'location', 'device', 'pattern'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    severity: { type: String, enum: ['low', 'medium', 'high'], required: true },
    transactionId: { type: String, index: true },
    acknowledged: { type: Boolean, default: false },
    acknowledgedBy: { type: String },
    acknowledgedAt: { type: Date },
  },
  { timestamps: true }
)

AlertSchema.index({ acknowledged: 1, createdAt: -1 })
AlertSchema.index({ severity: 1, createdAt: -1 })

export const Alert = mongoose.model<IAlert>('Alert', AlertSchema)
