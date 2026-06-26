import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import type { ConnectionStatus } from "@/context/ServerConfigContext";

const LABELS: Record<ConnectionStatus, string> = {
  unknown: "غير معروف",
  checking: "جارٍ التحقق",
  online: "متصل",
  offline: "غير متصل",
};

const ICONS: Record<ConnectionStatus, keyof typeof Ionicons.glyphMap> = {
  unknown: "help-circle",
  checking: "sync",
  online: "checkmark-circle",
  offline: "close-circle",
};

export function StatusPill({ status }: { status: ConnectionStatus }) {
  const c = useColors();

  const color =
    status === "online"
      ? c.success
      : status === "offline"
        ? c.danger
        : status === "checking"
          ? c.warning
          : c.textMuted;

  return (
    <View style={[styles.pill, { backgroundColor: color + "22" }]}>
      <Ionicons name={ICONS[status]} size={14} color={color} />
      <Text style={[styles.text, { color }]}>{LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 13,
    fontWeight: "700",
  },
});
