import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, CreditCard, XCircle, Briefcase, Image,
  PartyPopper, LayoutList, Send,
  TrendingUp, FolderOpen, Trash2,
} from 'lucide-react'
import { KPICard } from '../components/ui/KPICard'
import { dashboardApi } from '../services/admin-api'
import { mockDashboardStats } from '../services/mock-data'
import { formatNumber } from '../utils/formatters'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

const COLORS = ['#4CAF50', '#F44336', '#FFC107', '#2196F3']

const quickActions = [
  { label: 'Add Festival Poster', path: '/posters/festival', icon: PartyPopper, color: 'bg-brand-gold' },
  { label: 'Poster Categories', path: '/categories/general', icon: FolderOpen, color: 'bg-blue-500' },
  { label: 'VC Home Sections', path: '/vbizcard/home-sections', icon: LayoutList, color: 'bg-purple-500' },
  { label: 'Send Notification', path: '/notifications/send', icon: Send, color: 'bg-green-500' },
  { label: 'View Users', path: '/users', icon: Users, color: 'bg-orange-500' },
  { label: 'Delete Requests', path: '/settings/delete-requests', icon: Trash2, color: 'bg-red-500' },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(mockDashboardStats)

  useEffect(() => {
    dashboardApi.stats().then(setStats).catch(() => {})
  }, [])

  // Compute growth from userGrowth data
  const growthPercent = useMemo(() => {
    const growth = stats.userGrowth
    if (!Array.isArray(growth) || growth.length < 2) return null
    const latest = growth[growth.length - 1]?.count ?? 0
    const previous = growth[growth.length - 2]?.count ?? 0
    if (previous === 0) return null
    return ((latest - previous) / previous * 100).toFixed(1)
  }, [stats.userGrowth])

  return (
    <div className="space-y-6">

      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">
            Welcome back, Admin!
          </h1>
          <p className="text-brand-text-muted mt-1">
            Here's what's happening with Brandnio today.
          </p>
        </div>
        {growthPercent !== null && (
          <div className="bg-brand-dark-card rounded-xl border-2 border-brand-gold/40 px-6 py-4 flex items-center gap-3">
            <div className="bg-brand-gold/10 p-2 rounded-lg">
              <TrendingUp className="h-5 w-5 text-brand-gold" />
            </div>
            <div>
              <p className="text-brand-gold text-lg font-bold">
                {Number(growthPercent) >= 0 ? '+' : ''}{growthPercent}% Growth
              </p>
              <p className="text-brand-text-muted text-xs">vs previous period</p>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard title="Total Users" value={formatNumber(stats.totalUsers)} icon={Users} trend={{ value: 8.5, isUp: true }} />
        <KPICard title="Active Plans" value={formatNumber(stats.activeSubscriptions)} icon={CreditCard} trend={{ value: 12.3, isUp: true }} />
        <KPICard title="Expired Plans" value={formatNumber(stats.expiredSubscriptions ?? 0)} icon={XCircle} trend={{ value: 5.2, isUp: false }} />
        <KPICard title="Business Profiles" value={formatNumber(stats.businessProfiles ?? 0)} icon={Briefcase} trend={{ value: 15.8, isUp: true }} />
        <KPICard title="Total Posters" value={formatNumber(stats.totalPosters ?? 0)} icon={Image} trend={{ value: 22.1, isUp: true }} />
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="bg-brand-dark-card border border-brand-dark-border/50 rounded-xl px-5 py-3 flex items-center gap-3 hover:scale-105 transition-transform duration-200 hover:border-brand-gold/30 cursor-pointer"
            >
              <div className={`${action.color} p-2 rounded-full`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <span className="text-brand-text text-sm font-medium whitespace-nowrap">{action.label}</span>
            </button>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth */}
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-5">
          <h3 className="text-sm font-medium text-brand-text-muted mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={stats.userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A4A4A" />
              <XAxis dataKey="date" tick={{ fill: '#9E9E9E', fontSize: 11 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: '#9E9E9E', fontSize: 11 }} />
              <Tooltip contentStyle={{ backgroundColor: '#383838', border: '1px solid #4A4A4A', borderRadius: '8px', color: '#E0E0E0' }} />
              <Line type="monotone" dataKey="count" stroke="#FFC107" strokeWidth={2} dot={{ fill: '#FFC107' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Plan */}
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-5">
          <h3 className="text-sm font-medium text-brand-text-muted mb-4">Revenue by Plan</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.revenueByPlan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4A4A4A" />
              <XAxis dataKey="plan" tick={{ fill: '#9E9E9E', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9E9E9E', fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ backgroundColor: '#383838', border: '1px solid #4A4A4A', borderRadius: '8px', color: '#E0E0E0' }} formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#FFC107" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* AI Tool Usage */}
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-5">
          <h3 className="text-sm font-medium text-brand-text-muted mb-4">AI Tool Usage</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.aiToolUsage} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#4A4A4A" />
              <XAxis type="number" tick={{ fill: '#9E9E9E', fontSize: 11 }} />
              <YAxis type="category" dataKey="tool" tick={{ fill: '#9E9E9E', fontSize: 10 }} width={110} />
              <Tooltip contentStyle={{ backgroundColor: '#383838', border: '1px solid #4A4A4A', borderRadius: '8px', color: '#E0E0E0' }} />
              <Bar dataKey="count" fill="#2196F3" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription Distribution */}
        <div className="bg-brand-dark-card rounded-xl border border-brand-dark-border/50 p-5">
          <h3 className="text-sm font-medium text-brand-text-muted mb-4">Subscription Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={stats.subscriptionDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="count" nameKey="status" label={(props: any) => `${props.status}: ${props.count}`}>
                {stats.subscriptionDistribution.map((_: any, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#383838', border: '1px solid #4A4A4A', borderRadius: '8px', color: '#E0E0E0' }} />
              <Legend wrapperStyle={{ color: '#9E9E9E', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
