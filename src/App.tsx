import { Route, Routes, useLocation } from "react-router-dom";
import { organizationSchema, useRouteSeo, useStructuredData } from "./lib/seo";
import { AdminDashboard, AdminModulePage } from "./pages/AdminPages";
import { AlbumsPage, BuddyCafe, ChildRoutePage, HarborMarket, HeroStudio, PixelWorld } from "./pages/ChildPages";
import { ChildProfilePage, FriendsSharingPage, ParentAlbums, ParentDashboard, ThemesPage } from "./pages/ParentPages";
import { AuthPage } from "./pages/AuthPages";
import { FaqPage, HomePage, HowItWorksPage, LegalPage, PricingPage } from "./pages/PublicPages";
import { MediaWorkflowPage, ParentGatePage, ParentSetupPage } from "./pages/SetupPages";
import { LostItemsPage, NotificationsPage, PrivacyCenterPage, PublicLostItemPage, SupportCasePage } from "./pages/ParentServicePages";
import { CheckoutPage, SubscriptionStatesPage } from "./pages/CommercePages";
import { KidCardPage } from "./pages/KidCardPage";
import { PixelWorldPage } from "./pages/PixelWorldPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

function NotFound() {
  return <main className="not-found"><span>404</span><h1>這條小路還未開放</h1><a className="button" href="/">返回 MINIMEE</a></main>;
}

export default function App() {
  const adminKinds = ["content", "assets", "ai-jobs", "qc", "support", "commerce", "privacy", "audit"];
  const { pathname } = useLocation();
  // Keeps canonical/noindex correct per route (ops doc section 11); the
  // Organization block is site-wide so it stays mounted for every route.
  useRouteSeo(pathname);
  useStructuredData("minimee-organization", organizationSchema);
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/faq" element={<FaqPage />} />
      {/* v2: the shareable child card and its playable demo — both public,
          so a grandparent or a finder can open them without an account. */}
      <Route path="/kid/:slug" element={<KidCardPage />} />
      <Route path="/play" element={<PixelWorldPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/forgot-password" element={<AuthPage />} />
      <Route path="/reset-password" element={<AuthPage />} />
      <Route path="/privacy" element={<LegalPage title="私隱政策" />} />
      <Route path="/terms" element={<LegalPage title="服務條款" />} />
      <Route path="/refund-policy" element={<LegalPage title="退款與重做政策" />} />
      <Route path="/f/:token" element={<LegalPage title="朋友邀請" />} />
      <Route path="/lost/:token" element={<PublicLostItemPage />} />

      <Route path="/parent/dashboard" element={<ProtectedRoute><ParentDashboard /></ProtectedRoute>} />
      <Route path="/parent/setup" element={<ProtectedRoute><ParentSetupPage /></ProtectedRoute>} />
      <Route path="/parent-gate" element={<ProtectedRoute><ParentGatePage /></ProtectedRoute>} />
      <Route path="/parent/children/:id" element={<ProtectedRoute><ChildProfilePage /></ProtectedRoute>} />
      <Route path="/parent/children/:id/themes" element={<ProtectedRoute><ThemesPage /></ProtectedRoute>} />
      <Route path="/parent/children/:id/subscription" element={<ProtectedRoute><SubscriptionStatesPage /></ProtectedRoute>} />
      <Route path="/parent/children/:id/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
      <Route path="/parent/albums" element={<ProtectedRoute><ParentAlbums /></ProtectedRoute>} />
      <Route path="/parent/media" element={<ProtectedRoute><MediaWorkflowPage /></ProtectedRoute>} />
      <Route path="/parent/children/:id/sharing" element={<ProtectedRoute><FriendsSharingPage /></ProtectedRoute>} />
      <Route path="/parent/children/:id/lost-items" element={<ProtectedRoute><LostItemsPage /></ProtectedRoute>} />
      <Route path="/parent/privacy" element={<ProtectedRoute><PrivacyCenterPage /></ProtectedRoute>} />
      <Route path="/parent/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/parent/support/:caseId" element={<ProtectedRoute><SupportCasePage /></ProtectedRoute>} />

      <Route path="/child" element={<ProtectedRoute><PixelWorld /></ProtectedRoute>} />
      <Route path="/child/room" element={<ProtectedRoute><ChildRoutePage kind="room" /></ProtectedRoute>} />
      <Route path="/child/library" element={<ProtectedRoute><ChildRoutePage kind="library" /></ProtectedRoute>} />
      <Route path="/child/theatre" element={<ProtectedRoute><ChildRoutePage kind="theatre" /></ProtectedRoute>} />
      <Route path="/child/hero-studio" element={<ProtectedRoute><HeroStudio /></ProtectedRoute>} />
      <Route path="/child/albums" element={<ProtectedRoute><AlbumsPage /></ProtectedRoute>} />
      <Route path="/child/buddy" element={<ProtectedRoute><BuddyCafe /></ProtectedRoute>} />
      <Route path="/child/harbor-market" element={<ProtectedRoute><HarborMarket /></ProtectedRoute>} />

      <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
      {adminKinds.map(kind => <Route key={kind} path={`/admin/${kind}`} element={<ProtectedRoute requireAdmin><AdminModulePage kind={kind} /></ProtectedRoute>} />)}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
