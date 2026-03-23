import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0f766e",
    },
    secondary: {
      main: "#1d4ed8",
    },
    background: {
      default: "#f4f7f3",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    h1: {
      fontWeight: 800,
      letterSpacing: "-0.04em",
    },
    h2: {
      fontWeight: 800,
      letterSpacing: "-0.03em",
    },
    h3: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    button: {
      fontWeight: 700,
      textTransform: "none",
    },
  },
  shape: {
    borderRadius: 0,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          border: "1px solid rgba(15, 23, 42, 0.06)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 0 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 0 },
        notchedOutline: { borderRadius: 0 },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiButtonGroup: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiSelect: {
      styleOverrides: {
        outlined: { borderRadius: 0 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
  },
});
