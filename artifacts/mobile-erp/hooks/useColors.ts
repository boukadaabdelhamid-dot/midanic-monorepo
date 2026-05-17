import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

export function useColors() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark" && "dark" in colors;
  const palette = isDark
    ? (colors as unknown as { dark: typeof colors.light }).dark
    : colors.light;
  return { ...palette, radius: colors.radius };
}
