import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ToastContainer } from './components/ui/Toast'
import { AdminLayout } from './components/layout/AdminLayout'
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const UserListPage = lazy(() => import('./pages/users/UserListPage'))
const PlanListPage = lazy(() => import('./pages/subscriptions/PlanListPage'))
const SubscriptionListPage = lazy(() => import('./pages/subscriptions/SubscriptionListPage'))
const PosterCategoryListPage = lazy(() => import('./pages/posters/PosterCategoryListPage'))
const PosterListPage = lazy(() => import('./pages/posters/PosterListPage'))
const AutoPosterMonitorPage = lazy(() => import('./pages/posters/AutoPosterMonitorPage'))
const FestivalListPage = lazy(() => import('./pages/festivals/FestivalListPage'))
const AIToolsDashboardPage = lazy(() => import('./pages/ai-tools/AIToolsDashboardPage'))
const ReelMonitorPage = lazy(() => import('./pages/reels/ReelMonitorPage'))
const MusicTrackListPage = lazy(() => import('./pages/reels/MusicTrackListPage'))
const SendNotificationPage = lazy(() => import('./pages/notifications/SendNotificationPage'))
const NotificationHistoryPage = lazy(() => import('./pages/notifications/NotificationHistoryPage'))
const ServiceCategoryListPage = lazy(() => import('./pages/services/ServiceCategoryListPage'))
const ServiceListPage = lazy(() => import('./pages/services/ServiceListPage'))
const GreetingCategoryListPage = lazy(() => import('./pages/greetings/GreetingCategoryListPage'))
const GreetingTemplateListPage = lazy(() => import('./pages/greetings/GreetingTemplateListPage'))
const StickerPackListPage = lazy(() => import('./pages/stickers/StickerPackListPage'))
const AdTemplateListPage = lazy(() => import('./pages/product-ads/AdTemplateListPage'))
const GeneratedAdMonitorPage = lazy(() => import('./pages/product-ads/GeneratedAdMonitorPage'))
const TutorialListPage = lazy(() => import('./pages/content/TutorialListPage'))
const PolicyListPage = lazy(() => import('./pages/content/PolicyListPage'))
const ContactInboxPage = lazy(() => import('./pages/content/ContactInboxPage'))
const PartnerInboxPage = lazy(() => import('./pages/content/PartnerInboxPage'))
const MallListingModerationPage = lazy(() => import('./pages/content/MallListingModerationPage'))

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner className="py-20" />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <ToastContainer />
          <SuspenseWrapper>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AdminLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/users" element={<UserListPage />} />
                <Route path="/subscriptions/plans" element={<PlanListPage />} />
                <Route path="/subscriptions" element={<SubscriptionListPage />} />
                <Route path="/posters/categories" element={<PosterCategoryListPage />} />
                <Route path="/posters" element={<PosterListPage />} />
                <Route path="/posters/auto-generated" element={<AutoPosterMonitorPage />} />
                <Route path="/festivals" element={<FestivalListPage />} />
                <Route path="/ai-tools" element={<AIToolsDashboardPage />} />
                <Route path="/reels" element={<ReelMonitorPage />} />
                <Route path="/reels/music" element={<MusicTrackListPage />} />
                <Route path="/notifications/send" element={<SendNotificationPage />} />
                <Route path="/notifications/history" element={<NotificationHistoryPage />} />
                <Route path="/services/categories" element={<ServiceCategoryListPage />} />
                <Route path="/services" element={<ServiceListPage />} />
                <Route path="/greetings/categories" element={<GreetingCategoryListPage />} />
                <Route path="/greetings/templates" element={<GreetingTemplateListPage />} />
                <Route path="/stickers" element={<StickerPackListPage />} />
                <Route path="/product-ads/templates" element={<AdTemplateListPage />} />
                <Route path="/product-ads" element={<GeneratedAdMonitorPage />} />
                <Route path="/content/tutorials" element={<TutorialListPage />} />
                <Route path="/content/policies" element={<PolicyListPage />} />
                <Route path="/content/contact" element={<ContactInboxPage />} />
                <Route path="/content/partners" element={<PartnerInboxPage />} />
                <Route path="/content/mall" element={<MallListingModerationPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SuspenseWrapper>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
