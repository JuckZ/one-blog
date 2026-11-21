"use client";

import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import { ThemeProvider } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { RefineThemes } from "@refinedev/mui";
import Cookies from "js-cookie";
import React, { createContext, type PropsWithChildren, useState } from "react";

type ColorMode = "light" | "dark";

type ColorModeContextType = {
  mode: ColorMode;
  setMode: () => void;
};

export const ColorModeContext = createContext<ColorModeContextType>(
  {} as ColorModeContextType
);

type ColorModeContextProviderProps = {
  defaultMode?: ColorMode;
};

export const ColorModeContextProvider: React.FC<
  PropsWithChildren<ColorModeContextProviderProps>
> = ({ children, defaultMode }) => {
  const [preferredMode, setPreferredMode] = useState(defaultMode);
  const systemPrefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const mode = preferredMode ?? (systemPrefersDark ? "dark" : "light");

  const toggleTheme = () => {
    const nextTheme = mode === "light" ? "dark" : "light";

    setPreferredMode(nextTheme);
    Cookies.set("theme", nextTheme);
  };

  return (
    <ColorModeContext.Provider
      value={{
        setMode: toggleTheme,
        mode,
      }}
    >
      <ThemeProvider
        // you can change the theme colors here. example: mode === "light" ? RefineThemes.Magenta : RefineThemes.MagentaDark
        theme={mode === "light" ? RefineThemes.Blue : RefineThemes.BlueDark}
      >
        <CssBaseline />
        <GlobalStyles styles={{ html: { WebkitFontSmoothing: "auto" } }} />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};
