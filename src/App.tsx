import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { I18nProvider } from "@/i18n";
import { AuthProvider } from "@/auth/AuthProvider";
import { RequireAuth } from "@/auth/RequireAuth";
import { ContactProvider } from "@/components/Contact";
import { Layout } from "@/components/Layout";
import { PageSkeleton } from "@/components/ui";
import Landing from "@/pages/Landing";
import HumanCoaching from "@/pages/HumanCoaching";
import { LegalPage, NotFound } from "@/pages/Legal";

const Login = lazy(() => import("@/pages/auth/Login"));
const Signup = lazy(() => import("@/pages/auth/Signup"));
const ForgotPassword = lazy(() => import("@/pages/auth/Password").then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("@/pages/auth/Password").then((m) => ({ default: m.ResetPassword })));
const Onboarding = lazy(() => import("@/pages/app/Onboarding"));
const Dashboard = lazy(() => import("@/pages/app/Dashboard"));
const Profile = lazy(() => import("@/pages/app/Profile"));
const Coaching = lazy(() => import("@/pages/app/Coaching"));
const Explore = lazy(() => import("@/pages/app/Explore"));
const MapPage = lazy(() => import("@/pages/app/Map"));
const ActionPlan = lazy(() => import("@/pages/app/ActionPlan"));
const Journal = lazy(() => import("@/pages/app/Journal"));
const Settings = lazy(() => import("@/pages/app/Settings"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const P = (el: JSX.Element) => <RequireAuth>{el}</RequireAuth>;

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ContactProvider>
            <ScrollToTop />
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<Landing />} />
                  <Route path="/human-coaching" element={<HumanCoaching />} />
                  <Route path="/book-session" element={<Navigate to="/human-coaching" replace />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                  <Route path="/privacy" element={<LegalPage kind="privacy" />} />
                  <Route path="/terms" element={<LegalPage kind="terms" />} />

                  <Route path="/onboarding" element={P(<Onboarding />)} />
                  <Route path="/dashboard" element={P(<Dashboard />)} />
                  <Route path="/profile" element={P(<Profile />)} />
                  <Route path="/coaching" element={P(<Coaching />)} />
                  <Route path="/explore/:area" element={P(<Explore />)} />
                  <Route path="/map" element={P(<MapPage />)} />
                  <Route path="/action-plan" element={P(<ActionPlan />)} />
                  <Route path="/journal" element={P(<Journal />)} />
                  <Route path="/settings" element={P(<Settings />)} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </ContactProvider>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
  );
}
