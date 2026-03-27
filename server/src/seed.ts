import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { Transaction, Alert, User } from './models/index.js'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fraud-detection'

// Demo user
const demoUser = {
  email: 'admin@fraudshield.com',
  password: 'admin123',
  name: 'Admin User',
  role: 'admin',
}

// Generate random transactions
function generateTransactions(count: number) {
  const transactions = []
  const statuses = ['approved', 'blocked', 'review', 'pending']
  const riskLevels = ['low', 'medium', 'high']
  const paymentMethods = ['credit_card', 'debit_card', 'paypal', 'crypto', 'bank_transfer']
  const fraudSignalTypes = [
    'velocity_exceeded',
    'address_mismatch',
    'vpn_detected',
    'new_device',
    'unusual_amount',
    'high_risk_country',
    'card_testing',
    'proxy_detected',
    'device_fingerprint_mismatch',
    'email_domain_risky',
  ]

  const cities = [
    { city: 'New York', state: 'NY', country: 'US', zipCode: '10001' },
    { city: 'Los Angeles', state: 'CA', country: 'US', zipCode: '90001' },
    { city: 'Chicago', state: 'IL', country: 'US', zipCode: '60601' },
    { city: 'Houston', state: 'TX', country: 'US', zipCode: '77001' },
    { city: 'Phoenix', state: 'AZ', country: 'US', zipCode: '85001' },
    { city: 'London', state: '', country: 'UK', zipCode: 'SW1A 1AA' },
    { city: 'Toronto', state: 'ON', country: 'CA', zipCode: 'M5V 1J1' },
    { city: 'Sydney', state: 'NSW', country: 'AU', zipCode: '2000' },
  ]

  const names = [
    'John Smith', 'Jane Doe', 'Michael Johnson', 'Emily Brown', 'David Wilson',
    'Sarah Davis', 'James Miller', 'Jennifer Garcia', 'Robert Martinez', 'Lisa Anderson',
    'William Taylor', 'Elizabeth Thomas', 'Richard Jackson', 'Patricia White', 'Charles Harris',
  ]

  for (let i = 0; i < count; i++) {
    const riskScore = Math.floor(Math.random() * 100)
    const riskLevel = riskScore < 30 ? 'low' : riskScore < 70 ? 'medium' : 'high'

    let status: string
    if (riskScore >= 80) {
      status = Math.random() > 0.3 ? 'blocked' : 'review'
    } else if (riskScore >= 50) {
      status = Math.random() > 0.5 ? 'review' : 'approved'
    } else {
      status = Math.random() > 0.95 ? 'pending' : 'approved'
    }

    const billingCity = cities[Math.floor(Math.random() * cities.length)]
    const shippingCity = riskScore > 60 && Math.random() > 0.5
      ? cities[Math.floor(Math.random() * cities.length)]
      : billingCity

    const name = names[Math.floor(Math.random() * names.length)]
    const email = name.toLowerCase().replace(' ', '.') + '@example.com'

    const fraudSignals = []
    if (riskScore > 30) {
      const numSignals = Math.min(Math.floor(riskScore / 20), 5)
      const shuffled = [...fraudSignalTypes].sort(() => 0.5 - Math.random())
      for (let j = 0; j < numSignals; j++) {
        fraudSignals.push({
          type: shuffled[j],
          description: `${shuffled[j].replace(/_/g, ' ')} detected`,
          score: Math.floor(Math.random() * 40) + 10,
          severity: Math.random() > 0.5 ? 'high' : 'medium',
        })
      }
    }

    const daysAgo = Math.floor(Math.random() * 30)
    const hoursAgo = Math.floor(Math.random() * 24)
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000)

    transactions.push({
      transactionId: `TXN-${Date.now()}-${i.toString().padStart(4, '0')}`,
      amount: Math.round((Math.random() * 5000 + 10) * 100) / 100,
      currency: 'USD',
      customerId: `cust_${Math.random().toString(36).substr(2, 9)}`,
      customerEmail: email,
      customerName: name,
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      cardLast4: Math.floor(1000 + Math.random() * 9000).toString(),
      billingAddress: {
        street: `${Math.floor(Math.random() * 9999)} Main St`,
        ...billingCity,
      },
      shippingAddress: {
        street: `${Math.floor(Math.random() * 9999)} Oak Ave`,
        ...shippingCity,
      },
      deviceFingerprint: `fp_${Math.random().toString(36).substr(2, 12)}`,
      ipAddress: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      riskScore,
      riskLevel,
      status,
      fraudSignals,
      velocity: {
        ordersLast24h: Math.floor(Math.random() * (riskScore > 70 ? 10 : 3)),
        ordersLast1h: Math.floor(Math.random() * (riskScore > 70 ? 5 : 2)),
        uniqueCardsLast24h: Math.floor(Math.random() * (riskScore > 70 ? 4 : 2)),
        failedAttemptsLast1h: Math.floor(Math.random() * (riskScore > 80 ? 5 : 1)),
        amountLast24h: Math.round(Math.random() * 10000 * 100) / 100,
      },
      createdAt,
      processedAt: new Date(createdAt.getTime() + Math.floor(Math.random() * 100)),
    })
  }

  return transactions
}

// Generate alerts based on transactions
function generateAlerts(transactions: ReturnType<typeof generateTransactions>) {
  const alerts = []
  const alertTypes = ['velocity', 'location', 'pattern', 'amount', 'device', 'identity']

  const highRiskTransactions = transactions.filter(t => t.riskScore >= 70)

  for (const txn of highRiskTransactions.slice(0, 50)) {
    const type = alertTypes[Math.floor(Math.random() * alertTypes.length)]
    const severity = txn.riskScore >= 85 ? 'critical' : txn.riskScore >= 75 ? 'high' : 'medium'

    const descriptions: Record<string, string> = {
      velocity: `${txn.velocity.ordersLast1h} orders from same customer in 1 hour`,
      location: 'Transaction from high-risk geographic location',
      pattern: 'Unusual spending pattern detected',
      amount: `Transaction amount $${txn.amount.toFixed(2)} significantly higher than average`,
      device: 'New device fingerprint detected for existing customer',
      identity: 'Billing and shipping address mismatch',
    }

    alerts.push({
      type,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} alert triggered`,
      description: descriptions[type],
      severity,
      transactionId: txn.transactionId,
      riskScore: txn.riskScore,
      acknowledged: Math.random() > 0.7,
      acknowledgedAt: Math.random() > 0.7 ? new Date() : undefined,
      createdAt: txn.createdAt,
    })
  }

  return alerts
}

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')

    // Clear existing data
    await Promise.all([
      Transaction.deleteMany({}),
      Alert.deleteMany({}),
      User.deleteMany({}),
    ])
    console.log('Cleared existing data')

    // Create demo user
    const hashedPassword = await bcrypt.hash(demoUser.password, 10)
    await User.create({
      ...demoUser,
      password: hashedPassword,
    })
    console.log('Created demo user:', demoUser.email)

    // Generate and insert transactions
    const transactions = generateTransactions(500)
    await Transaction.insertMany(transactions)
    console.log(`Created ${transactions.length} transactions`)

    // Generate and insert alerts
    const alerts = generateAlerts(transactions)
    await Alert.insertMany(alerts)
    console.log(`Created ${alerts.length} alerts`)

    // Summary stats
    const stats = {
      totalTransactions: transactions.length,
      approved: transactions.filter(t => t.status === 'approved').length,
      blocked: transactions.filter(t => t.status === 'blocked').length,
      review: transactions.filter(t => t.status === 'review').length,
      lowRisk: transactions.filter(t => t.riskLevel === 'low').length,
      mediumRisk: transactions.filter(t => t.riskLevel === 'medium').length,
      highRisk: transactions.filter(t => t.riskLevel === 'high').length,
      totalAlerts: alerts.length,
    }

    console.log('\nSeed Summary:')
    console.log('=============')
    console.log(`Transactions: ${stats.totalTransactions}`)
    console.log(`  - Approved: ${stats.approved}`)
    console.log(`  - Blocked: ${stats.blocked}`)
    console.log(`  - Review: ${stats.review}`)
    console.log(`Risk Distribution:`)
    console.log(`  - Low: ${stats.lowRisk}`)
    console.log(`  - Medium: ${stats.mediumRisk}`)
    console.log(`  - High: ${stats.highRisk}`)
    console.log(`Alerts: ${stats.totalAlerts}`)
    console.log('\nDemo credentials:')
    console.log(`  Email: ${demoUser.email}`)
    console.log(`  Password: ${demoUser.password}`)

    await mongoose.disconnect()
    console.log('\nSeed completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }
}

seed()
