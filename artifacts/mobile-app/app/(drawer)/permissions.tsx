import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { DrawerHeader } from "@/components/DrawerHeader";

export default function PermissionsScreen() {
  const c = useColors();
  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="الصلاحيات" subtitle="Permissions" />
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: c.primary + "18" }]}>
          <Ionicons name="shield-checkmark" size={48} color={c.primary} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>إدارة الصلاحيات</Text>
        <Text style={[styles.sub, { color: c.textMuted }]}>هذه الوحدة ستكون متاحة قريباً</Text>
        <Text style={[styles.sub, { color: c.textMuted }]}>Gestion des permissions — bientôt disponible</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  iconWrap: { width: 96, height: 96, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  sub: { fontSize: 14, textAlign: "center" },
});
