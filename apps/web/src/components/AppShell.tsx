import EventAvailableRounded from "@mui/icons-material/EventAvailableRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import {
  AppBar,
  Box,
  Button,
  Container,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuthStore } from "../store/auth-store";

const navLinkStyles = ({ isActive }: { isActive: boolean }) => ({
  textDecoration: "none",
  color: isActive ? "#0f172a" : "#475569",
  fontWeight: 800,
  padding: "10px 14px",
  background: isActive ? "rgba(255,255,255,0.8)" : "transparent",
});

export function AppShell() {
  const navigate = useNavigate();
  const clearSession = useAuthStore((state) => state.clearSession);
  const user = useAuthStore((state) => state.user);

  return (
    <Box sx={{ minHeight: "100vh", background: "radial-gradient(circle at top left, rgba(15,118,110,0.10), transparent 30%), linear-gradient(180deg, #f4f7f3 0%, #eef4ff 100%)" }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          background: "rgba(244,247,243,0.82)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(15,23,42,0.06)",
          color: "#0f172a",
        }}
      >
        <Toolbar sx={{ gap: 2, flexWrap: "wrap" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mr: "auto" }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 0,
                display: "grid",
                placeItems: "center",
                color: "#fff",
                background: "linear-gradient(135deg, #0f766e, #1d4ed8)",
                boxShadow: "0 14px 32px rgba(15, 118, 110, 0.25)",
              }}
            >
              <EventAvailableRounded />
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ color: "#0f766e", fontWeight: 900 }}>
                KES Meeting
              </Typography>
              <Typography variant="body2" sx={{ color: "#475569" }}>
                {user?.company.name}
              </Typography>
            </Box>
          </Box>

          <Stack direction="row" spacing={1} sx={{ background: "rgba(15,23,42,0.04)", p: 0.5, borderRadius: 0 }}>
            <NavLink to="/compromissos" style={navLinkStyles}>
              Compromissos
            </NavLink>
            <NavLink to="/agendas" style={navLinkStyles}>
              Agendas
            </NavLink>
          </Stack>

          <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 700 }}>
            {user?.name}
          </Typography>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<LogoutRounded />}
            onClick={() => {
              clearSession();
              navigate("/login");
            }}
          >
            Sair
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Outlet />
      </Container>
    </Box>
  );
}
