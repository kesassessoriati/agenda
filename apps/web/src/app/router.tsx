import { CircularProgress, Stack } from "@mui/material";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { ToastHost } from "../components/ToastHost";
import { me } from "../services/auth";
import { useAuthStore } from "../store/auth-store";

const LoginPage = lazy(() => import("../pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const InvitationAcceptPage = lazy(() =>
  import("../pages/InvitationAcceptPage").then((module) => ({ default: module.InvitationAcceptPage })),
);
const GoogleCalendarCallbackPage = lazy(() =>
  import("../pages/GoogleCalendarCallbackPage").then((module) => ({ default: module.GoogleCalendarCallbackPage })),
);
const AppointmentsPage = lazy(() => import("../pages/AppointmentsPage").then((module) => ({ default: module.AppointmentsPage })));
const SchedulesPage = lazy(() => import("../pages/SchedulesPage").then((module) => ({ default: module.SchedulesPage })));
const AdminPage = lazy(() => import("../pages/AdminPage").then((module) => ({ default: module.AdminPage })));

function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === "MEMBER") {
    return <Navigate to="/compromissos" replace />;
  }

  return <>{children}</>;
}

function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);

  useEffect(() => {
    if (!token || user) {
      return;
    }

    me()
      .then((currentUser) => setSession(token, currentUser))
      .catch(() => clearSession());
  }, [clearSession, setSession, token, user]);

  if (token && !user) {
    return (
      <Stack minHeight="100vh" alignItems="center" justifyContent="center">
        <CircularProgress />
      </Stack>
    );
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <SessionBootstrap>
        <Suspense
          fallback={
            <Stack minHeight="100vh" alignItems="center" justifyContent="center">
              <CircularProgress />
            </Stack>
          }
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/convites/:token" element={<InvitationAcceptPage />} />
            <Route path="/integrations/google-calendar/callback" element={<GoogleCalendarCallbackPage />} />
            <Route element={<ProtectedRoute />}>
              <Route index element={<Navigate to="/compromissos" replace />} />
              <Route path="/compromissos" element={<AppointmentsPage />} />
              <Route path="/agendas" element={<SchedulesPage />} />
              <Route
                path="/administrador"
                element={
                  <AdminRoute>
                    <AdminPage />
                  </AdminRoute>
                }
              />
            </Route>
            <Route path="*" element={<Navigate to="/compromissos" replace />} />
          </Routes>
        </Suspense>
        <ToastHost />
      </SessionBootstrap>
    </BrowserRouter>
  );
}
