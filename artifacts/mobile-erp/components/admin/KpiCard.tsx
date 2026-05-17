import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface KpiCardProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  hint?: string;
  tint?: string;
}

export function KpiCard({ icon, label, value, hint, tint }: KpiCardProps) {
  const colors = useColors();
  const accent = tint ?? colors.primary;
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: accent + "1A" }]}>
        <Feather name={icon} size={16} color={accent} />
      </View>
      <Text style={[styles.label, { color: colors.mutedForeground }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.value, { color: colors.foreground }]} numberOfLines={1}>{value}</Text>
      {hint ? <Text style={[styles.hint, { color: colors.mutedForeground }]} numberOfLines={1}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: "45%", borderRadius: 14, borderWidth: 1, padding: 12, gap: 4 },
  iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.4 },
  value: { fontSize: 18, fontFamily: "Inter_700Bold" },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
