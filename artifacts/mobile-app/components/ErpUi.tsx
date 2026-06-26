import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

/** Compact KPI tile used across the dashboard grid. */
export function KpiCard({
  icon,
  label,
  value,
  loading = false,
  tone = "default",
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  loading?: boolean;
  tone?: "default" | "positive" | "negative";
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const valueColor =
    tone === "positive"
      ? c.success
      : tone === "negative"
        ? c.danger
        : c.text;

  return (
    <View
      style={[
        styles.kpiCard,
        { backgroundColor: c.surface, borderColor: c.border },
        style,
      ]}
    >
      <View style={styles.kpiHeader}>
        <Text style={[styles.kpiLabel, { color: c.textMuted }]} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name={icon} size={16} color={c.textMuted} />
      </View>
      {loading ? (
        <ActivityIndicator color={c.textMuted} style={{ alignSelf: "flex-end", marginTop: 8 }} />
      ) : (
        <Text style={[styles.kpiValue, { color: valueColor }]} numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );
}

/** Small colored status chip. */
export function Pill({
  label,
  color,
}: {
  label: string;
  color: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: color + "22" }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function LoadingState() {
  const c = useColors();
  return (
    <View style={styles.centerState}>
      <ActivityIndicator color={c.primary} />
    </View>
  );
}

export function ErrorState({
  onRetry,
  message = "تعذّر تحميل البيانات",
}: {
  onRetry?: () => void;
  message?: string;
}) {
  const c = useColors();
  return (
    <View style={styles.centerState}>
      <Ionicons name="alert-circle" size={28} color={c.danger} />
      <Text style={[styles.stateText, { color: c.danger }]}>{message}</Text>
      {onRetry ? (
        <Text
          onPress={onRetry}
          style={[styles.retryLink, { color: c.primary }]}
        >
          إعادة المحاولة
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = "file-tray",
  message,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
}) {
  const c = useColors();
  return (
    <View style={styles.centerState}>
      <Ionicons name={icon} size={28} color={c.textMuted} />
      <Text style={[styles.stateText, { color: c.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiCard: {
    flexGrow: 1,
    width: "47.5%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  kpiHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kpiLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "right",
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  centerState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 48,
  },
  stateText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  retryLink: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
});
