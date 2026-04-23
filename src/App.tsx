import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ToastContainer } from './components/ui/Toast'
import { AdminLayout } from './components/layout/AdminLayout'
import { lazy, Suspense } from 'react'
import { LoadingSpinner } from './components/ui/LoadingSpinner'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

// Auth
const LoginPage = lazy(() => import('./pages/LoginPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

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
const TagManagementPage = lazy(() => import('./pages/posters/TagManagementPage'))
const FestivalPosterPage = lazy(() => import('./pages/posters/FestivalPosterPage'))
const FramePosterPage = lazy(() => import('./pages/posters/FramePosterPage'))
const BusinessPosterPage = lazy(() => import('./pages/posters/BusinessPosterPage'))
const BusinessCategoryPage = lazy(() => import('./pages/posters/BusinessCategoryPage'))

// Category Management
const GeneralCategoryPage = lazy(() => import('./pages/categories/GeneralCategoryPage'))
const RecycleBinPage = lazy(() => import('./pages/categories/RecycleBinPage'))
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
const FestivalCalendarPage = lazy(() => import('./pages/festivals/FestivalCalendarPage'))
const LanguagesPage = lazy(() => import('./pages/admin/LanguagesPage'))

// Subscriptions
const SubscriptionListPage = lazy(() => import('./pages/subscriptions/SubscriptionListPage'))
const PlanListPage = lazy(() => import('./pages/subscriptions/PlanListPage'))

// UPGRADE — new admin surfaces grouped under the UPGRADE sidebar section.
// Each lands as a stub / "Coming soon" placeholder until its real page is
// built out in a follow-up session. The stubs avoid 404 on sidebar clicks
// and document planned capabilities so the team can prioritise what to
// build first.
const RevenueDashboardPage = lazy(() => import('./pages/upgrade/RevenueDashboardPage'))
const PromoCodesPage = lazy(() => import('./pages/upgrade/PromoCodesPage'))
const FreeTrialConfigPage = lazy(() => import('./pages/upgrade/FreeTrialConfigPage'))
const PricingPageEditorPage = lazy(() => import('./pages/upgrade/PricingPageEditorPage'))
const PaywallEditorPage = lazy(() => import('./pages/upgrade/PaywallEditorPage'))
const RazorpayLogPage = lazy(() => import('./pages/upgrade/RazorpayLogPage'))
const RefundManagerPage = lazy(() => import('./pages/upgrade/RefundManagerPage'))
const FeatureMatrixPage = lazy(() => import('./pages/upgrade/FeatureMatrixPage'))

// Greetings
const GreetingCategoryListPage = lazy(() => import('./pages/greetings/GreetingCategoryListPage'))
const GreetingTemplateListPage = lazy(() => import('./pages/greetings/GreetingTemplateListPage'))
const GreetingConfigPage = lazy(() => import('./pages/greetings/GreetingConfigPage'))
const CustomerListPage = lazy(() => import('./pages/greetings/CustomerListPage'))

// Stickers
const StickerPackListPage = lazy(() => import('./pages/stickers/StickerPackListPage'))
const StickerDetailPage = lazy(() => import('./pages/stickers/StickerDetailPage'))
const StickerBannerPage = lazy(() => import('./pages/stickers/StickerBannerPage'))
const EditorStickerPage = lazy(() => import('./pages/stickers/EditorStickerPage'))

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
const AdCategoryListPage = lazy(() => import('./pages/product-ads/AdCategoryListPage'))
const AdConfigPage = lazy(() => import('./pages/product-ads/AdConfigPage'))
const SlideshowConfigPage = lazy(() => import('./pages/slideshow/SlideshowConfigPage'))
const MallConfigPage = lazy(() => import('./pages/brand-mall/MallConfigPage'))
const SpotlightPage = lazy(() => import('./pages/brand-mall/SpotlightPage'))
const ProductListPage = lazy(() => import('./pages/product-ads/ProductListPage'))

// Content
const TutorialListPage = lazy(() => import('./pages/content/TutorialListPage'))
const ContactInboxPage = lazy(() => import('./pages/content/ContactInboxPage'))
const PartnerInboxPage = lazy(() => import('./pages/content/PartnerInboxPage'))
const PolicyListPage = lazy(() => import('./pages/content/PolicyListPage'))
const MallListingModerationPage = lazy(() => import('./pages/content/MallListingModerationPage'))

// AI Tools
const AIToolsDashboardPage = lazy(() => import('./pages/ai-tools/AIToolsDashboardPage'))
const AIToolsConfigPage = lazy(() => import('./pages/ai-tools/AIToolsConfigPage'))
const BgRemovalCreditsPage = lazy(() => import('./pages/ai-tools/BgRemovalCreditsPage'))
const FaqPage = lazy(() => import('./pages/ai-tools/FaqPage'))
const TestimonialsPage = lazy(() => import('./pages/ai-tools/TestimonialsPage'))
const CreditTransactionsPage = lazy(() => import('./pages/ai-tools/CreditTransactionsPage'))
const AIToolListPage = lazy(() => import('./pages/ai-tools/AIToolListPage'))

// Poster Home Sections
const PosterHomeSectionsPage = lazy(() => import('./pages/posters/PosterHomeSectionsPage'))

// Home Banners
const HomeBannerPage = lazy(() => import('./pages/posters/HomeBannerPage'))
const CategoryBannerPage = lazy(() => import('./pages/posters/CategoryBannerPage'))

// Promo Announcements
const PromoAnnouncementPage = lazy(() => import('./pages/posters/PromoAnnouncementPage'))

// Home Cards & Sections
const HomeCardPage = lazy(() => import('./pages/posters/HomeCardPage'))
const HomeCardSectionPage = lazy(() => import('./pages/posters/HomeCardSectionPage'))

// Create Tools
const CreateToolPage = lazy(() => import('./pages/posters/CreateToolPage'))
const CanvasPresetPage = lazy(() => import('./pages/posters/CanvasPresetPage'))
const CreateScreenBannerPage = lazy(() => import('./pages/posters/CreateScreenBannerPage'))

// Video Categories & Templates
const VideoCategoryPage = lazy(() => import('./pages/posters/VideoCategoryPage'))
const VideoTemplatePage = lazy(() => import('./pages/posters/VideoTemplatePage'))

// VbizCard
const VbizCardCategoryPage = lazy(() => import('./pages/vbizcard/VbizCardCategoryPage'))
const VbizCardTemplatePage = lazy(() => import('./pages/vbizcard/VbizCardTemplatePage'))
const VbizCardHomeSectionPage = lazy(() => import('./pages/vbizcard/VbizCardHomeSectionPage'))
const VbizCardPromoBannerPage = lazy(() => import('./pages/vbizcard/VbizCardPromoBannerPage'))
const VbizCardTestimonialPage = lazy(() => import('./pages/vbizcard/VbizCardTestimonialPage'))

// Free Status
const StatusCategoryListPage = lazy(() => import('./pages/statuses/StatusCategoryListPage'))
const StatusQuoteListPage = lazy(() => import('./pages/statuses/StatusQuoteListPage'))

// Feeds
const FeedItemListPage = lazy(() => import('./pages/feeds/FeedItemListPage'))
const FeedBannerListPage = lazy(() => import('./pages/feeds/FeedBannerListPage'))
const FeedConfigPage = lazy(() => import('./pages/feeds/FeedConfigPage'))

// Settings
const TaglinesPage = lazy(() => import('./pages/settings/TaglinesPage'))
const PaymentPlansPage = lazy(() => import('./pages/settings/PaymentPlansPage'))
const WatermarkPage = lazy(() => import('./pages/settings/WatermarkPage'))
const DesignSettingsPage = lazy(() => import('./pages/settings/DesignSettingsPage'))
const PoliciesPage = lazy(() => import('./pages/settings/PoliciesPage'))
const DeleteRequestsPage = lazy(() => import('./pages/settings/DeleteRequestsPage'))

// Card Wizard
const WizardConfigsPage = lazy(() => import('./pages/card-wizard/WizardConfigsPage'))
const WizardFeaturesPage = lazy(() => import('./pages/card-wizard/WizardFeaturesPage'))
const WizardFormFieldsPage = lazy(() => import('./pages/card-wizard/WizardFormFieldsPage'))
const WizardSocialChannelsPage = lazy(() => import('./pages/card-wizard/WizardSocialChannelsPage'))
const WizardPaymentGatewaysPage = lazy(() => import('./pages/card-wizard/WizardPaymentGatewaysPage'))
const UserCardDataPage = lazy(() => import('./pages/card-wizard/UserCardDataPage'))

// Logo Maker
const LogoConfigsPage = lazy(() => import('./pages/logo-maker/LogoConfigsPage'))
const LogoIndustriesPage = lazy(() => import('./pages/logo-maker/LogoIndustriesPage'))
const LogoStylesPage = lazy(() => import('./pages/logo-maker/LogoStylesPage'))
const LogoColorsPage = lazy(() => import('./pages/logo-maker/LogoColorsPage'))
const UserLogosPage = lazy(() => import('./pages/logo-maker/UserLogosPage'))

// Collage
const CollageConfigPage = lazy(() => import('./pages/collage/CollageConfigPage'))
const CollageLayoutsPage = lazy(() => import('./pages/collage/CollageLayoutsPage'))
const CollageAspectRatiosPage = lazy(() => import('./pages/collage/CollageAspectRatiosPage'))
const CollageEditorTabsPage = lazy(() => import('./pages/collage/CollageEditorTabsPage'))

// Business
const BusinessIndustriesPage = lazy(() => import('./pages/business/BusinessIndustriesPage'))
const BusinessCategoryChoicesPage = lazy(() => import('./pages/business/BusinessCategoryChoicesPage'))
const SocialPlatformsPage = lazy(() => import('./pages/business/SocialPlatformsPage'))
const BusinessSetupConfigPage = lazy(() => import('./pages/business/BusinessSetupConfigPage'))

// Misc
const ContactConfigPage = lazy(() => import('./pages/misc/ContactConfigPage'))
const LanguageOptionsPage = lazy(() => import('./pages/misc/LanguageOptionsPage'))
const FormatCategoriesPage = lazy(() => import('./pages/misc/FormatCategoriesPage'))
const ExploreFeaturesPage = lazy(() => import('./pages/misc/ExploreFeaturesPage'))
const UiStringsPage = lazy(() => import('./pages/misc/UiStringsPage'))
const EditorStickerCategoriesPage = lazy(() => import('./pages/misc/EditorStickerCategoriesPage'))
const MallCategoriesPage = lazy(() => import('./pages/misc/MallCategoriesPage'))

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
                <Route path="/posters/tags" element={<TagManagementPage />} />
                <Route path="/posters/festival" element={<FestivalPosterPage />} />
                <Route path="/posters/frames" element={<FramePosterPage />} />
                <Route path="/posters/business" element={<BusinessPosterPage />} />
                <Route path="/posters/business-category" element={<BusinessCategoryPage />} />
                <Route path="/posters/home-sections" element={<PosterHomeSectionsPage />} />
                <Route path="/posters/home-banners" element={<HomeBannerPage />} />
                <Route path="/posters/category-banners" element={<CategoryBannerPage />} />
                <Route path="/posters/promo-announcements" element={<PromoAnnouncementPage />} />
                <Route path="/posters/home-cards" element={<HomeCardPage />} />
                <Route path="/posters/home-card-sections" element={<HomeCardSectionPage />} />
                <Route path="/posters/create-tools" element={<CreateToolPage />} />
                <Route path="/posters/canvas-presets" element={<CanvasPresetPage />} />
                <Route path="/posters/create-banners" element={<CreateScreenBannerPage />} />
                <Route path="/posters/video-categories" element={<VideoCategoryPage />} />
                <Route path="/posters/video-templates" element={<VideoTemplatePage />} />

                {/* Category Management */}
                <Route path="/categories/general" element={<GeneralCategoryPage />} />
                <Route path="/categories/recycle-bin" element={<RecycleBinPage />} />
                <Route path="/categories/politician" element={<PoliticianCategoryPage />} />
                <Route path="/categories/politician-image" element={<PoliticianImagePage />} />

                {/* Festivals */}
                <Route path="/festivals" element={<FestivalListPage />} />
                <Route path="/festival-calendar" element={<FestivalCalendarPage />} />
                <Route path="/languages" element={<LanguagesPage />} />

                {/* Subscriptions */}
                <Route path="/subscriptions" element={<SubscriptionListPage />} />
                <Route path="/subscriptions/plans" element={<PlanListPage />} />

                {/* UPGRADE — 8 stub routes corresponding to sidebar items.
                   Real page implementations replace these one at a time. */}
                <Route path="/upgrade/revenue" element={<RevenueDashboardPage />} />
                <Route path="/upgrade/promo-codes" element={<PromoCodesPage />} />
                <Route path="/upgrade/free-trial" element={<FreeTrialConfigPage />} />
                <Route path="/upgrade/pricing-page" element={<PricingPageEditorPage />} />
                <Route path="/upgrade/paywall" element={<PaywallEditorPage />} />
                <Route path="/upgrade/razorpay-log" element={<RazorpayLogPage />} />
                <Route path="/upgrade/refunds" element={<RefundManagerPage />} />
                <Route path="/upgrade/feature-matrix" element={<FeatureMatrixPage />} />

                {/* Greetings */}
                <Route path="/greetings/categories" element={<GreetingCategoryListPage />} />
                <Route path="/greetings/templates" element={<GreetingTemplateListPage />} />
                <Route path="/greetings/config" element={<GreetingConfigPage />} />
                <Route path="/greetings/customers" element={<CustomerListPage />} />

                {/* Stickers */}
                <Route path="/stickers" element={<StickerPackListPage />} />
                <Route path="/stickers/:packId/stickers" element={<StickerDetailPage />} />
                <Route path="/sticker-banners" element={<StickerBannerPage />} />
                <Route path="/editor-stickers" element={<EditorStickerPage />} />

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
                <Route path="/product-ads/categories" element={<AdCategoryListPage />} />
                <Route path="/product-ads/config" element={<AdConfigPage />} />
                <Route path="/product-ads/products" element={<ProductListPage />} />

                {/* Slideshow (Image to Video) */}
                <Route path="/slideshow/config" element={<SlideshowConfigPage />} />

                {/* Brand Mall */}
                <Route path="/brand-mall/config" element={<MallConfigPage />} />
                <Route path="/brand-mall/spotlight" element={<SpotlightPage />} />

                {/* Content */}
                <Route path="/content/tutorials" element={<TutorialListPage />} />
                <Route path="/content/contact" element={<ContactInboxPage />} />
                <Route path="/content/partners" element={<PartnerInboxPage />} />
                <Route path="/content/policies" element={<PolicyListPage />} />
                <Route path="/content/mall" element={<MallListingModerationPage />} />

                {/* AI Tools */}
                <Route path="/ai-tools" element={<AIToolsDashboardPage />} />
                <Route path="/ai-tools/config" element={<AIToolsConfigPage />} />
                <Route path="/ai-tools/bg-credits" element={<BgRemovalCreditsPage />} />
                <Route path="/ai-tools/faqs" element={<FaqPage />} />
                <Route path="/ai-tools/testimonials" element={<TestimonialsPage />} />
                <Route path="/ai-tools/credit-transactions" element={<CreditTransactionsPage />} />
                <Route path="/ai-tools/manage" element={<AIToolListPage />} />

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
                <Route path="/vbizcard/promo-banners" element={<VbizCardPromoBannerPage />} />
                <Route path="/vbizcard/testimonials" element={<VbizCardTestimonialPage />} />

                {/* Free Status */}
                <Route path="/statuses/categories" element={<StatusCategoryListPage />} />
                <Route path="/statuses/quotes" element={<StatusQuoteListPage />} />

                {/* Feeds */}
                <Route path="/feeds/items" element={<FeedItemListPage />} />
                <Route path="/feeds/banners" element={<FeedBannerListPage />} />
                <Route path="/feeds/config" element={<FeedConfigPage />} />

                {/* Settings */}
                <Route path="/settings/taglines" element={<TaglinesPage />} />
                <Route path="/settings/payment-plans" element={<PaymentPlansPage />} />
                <Route path="/settings/watermark" element={<WatermarkPage />} />
                <Route path="/settings/design" element={<DesignSettingsPage />} />
                <Route path="/settings/policies" element={<PoliciesPage />} />
                <Route path="/settings/delete-requests" element={<DeleteRequestsPage />} />

                {/* Card Wizard */}
                <Route path="/card-wizard/configs" element={<WizardConfigsPage />} />
                <Route path="/card-wizard/features" element={<WizardFeaturesPage />} />
                <Route path="/card-wizard/form-fields" element={<WizardFormFieldsPage />} />
                <Route path="/card-wizard/social-channels" element={<WizardSocialChannelsPage />} />
                <Route path="/card-wizard/payment-gateways" element={<WizardPaymentGatewaysPage />} />
                <Route path="/card-wizard/user-data" element={<UserCardDataPage />} />

                {/* Logo Maker */}
                <Route path="/logo-maker/configs" element={<LogoConfigsPage />} />
                <Route path="/logo-maker/industries" element={<LogoIndustriesPage />} />
                <Route path="/logo-maker/styles" element={<LogoStylesPage />} />
                <Route path="/logo-maker/colors" element={<LogoColorsPage />} />
                <Route path="/logo-maker/user-logos" element={<UserLogosPage />} />

                {/* Collage */}
                <Route path="/collage/config" element={<CollageConfigPage />} />
                <Route path="/collage/layouts" element={<CollageLayoutsPage />} />
                <Route path="/collage/aspect-ratios" element={<CollageAspectRatiosPage />} />
                <Route path="/collage/editor-tabs" element={<CollageEditorTabsPage />} />

                {/* Business */}
                <Route path="/business/industries" element={<BusinessIndustriesPage />} />
                <Route path="/business/categories" element={<BusinessCategoryChoicesPage />} />
                <Route path="/business/social-platforms" element={<SocialPlatformsPage />} />
                <Route path="/business/setup-config" element={<BusinessSetupConfigPage />} />

                {/* Misc */}
                <Route path="/misc/contact-config" element={<ContactConfigPage />} />
                <Route path="/misc/languages" element={<LanguageOptionsPage />} />
                <Route path="/misc/format-categories" element={<FormatCategoriesPage />} />
                <Route path="/misc/explore-features" element={<ExploreFeaturesPage />} />
                <Route path="/misc/ui-strings" element={<UiStringsPage />} />
                <Route path="/misc/editor-sticker-categories" element={<EditorStickerCategoriesPage />} />
                <Route path="/misc/mall-categories" element={<MallCategoriesPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </SuspenseWrapper>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
