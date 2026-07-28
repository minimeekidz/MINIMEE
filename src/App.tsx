import { Route, Routes } from "react-router-dom";
import { AdminDashboard, AdminModulePage } from "./pages/AdminPages";
import { AlbumsPage, BuddyCafe, ChildRoutePage, HarborMarket, HeroStudio, PixelWorld } from "./pages/ChildPages";
import { ChildProfilePage, ParentAlbums, ParentDashboard, ParentRoutePlaceholder, SubscriptionPage, ThemesPage } from "./pages/ParentPages";
import { AuthPage, FaqPage, HomePage, HowItWorksPage, LegalPage, PricingPage } from "./pages/PublicPages";

function NotFound() {
  return <main className="not-found"><span>404</span><h1>這條小路還未開放</h1><a className="button" href="/">返回 MINIMEE</a></main>;
}

export default function App() {
  const adminKinds = ["content", "assets", "ai-jobs", "qc", "support", "commerce", "privacy", "audit"];
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/how-it-works" element={<HowItWorksPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/forgot-password" element={<AuthPage />} />
      <Route path="/privacy" element={<LegalPage title="私隱政策" />} />
      <Route path="/terms" element={<LegalPage title="服務條款" />} />
      <Route path="/refund-policy" element={<LegalPage title="退款與重做政策" />} />
      <Route path="/f/:token" element={<LegalPage title="朋友邀請" />} />
      <Route path="/lost/:token" element={<LegalPage title="遺失物件通知" />} />

      <Route path="/parent/dashboard" element={<ParentDashboard />} />
      <Route path="/parent/children/:id" element={<ChildProfilePage />} />
      <Route path="/parent/children/:id/themes" element={<ThemesPage />} />
      <Route path="/parent/children/:id/subscription" element={<SubscriptionPage />} />
      <Route path="/parent/albums" element={<ParentAlbums />} />
      <Route path="/parent/media" element={<ParentRoutePlaceholder kind="media" />} />
      <Route path="/parent/children/:id/sharing" element={<ParentRoutePlaceholder kind="sharing" />} />
      <Route path="/parent/children/:id/lost-items" element={<ParentRoutePlaceholder kind="lost-items" />} />
      <Route path="/parent/privacy" element={<ParentRoutePlaceholder kind="privacy" />} />
      <Route path="/parent/notifications" element={<ParentRoutePlaceholder kind="notifications" />} />
      <Route path="/parent/support/:caseId" element={<ParentRoutePlaceholder kind="support" />} />

      <Route path="/child" element={<PixelWorld />} />
      <Route path="/child/room" element={<ChildRoutePage kind="room" />} />
      <Route path="/child/library" element={<ChildRoutePage kind="library" />} />
      <Route path="/child/theatre" element={<ChildRoutePage kind="theatre" />} />
      <Route path="/child/hero-studio" element={<HeroStudio />} />
      <Route path="/child/albums" element={<AlbumsPage />} />
      <Route path="/child/buddy" element={<BuddyCafe />} />
      <Route path="/child/harbor-market" element={<HarborMarket />} />

      <Route path="/admin" element={<AdminDashboard />} />
      {adminKinds.map(kind => <Route key={kind} path={`/admin/${kind}`} element={<AdminModulePage kind={kind} />} />)}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
