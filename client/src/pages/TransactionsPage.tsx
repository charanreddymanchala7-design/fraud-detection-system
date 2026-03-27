import { useState } from 'react'
import { Search, Filter, Download } from 'lucide-react'
import { Header } from '@/components/Layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  cn,
  formatCurrency,
  formatRelativeTime,
  getRiskColor,
  getStatusColor,
  getRiskScoreColor,
} from '@/lib/utils'
import type { Transaction, TransactionStatus, RiskLevel } from '@/types'

// Mock transactions data
const mockTransactions: Transaction[] = Array.from({ length: 20 }, (_, i) => ({
  id: `${i + 1}`,
  transactionId: `TXN-2024-${(1234 + i).toString().padStart(4, '0')}`,
  amount: Math.random() * 2000 + 50,
  currency: 'USD',
  customerId: `c${i + 1}`,
  customerEmail: `customer${i + 1}@example.com`,
  customerName: ['John Smith', 'Sarah Johnson', 'Mike Chen', 'Emily Davis', 'Alex Rivera'][i % 5],
  paymentMethod: ['credit_card', 'debit_card', 'paypal'][i % 3] as Transaction['paymentMethod'],
  cardLast4: (1000 + Math.floor(Math.random() * 9000)).toString(),
  billingAddress: { street: '123 Main St', city: 'New York', state: 'NY', country: 'US', zipCode: '10001' },
  shippingAddress: { street: '123 Main St', city: 'New York', state: 'NY', country: 'US', zipCode: '10001' },
  deviceFingerprint: `fp_${Math.random().toString(36).slice(2, 10)}`,
  ipAddress: `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
  userAgent: 'Mozilla/5.0',
  riskScore: Math.floor(Math.random() * 100),
  riskLevel: ['low', 'low', 'low', 'medium', 'high'][Math.floor(Math.random() * 5)] as RiskLevel,
  status: ['approved', 'approved', 'approved', 'blocked', 'review'][Math.floor(Math.random() * 5)] as TransactionStatus,
  fraudSignals: [],
  velocity: { ordersLast24h: Math.floor(Math.random() * 5), ordersLast1h: Math.floor(Math.random() * 3), uniqueCardsLast24h: 1, failedAttemptsLast1h: 0, amountLast24h: 0 },
  createdAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24).toISOString(),
  processedAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24).toISOString(),
}))

const statusFilters: TransactionStatus[] = ['approved', 'blocked', 'review', 'pending']
const riskFilters: RiskLevel[] = ['low', 'medium', 'high']

export function TransactionsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<TransactionStatus | null>(null)
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel | null>(null)

  const filteredTransactions = mockTransactions.filter((tx) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !tx.transactionId.toLowerCase().includes(query) &&
        !tx.customerEmail.toLowerCase().includes(query) &&
        !tx.customerName.toLowerCase().includes(query)
      ) {
        return false
      }
    }
    if (selectedStatus && tx.status !== selectedStatus) return false
    if (selectedRisk && tx.riskLevel !== selectedRisk) return false
    return true
  })

  return (
    <div className="flex flex-col">
      <Header
        title="Transactions"
        subtitle={`${filteredTransactions.length} transactions`}
      />

      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by ID, email, or name..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-500">Status:</span>
            {statusFilters.map((status) => (
              <Button
                key={status}
                variant={selectedStatus === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Risk:</span>
            {riskFilters.map((risk) => (
              <Button
                key={risk}
                variant={selectedRisk === risk ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedRisk(selectedRisk === risk ? null : risk)}
                className="capitalize"
              >
                {risk}
              </Button>
            ))}
          </div>

          <Button variant="outline" className="ml-auto">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 font-mono">
                          {tx.transactionId}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">
                          {tx.paymentMethod.replace('_', ' ')}
                          {tx.cardLast4 && ` •••• ${tx.cardLast4}`}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {tx.customerName}
                        </div>
                        <div className="text-xs text-gray-500">{tx.customerEmail}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold">
                          {formatCurrency(tx.amount, tx.currency)}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'text-sm font-semibold',
                              getRiskScoreColor(tx.riskScore)
                            )}
                          >
                            {tx.riskScore}%
                          </div>
                          <Badge className={cn(getRiskColor(tx.riskLevel), 'capitalize')}>
                            {tx.riskLevel}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Badge className={cn(getStatusColor(tx.status), 'capitalize')}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatRelativeTime(tx.createdAt)}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
