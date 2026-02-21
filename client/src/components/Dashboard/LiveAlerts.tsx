import { AlertTriangle, Bell, MapPin, Smartphone, Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime, getRiskColor } from '@/lib/utils'
import type { Alert } from '@/types'

interface LiveAlertsProps {
  alerts: Alert[]
  onAcknowledge?: (id: string) => void
}

const alertIcons = {
  velocity: Activity,
  amount: AlertTriangle,
  location: MapPin,
  device: Smartphone,
  pattern: Bell,
}

export function LiveAlerts({ alerts, onAcknowledge }: LiveAlertsProps) {
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).slice(0, 5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Live Alerts</CardTitle>
        <Badge variant="destructive">
          {unacknowledgedAlerts.length} Active
        </Badge>
      </CardHeader>
      <CardContent>
        {unacknowledgedAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No active alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unacknowledgedAlerts.map((alert) => {
              const Icon = alertIcons[alert.type] || AlertTriangle
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3',
                    alert.severity === 'high' && 'border-red-200 bg-red-50',
                    alert.severity === 'medium' && 'border-amber-200 bg-amber-50',
                    alert.severity === 'low' && 'border-green-200 bg-green-50'
                  )}
                >
                  <div
                    className={cn(
                      'p-2 rounded-full',
                      getRiskColor(alert.severity)
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{alert.title}</span>
                      <Badge
                        className={cn(getRiskColor(alert.severity), 'capitalize')}
                      >
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1 truncate">
                      {alert.description}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatRelativeTime(alert.createdAt)}
                    </p>
                  </div>
                  {onAcknowledge && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAcknowledge(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
