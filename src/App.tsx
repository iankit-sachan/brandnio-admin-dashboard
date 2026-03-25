import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ToastContainer } from './components/ui/Toast'
import { AdminLayout } from './components/layout/AdminLayout'
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

// Auth
const LoginPage = lazy(() => import('./pages/LoginPage'))

// Main
const DashboardPage = lazy(() => import('./pages/DashboardPage'))

// User Management
const UserListPage = lazy(() => import('./pages/users/UserListPage'))
const ActivePlansPage = lazy(() => import('./pages/users/ActivePlansPage'))
const ExpiredPlansPage = lazy(() => import('./pages/users/ExpiredPlansPage'))
const BusinessProfilesPage = lazy(() => import('./pages/users/BusinessProfilesPage'))
const PoliticalProfilesPage = lazy(() => import('./pages/users/PoliticalProfilesPage'))

// Content Management (Posters)
const PosterListPage = lazy(() => import('./pages/posters/PosterListPage'))
const FestivalPosterPage = lazy(() => import('./pages/posters/FestivalPosterPage'))
const FramePosterPage = lazy(() => import('./pages/posters/FramePosterPage'))
const BusinessPosterPage = lazy(() => import('./pages/posters/BusinessPosterPage'))
const BusinessCategoryPage = lazy(() => import('./pages/posters/BusinessCategoryPage'))

// Category Management
const GeneralCategoryPage = lazy(() => import('./pages/categories/GeneralCategoryPage'))
const PoliticianCategoryPage = lazy(() => import('./pages/categories/PoliticianCategoryPage'))
const PoliticianImagePage = lazy(() => import('./pages/categories/PoliticianImagePage'))

// Content Types
const GreetingPostersPage = lazy(() => import('./pages/content-types/GreetingPostersPage'))
const ServicePostersPage = lazy(() => import('./pages/content-types/ServicePostersPage'))
const StickersPage = lazy(() => import('./pages/content-types/StickersPage'))
const ContentTypeServiceListPage = lazy(() => import('./pages/content-types/ServiceListPage'))
const PopupPostersPage = lazy(() => import('./pages/content-types/PopupPostersPage'))

// Communication
const CommunicationCenterPage = lazy(() => import('./pages/communication/CommunicationCenterPage'))

// Festivals
const FestivalListPage = lazy(() => import('./pages/festivals/FestivalListPage'))

// Subscriptions
const SubscriptionListPage = lazy(() => import('./pages/subscriptions/SubscriptionListPage'))
const PlanListPage = lazy(() => import('./pages/subscriptions/PlanListPage'))

// Greetings
const GreetingCategoryListPage = lazy(() => import('./pages/greetings/GreetingCategoryListPage'))
const GreetingTemplateListPage = lazy(() => import('./pages/greetings/GreetingTemplateListPage'))

// Stickers
const StickerPackListPage = lazy(() => import('./pages/stickers/StickerPackListPage'))
const StickerDetailPage = lazy(() => import('./pages/stickers/StickerDetailPage'))
const StickerBannerPage = lazy(() => import('./pages/stickers/StickerBannerPage'))

// Services
const ServiceCategoryListPage = lazy(() => import('./pages/services/ServiceCategoryListPage'))
const ServiceListPage = lazy(() => import('./pages/services/ServiceListPage'))

// Reels
const ReelMonitorPage = lazy(() => import('./pages/reels/ReelMonitorPage'))
const MusicTrackListPage = lazy(() => import('./pages/reels/MusicTrackListPage'))

// Notifications
const SendNotificationPage = lazy(() => import('./pages/notifications/SendNotificationPage'))
const NotificationHistoryPage = lazy(() => import('./pages/notifications/NotificationHistoryPage'))

// Product Ads
const AdTemplateListPage = lazy(() => import('./pages/product-ads/AdTemplateListPage'))
const GeneratedAdMonitorPage = lazy(() => import('./pages/product-ads/GeneratedAdMonitorPage'))

// Content
const TutorialListPage = lazy(() => import('./pages/content/TutorialListPage'))
const ContactInboxPage = lazy(() => import('./pages/content/ContactInboxPage'))
const PartnerInboxPage = lazy(() => import('./pages/content/PartnerInboxPage'))
const PolicyListPage = lazy(() => import('./pages/content/PolicyListPage'))
const MallListingModerationPage = lazy(() => import('./pages/content/MallListingModerationPage'))

// AI Tools
const AIToolsDashboardPage = lazy(() => import('./pages/ai-tools/AIToolsDashboardPage'))
const BgRemovalCreditsPage = lazy(() => import('./pages/ai-tools/BgRemovalCreditsPage'))
const FaqPage = lazy(() => import('./pages/ai-tools/FaqPage'))
const TestimonialsPage = lazy(() => import('./pages/ai-tools/TestimonialsPage'))

// Poster Home Sections
const PosterHomeSectionsPage = lazy(() => import('./pages/posters/PosterHomeSectionsPage'))

// Home Banners
const HomeBannerPage = lazy(() => import('./pages/posters/HomeBannerPage'))

// Create Tools
const CreateToolPage = lazy(() => import('./pages/posters/CreateToolPage'))
const CanvasPresetPage = lazy(() => import('./pages/posters/CanvasPresetPage'))

// Video Categories & Templates
const VideoCategoryPage = lazy(() => import('./pages/posters/VideoCategoryPage'))
const VideoTemplatePage = lazy(() => import('./pages/posters/VideoTemplatePage'))

// VbizCard
const VbizCardCategoryPage = lazy(() => import('./pages/vbizcard/VbizCardCategoryPage'))
const VbizCardTemplatePage = lazy(() => import('./pages/vbizcard/VbizCardTemplatePage'))
const VbizCardHomeSectionPage = lazy(() => import('./pages/vbizcard/VbizCardHomeSectionPage'))

// Settings
const TaglinesPage = lazy(() => import('./pages/settings/TaglinesPage'))
const PaymentPlansPage = lazy(() => import('./pages/settings/PaymentPlansPage'))
const WatermarkPage = lazy(() => import('./pages/settings/WatermarkPage'))
const DesignSettingsPage = lazy(() => import('./pages/settings/DesignSettingsPage'))
const PoliciesPage = lazy(() => import('./pages/settings/PoliciesPage'))
const DeleteRequestsPage = lazy(() => import('./pages/settings/DeleteRequestsPage'))

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner className="py-20" />}>{children}</Suspense>
    </ErrorBoundary>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AuthProvider>
        <ToastProvider>
          <ToastContainer />
          <SuspenseWrapper>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<AdminLayout />}>
                {/* Main */}
                <Route path="/" element={<DashboardPage />} />

                {/* User Management */}
                <Route path="/users" element={<UserListPage />} />
                <Route path="/users/active-plans" element={<ActivePlansPage />} />
                <Route path="/users/expired-plans" element={<ExpiredPlansPage />} />
                <Route path="/users/business-profiles" element={<BusinessProfilesPage />} />
                <Route path="/users/political-profiles" element={<PoliticalProfilesPage />} />

                {/* Content Management */}
                <Route path="/posters" element={<PosterListPage />} />
                <Route path="/posters/festival" element={<FestivalPosterPage />} />
                <Route path="/posters/frames" element={<FramePosterPage />} />
                <Route path="/posters/business" element={<BusinessPosterPage />} />
                <Route path="/posters/business-category" element={<BusinessCategoryPage />} />
                <Route path="/posters/home-sections" element={<PosterHomeSectionsPage />} />
                <Route path="/posters/home-banners" element={<HomeBannerPage />} />
                <Route path="/posters/create-tools" element={<CreateToolPage />} />
                <Route path="/posters/canvas-presets" element={<CanvasPresetPage />} />
                <Route path="/posters/video-categories" element={<VideoCategoryPage />} />
                <Route path="/posters/video-templates" element={<VideoTemplatePage />} />

                {/* Category Management */}
                <Route path="/categories/general" element={<GeneralCategoryPage />} />
                <Route path="/categories/politician" element={<PoliticianCategoryPage />} />
                <Route path="/categories/politician-image" element={<PoliticianImagePage />} />

                {/* Festivals */}
                <Route path="/festivals" element={<FestivalListPage />} />

                {/* Subscriptions */}
                <Route path="/subscriptions" element={<SubscriptionListPage />} />
                <Route path="/subscriptions/plans" element={<PlanListPage />} />

                {/* Greetings */}
                <Route path="/greetings/categories" element={<GreetingCategoryListPage />} />
                <Route path="/greetings/templates" element={<GreetingTemplateListPage />} />

                {/* Stickers */}
                <Route path="/stickers" element={<StickerPackListPage />} />
                <Route path="/stickers/:packId/stickers" element={<StickerDetailPage />} />
                <Route path="/sticker-banners" element={<StickerBannerPage />} />

                {/* Services */}
                <Route path="/services/categories" element={<ServiceCategoryListPage />} />
                <Route path="/services" element={<ServiceListPage />} />

                {/* Reels */}
                <Route path="/reels" element={<ReelMonitorPage />} />
                <Route path="/reels/music" element={<MusicTrackListPage />} />

                {/* Notifications */}
                <Route path="/notifications/send" element={<SendNotificationPage />} />
                <Route path="/notifications/history" element={<NotificationHistoryPage />} />

                {/* Product Ads */}
                <Route path="/product-ads/templates" element={<AdTemplateListPage />} />
                <Route path="/product-ads" element={<GeneratedAdMonitorPage />} />

                {/* Content */}
                <Route path="/content/tutorials" element={<TutorialListPage />} />
                <Route path="/content/contact" element={<ContactInboxPage />} />
                <Route path="/content/partners" element={<PartnerInboxPage />} />
                <Route path="/content/policies" element={<PolicyListPage />} />
                <Route path="/content/mall" element={<MallListingModerationPage />} />

                {/* AI Tools */}
                <Route path="/ai-tools" element={<AIToolsDashboardPage />} />
                <Route path="/ai-tools/bg-credits" element={<BgRemovalCreditsPage />} />
                <Route path="/ai-tools/faqs" element={<FaqPage />} />
                <Route path="/ai-tools/testimonials" element={<TestimonialsPage />} />

                {/* Content Types */}
                <Route path="/content-types/greetings" element={<GreetingPostersPage />} />
                <Route path="/content-types/services" element={<ServicePostersPage />} />
                <Route path="/content-types/stickers" element={<StickersPage />} />
                <Route path="/content-types/service-list" element={<ContentTypeServiceListPage />} />
                <Route path="/content-types/popups" element={<PopupPostersPage />} />

                {/* Communication */}
                <Route path="/communication" element={<CommunicationCenterPage />} />

                {/* VbizCard */}
                <Route path="/vbizcard/categories" element={<VbizCardCategoryPage />} />
                <Route path="/vbizcard/templates" element={<VbizCardTemplatePage />} />
                <Route path="/vbizcard/home-sections" element={<VbizCardHomeSectionPage />} />

                {/* Settings */}
                <Route path="/settings/taglines" element={<TaglinesPage />} />
                <Route path="/settings/payment-plans" element={<PaymentPlansPage />} />
                <Route path="/settings/watermark" element={<WatermarkPage />} />
                <Route path="/settings/design" element={<DesignSettingsPage />} />
                <Route path="/settings/policies" element={<PoliciesPage />} />
                <Route path="/settings/delete-requests" element={<DeleteRequestsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SuspenseWrapper>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
