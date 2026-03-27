import { CreditCard, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  cn,
  formatCurrency,
  formatRelativeTime,
  getRiskColor,
  getStatusColor,
  getRiskScoreColor,
} from '@/lib/utils'
import type { Transaction } from '@/types'

interface RecentTransactionsProps {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
        <Link to="/transactions">
          <Button variant="ghost" size="sm">
            View All
            <ExternalLink className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.slice(0, 5).map((tx) => (
            <Link
              key={tx.id}
              to={`/transactions/${tx.id}`}
              className="flex items-center gap-4 rounded-lg border p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                <CreditCard className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {tx.customerName || tx.customerEmail}
                  </span>
                  <Badge className={cn(getStatusColor(tx.status), 'capitalize')}>
                    {tx.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500 font-mono">
                    {tx.transactionId}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatRelativeTime(tx.createdAt)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">
                  {formatCurrency(tx.amount, tx.currency)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn(getRiskColor(tx.riskLevel), 'capitalize text-xs')}>
                    {tx.riskLevel}
                  </Badge>
                  <span className={cn('text-sm font-medium', getRiskScoreColor(tx.riskScore))}>
                    {tx.riskScore}%
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
