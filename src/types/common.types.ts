export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ApiError {
  detail?: string
  message?: string
  [key: string]: unknown
}

export interface SelectOption {
  value: string
  label: string
}

export interface DashboardStats {
  totalUsers: number
  activeSubscriptions: number
  expiredSubscriptions: number
  revenueThisMonth: number
  creditsConsumedToday: number
  aiToolCallsToday: number
  activeReelsProcessing: number
  businessProfiles: number
  totalPosters: number
  userGrowth: { date: string; count: number }[]
  revenueByPlan: { plan: string; revenue: number }[]
  aiToolUsage: { tool: string; count: number }[]
  subscriptionDistribution: { status: string; count: number }[]
}
