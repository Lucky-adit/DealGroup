import { useColorScheme } from "react-native";

// Same palette as the website (indigo + saffron).
const light = {
  bg: "#f5f6fb", surface: "#ffffff", fg: "#1b1f33", muted: "#5b6280", line: "#dfe2ee", chip: "#e9ecf8",
  brand: "#2b3a8c", brandFg: "#ffffff", accent: "#b8740a", good: "#1f7a4d", warn: "#a15c00",
};
const dark: typeof light = {
  bg: "#12141f", surface: "#1a1d2c", fg: "#e7e9f3", muted: "#a2a8c4", line: "#2d3148", chip: "#262a40",
  brand: "#9fb0ff", brandFg: "#12141f", accent: "#f0b44a", good: "#5fcf95", warn: "#f0b44a",
};
export type Palette = typeof light;

export function useTheme(): Palette {
  return useColorScheme() === "dark" ? dark : light;
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = { sm: 8, md: 12, pill: 999 };
