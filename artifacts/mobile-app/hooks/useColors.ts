import { useColorScheme } from "react-native";
import { darkColors, lightColors, type AppColors } from "@/constants/colors";

export function useColors(): AppColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkColors : lightColors;
}
