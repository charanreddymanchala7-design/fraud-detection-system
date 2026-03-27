import { useState, useEffect } from 'react'
import {
  CreditCard,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  DollarSign,
  Clock,
} from 'lucide-react'
import { Header } from '@/components/Layout'
import {
  MetricCard,
  RiskDistributionChart,
  TransactionTrendsChart,
  LiveAlerts,
  RecentTransactions,
} from '@/components/Dashboard'
import { formatCurrency, formatNumber } from '@/lib/utils'
import type {
  DashboardMetrics,
  RiskDistribution,
  TrendData,
  Alert,
  Transaction,
} from '@/types'

// Mock data
const mockMetrics: DashboardMetrics = {
  totalTransactions: 1247,
  transactionsChange: 12,
  approvedTransactions: 1198,
  blockedTransactions: 23,
  reviewTransactions: 26,
  totalAmount: 342580,
  amountChange: 8,
  blockedAmount: 18420,
  avgRiskScore: 24,
  riskScoreChange: -5,
  falsePositiveRate: 8.2,
  processingTimeMs: 47,
}

const mockRiskDistribution: RiskDistribution = {
  low: 1089,
  medium: 98,
  high: 60,
}

const mockTrends: TrendData[] = [
  { date: '2024-01-15', approved: 156, blocked: 4, review: 3, totalAmount: 45230 },
  { date: '2024-01-16', approved: 189, blocked: 3, review: 5, totalAmount: 52180 },
  { date: '2024-01-17', approved: 167, blocked: 5, review: 4, totalAmount: 48920 },
  { date: '2024-01-18', approved: 178, blocked: 2, review: 6, totalAmount: 51340 },
  { date: '2024-01-19', approved: 145, blocked: 4, review: 3, totalAmount: 42890 },
  { date: '2024-01-20', approved: 134, blocked: 3, review: 2, totalAmount: 38760 },
  { date: '2024-01-21', approved: 198, blocked: 5, review: 4, totalAmount: 56420 },
]

const mockAlerts: Alert[] = [
  {
    id: '1',
    type: 'velocity',
    title: 'Suspicious velocity detected',
    description: '5 orders from same IP in 2 minutes',
    severity: 'high',
    transactionId: 'TXN-2024-1234',
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    acknowledged: false,
  },
  {
    id: '2',
    type: 'location',
    title: 'VPN/Proxy detected',
    description: 'Transaction from known VPN exit node in Russia',
    severity: 'high',
    transactionId: 'TXN-2024-1235',
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    acknowledged: false,
  },
  {
    id: '3',
    type: 'pattern',
    title: 'Card testing pattern',
    description: '8 failed small amount attempts in 10 minutes',
    severity: 'medium',
    transactionId: 'TXN-2024-1236',
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    acknowledged: false,
  },
  {
    id: '4',
    type: 'amount',
    title: 'Unusual transaction amount',
    description: '$8,500 purchase - 400% higher than customer average',
    severity: 'medium',
    transactionId: 'TXN-2024-1237',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    acknowledged: false,
  },
]

const mockTransactions: Transaction[] = [
  {
    id: '1',
    transactionId: 'TXN-2024-1234',
    amount: 299.99,
    currency: 'USD',
    customerId: 'c1',
    customerEmail: 'john@example.com',
    customerName: 'John Smith',
    paymentMethod: 'credit_card',
    cardLast4: '4242',
    billingAddress: { street: '123 Main St', city: 'New York', state: 'NY', country: 'US', zipCode: '10001' },
    shippingAddress: { street: '123 Main St', city: 'New York', state: 'NY', country: 'US', zipCode: '10001' },
    deviceFingerprint: 'fp_abc123',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    riskScore: 15,
    riskLevel: 'low',
    status: 'approved',
    fraudSignals: [],
    velocity: { ordersLast24h: 1, ordersLast1h: 1, uniqueCardsLast24h: 1, failedAttemptsLast1h: 0, amountLast24h: 299.99 },
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    processedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: '2',
    transactionId: 'TXN-2024-1235',
    amount: 1499.99,
    currency: 'USD',
    customerId: 'c2',
    customerEmail: 'suspicious@temp.com',
    customerName: 'Unknown User',
    paymentMethod: 'credit_card',
    cardLast4: '1234',
    billingAddress: { street: '456 Oak Ave', city: 'Los Angeles', state: 'CA', country: 'US', zipCode: '90001' },
    shippingAddress: { street: '789 Pine St', city: 'Chicago', state: 'IL', country: 'US', zipCode: '60601' },
    deviceFingerprint: 'fp_xyz789',
    ipAddress: '185.234.123.45',
    userAgent: 'Mozilla/5.0',
    riskScore: 87,
    riskLevel: 'high',
    status: 'blocked',
    fraudSignals: [
      { type: 'address_mismatch', description: 'Billing and shipping address in different states', score: 25, severity: 'medium' },
      { type: 'vpn_detected', description: 'Connection from known VPN provider', score: 40, severity: 'high' },
    ],
    velocity: { ordersLast24h: 5, ordersLast1h: 3, uniqueCardsLast24h: 3, failedAttemptsLast1h: 2, amountLast24h: 4500 },
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    processedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: '3',
    transactionId: 'TXN-2024-1236',
    amount: 89.99,
    currency: 'USD',
    customerId: 'c3',
    customerEmail: 'sarah@company.com',
    customerName: 'Sarah Johnson',
    paymentMethod: 'paypal',
    billingAddress: { street: '321 Elm St', city: 'Seattle', state: 'WA', country: 'US', zipCode: '98101' },
    shippingAddress: { street: '321 Elm St', city: 'Seattle', state: 'WA', country: 'US', zipCode: '98101' },
    deviceFingerprint: 'fp_def456',
    ipAddress: '98.45.67.123',
    userAgent: 'Mozilla/5.0',
    riskScore: 42,
    riskLevel: 'medium',
    status: 'review',
    fraudSignals: [
      { type: 'new_device', description: 'First transaction from this device', score: 20, severity: 'low' },
    ],
    velocity: { ordersLast24h: 2, ordersLast1h: 1, uniqueCardsLast24h: 1, failedAttemptsLast1h: 0, amountLast24h: 189.98 },
    createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    processedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
  },
]

export function DashboardPage() {
  const [metrics] = useState<DashboardMetrics>(mockMetrics)
  const [riskDistribution] = useState<RiskDistribution>(mockRiskDistribution)
  const [trends] = useState<TrendData[]>(mockTrends)
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts)
  const [transactions] = useState<Transaction[]>(mockTransactions)

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    )
  }

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // In production, this would be a WebSocket connection
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col">
      <Header
        title="Fraud Detection Dashboard"
        subtitle={`Processing ${formatNumber(metrics.totalTransactions)} transactions today`}
      />

      <div className="p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Transactions"
            value={formatNumber(metrics.totalTransactions)}
            change={metrics.transactionsChange}
            icon={CreditCard}
            iconColor="text-blue-600"
            trend="up"
          />
          <MetricCard
            title="Approved"
            value={formatNumber(metrics.approvedTransactions)}
            change={Math.round((metrics.approvedTransactions / metrics.totalTransactions) * 100)}
            changeLabel="approval rate"
            icon={ShieldCheck}
            iconColor="text-green-600"
            trend="up"
          />
          <MetricCard
            title="Blocked"
            value={formatNumber(metrics.blockedTransactions)}
            change={Math.round((metrics.blockedTransactions / metrics.totalTransactions) * 100)}
            changeLabel="block rate"
            icon={ShieldX}
            iconColor="text-red-600"
            trend="down"
          />
          <MetricCard
            title="In Review"
            value={formatNumber(metrics.reviewTransactions)}
            icon={AlertTriangle}
            iconColor="text-amber-600"
          />
        </div>

        {/* Second row of metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Amount"
            value={formatCurrency(metrics.totalAmount)}
            change={metrics.amountChange}
            icon={DollarSign}
            iconColor="text-green-600"
            trend="up"
          />
          <MetricCard
            title="Blocked Amount"
            value={formatCurrency(metrics.blockedAmount)}
            changeLabel="saved from fraud"
            icon={ShieldCheck}
            iconColor="text-red-600"
          />
          <MetricCard
            title="Avg Risk Score"
            value={`${metrics.avgRiskScore}%`}
            change={metrics.riskScoreChange}
            icon={AlertTriangle}
            iconColor="text-amber-600"
            trend="down"
          />
          <MetricCard
            title="Processing Time"
            value={`${metrics.processingTimeMs}ms`}
            changeLabel="p99 latency"
            icon={Clock}
            iconColor="text-purple-600"
          />
        </div>

        {/* Charts and Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TransactionTrendsChart data={trends} />
          </div>
          <div>
            <RiskDistributionChart data={riskDistribution} />
          </div>
        </div>

        {/* Alerts and Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LiveAlerts alerts={alerts} onAcknowledge={handleAcknowledge} />
          <RecentTransactions transactions={transactions} />
        </div>
      </div>
    </div>
  )
}
