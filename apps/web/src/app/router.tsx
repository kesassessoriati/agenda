import { CircularProgress, Stack } from "@mui/material";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AppShell } from "../components/AppShell";
import { useAuthStore } from "../store/auth-store";
import { me } from "../services/auth";
import { ToastHost } from "../components/ToastHost";

const LoginPage = lazy(() => import("../pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const GoogleCalendarCallbackPage = lazy(() =>
  import("../pages/GoogleCalendarCallbackPage").then((module) => ({ default: module.GoogleCalendarCallbackPage })),
);
const AppointmentsPage = lazy(() => import("../pages/AppointmentsPage").then((module) => ({ default: module.AppointmentsPage })));
const SchedulesPage = lazy(() => import("../pages/SchedulesPage").then((module) => ({ default: module.SchedulesPage })));

function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell />;
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
            <Route path="/integrations/google-calendar/callback" element={<GoogleCalendarCallbackPage />} />
            <Route element={<ProtectedRoute />}>
              <Route index element={<Navigate to="/compromissos" replace />} />
              <Route path="/compromissos" element={<AppointmentsPage />} />
              <Route path="/agendas" element={<SchedulesPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/compromissos" replace />} />
          </Routes>
        </Suspense>
        <ToastHost />
      </SessionBootstrap>
    </BrowserRouter>
  );
}
