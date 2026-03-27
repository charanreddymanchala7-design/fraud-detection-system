import axios from 'axios'
import type {
  Transaction,
  Alert,
  DashboardMetrics,
  RiskDistribution,
  TrendData,
  User,
} from '@/types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fraud-auth-storage')
  if (token) {
    try {
      const parsed = JSON.parse(token)
      if (parsed.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`
      }
    } catch {
      // Invalid token
    }
  }
  return config
})

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const { data } = await api.post<{ data: { user: User; token: string } }>(
      '/auth/login',
      { email, password }
    )
    return data.data
  },
  logout: async () => {
    await api.post('/auth/logout')
  },
  me: async () => {
    const { data } = await api.get<{ data: User }>('/auth/me')
    return data.data
  },
}

// Transactions API
export const transactionsApi = {
  getAll: async (params?: {
    page?: number
    limit?: number
    status?: string
    riskLevel?: string
    search?: string
  }) => {
    const { data } = await api.get<{
      data: Transaction[]
      total: number
      page: number
      totalPages: number
    }>('/transactions', { params })
    return data
  },
  getById: async (id: string) => {
    const { data } = await api.get<{ data: Transaction }>(`/transactions/${id}`)
    return data.data
  },
  analyze: async (transactionData: Partial<Transaction>) => {
    const { data } = await api.post<{ data: Transaction }>(
      '/transactions/analyze',
      transactionData
    )
    return data.data
  },
  review: async (id: string, status: string, notes?: string) => {
    const { data } = await api.put<{ data: Transaction }>(
      `/transactions/${id}/review`,
      { status, notes }
    )
    return data.data
  },
}

// Analytics API
export const analyticsApi = {
  getDashboard: async () => {
    const { data } = await api.get<{ data: DashboardMetrics }>(
      '/analytics/dashboard'
    )
    return data.data
  },
  getRiskDistribution: async () => {
    const { data } = await api.get<{ data: RiskDistribution }>(
      '/analytics/risk-distribution'
    )
    return data.data
  },
  getTrends: async (days?: number) => {
    const { data } = await api.get<{ data: TrendData[] }>('/analytics/trends', {
      params: { days },
    })
    return data.data
  },
  getTopFraudSignals: async () => {
    const { data } = await api.get<{
      data: { signal: string; count: number; percentage: number }[]
    }>('/analytics/top-signals')
    return data.data
  },
}

// Alerts API
export const alertsApi = {
  getAll: async (params?: { acknowledged?: boolean }) => {
    const { data } = await api.get<{ data: Alert[] }>('/alerts', { params })
    return data.data
  },
  acknowledge: async (id: string) => {
    const { data } = await api.put<{ data: Alert }>(`/alerts/${id}/acknowledge`)
    return data.data
  },
}

export default api
