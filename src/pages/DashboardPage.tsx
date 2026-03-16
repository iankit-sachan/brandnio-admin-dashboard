import { Users, CreditCard, IndianRupee, Zap, Bot, Film } from 'lucide-react'
import { KPICard } from '../components/ui/KPICard'
import { mockDashboardStats } from '../services/mock-data'
import { formatCurrency, formatNumber } from '../utils/formatters'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#4CAF50', '#F44336', '#FFC107', '#2196F3']

export default function DashboardPage() {
  const stats = mockDashboardStats

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-brand-text">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard title="Total Users" value={formatNumber(stats.totalUsers)} icon={Users} trend={{ value: 8.5, isUp: true }} />
        <KPICard title="Active Subs" value={formatNumber(stats.activeSubscriptions)} icon={CreditCard} trend={{ value: 12.3, isUp: true }} />
        <KPICard title="Revenue (Month)" value={formatCurrency(stats.revenueThisMonth)} icon={IndianRupee} trend={{ value: 5.2, isUp: true }} />
        <KPICard title="Credits Today" value={formatNumber(stats.creditsConsumedToday)} icon={Zap} trend={{ value: 3.1, isUp: false }} />
        <KPICard title="AI Calls Today" value={formatNumber(stats.aiToolCallsToday)} icon={Bot} trend={{ value: 15.8, isUp: true }} />
        <KPICard title="Reels Processing" value={stats.activeReelsProcessing} icon={Film} />
      </div>

      {/* Charts */}
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
                {stats.subscriptionDistribution.map((_, i) => (
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
