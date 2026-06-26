/**
 * Midanic brand palette.
 * Primary navy #1B3057, off-white #F5F5F0 — shared with the web/ERP surfaces,
 * but expressed here with a darker, management-console personality (deep navy
 * chrome + restrained gold accent) so the staff app never reads like the
 * customer store.
 */

const navy = "#1B3057";
const navyDeep = "#13233F";
const navyTint = "#2C4A7E";
const offWhite = "#F5F5F0";
const gold = "#C6A15B";

export const lightColors = {
  background: offWhite,
  surface: "#FFFFFF",
  surfaceAlt: "#ECECE3",
  primary: navy,
  primaryDeep: navyDeep,
  primaryTint: navyTint,
  onPrimary: "#FFFFFF",
  accent: gold,
  text: "#161B26",
  textMuted: "#5C6470",
  textInverse: "#FFFFFF",
  border: "#DAD9CE",
  inputBg: "#FFFFFF",
  success: "#2E7D5B",
  danger: "#C0492F",
  warning: "#B07A12",
  shadow: "rgba(19, 35, 63, 0.18)",
};

export const darkColors = {
  background: navyDeep,
  surface: "#1A2C49",
  surfaceAlt: "#223A5E",
  primary: "#FFFFFF",
  primaryDeep: "#0E1A30",
  primaryTint: navyTint,
  onPrimary: navyDeep,
  accent: gold,
  text: "#F3F4F2",
  textMuted: "#A7B0C0",
  textInverse: navyDeep,
  border: "#2C436A",
  inputBg: "#15263F",
  success: "#4FB286",
  danger: "#E07A63",
  warning: "#D6A341",
  shadow: "rgba(0, 0, 0, 0.4)",
};

export type AppColors = typeof lightColors;
