import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useGetErpAccountMe } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { DrawerHeader } from "@/components/DrawerHeader";
import { LoadingState, ErrorState } from "@/components/ErpUi";

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: string }) {
  const c = useColors();
  return (
    <View style={[styles.infoRow, { borderBottomColor: c.border }]}>
      <Text style={[styles.infoLabel, { color: c.textMuted }]}>{label}</Text>
      <View style={styles.infoValue}>
        {icon ? <Ionicons name={icon as any} size={15} color={c.textMuted} /> : null}
        <Text style={[styles.infoValueText, { color: c.text }]} numberOfLines={1}>{value || "—"}</Text>
      </View>
    </View>
  );
}

export default function MonCompteScreen() {
  const c = useColors();
  const { user, stores, currentStoreId } = useAuth();
  const { data, isLoading, isError, refetch } = useGetErpAccountMe();
  const account = data as any;
  const activeStore = stores.find((s) => s.id === currentStoreId);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <DrawerHeader title="حسابي" subtitle="Mon Compte" />
      {isLoading ? <LoadingState /> : isError ? <ErrorState onRetry={() => void refetch()} /> : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: c.primary }]}>
              <Ionicons name="person" size={36} color={c.onPrimary} />
            </View>
            <Text style={[styles.profileName, { color: c.text }]}>
              {account?.name || user?.name || "—"}
            </Text>
            <Text style={[styles.profileRole, { color: c.textMuted }]}>
              {account?.role === "admin" || user?.role === "admin" ? "مدير" : "موظف"}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.cardTitle, { color: c.text }]}>معلومات الحساب</Text>
            <InfoRow label="الاسم" value={account?.name || user?.name || ""} icon="person-outline" />
            <InfoRow label="البريد الإلكتروني" value={account?.email || user?.email || ""} icon="mail-outline" />
            <InfoRow label="رقم الهاتف" value={account?.phone || ""} icon="call-outline" />
            <InfoRow label="الدور" value={account?.role === "admin" ? "مدير النظام" : "موظف"} icon="shield-outline" />
          </View>

          {activeStore && (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>المتجر الحالي</Text>
              <InfoRow label="الاسم (عربي)" value={activeStore.nameAr || ""} icon="storefront-outline" />
              <InfoRow label="الاسم (فرنسي)" value={activeStore.nameEn || ""} icon="storefront-outline" />
            </View>
          )}

          {stores.length > 1 && (
            <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.cardTitle, { color: c.text }]}>متاجري ({stores.length})</Text>
              {stores.map((store) => (
                <View key={store.id} style={[styles.storeRow, { borderBottomColor: c.border }]}>
                  <Ionicons name="storefront-outline" size={16} color={c.textMuted} />
                  <Text style={[styles.storeName, { color: c.text }]} numberOfLines={1}>
                    {store.nameAr || store.nameEn}
                  </Text>
                  {store.id === currentStoreId ? (
                    <Ionicons name="checkmark-circle" size={18} color={c.success} />
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  profileHeader: { alignItems: "center", gap: 10, marginBottom: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  profileName: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  profileRole: { fontSize: 14, textAlign: "center" },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: "800", textAlign: "right", marginBottom: 12 },
  infoRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, justifyContent: "flex-end" },
  infoValueText: { fontSize: 14, fontWeight: "600" },
  storeRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1,
  },
  storeName: { flex: 1, fontSize: 14, fontWeight: "600" },
});
