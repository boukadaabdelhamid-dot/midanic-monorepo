import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Redirect } from "expo-router";
import {
  useCreateErpStaff,
  useDeleteErpStaff,
  useGetErpStaff,
  useGetErpStores,
  useSetErpStaffStores,
  type StaffMember,
} from "@workspace/api-client-react";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { EmptyState } from "@/components/admin/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

export default function StaffScreen() {
  const colors = useColors();
  const { t, lang } = useLang();
  const { isAdmin } = useAuth();

  const staffQ = useGetErpStaff();
  const storesQ = useGetErpStores();
  const createMut = useCreateErpStaff();
  const deleteMut = useDeleteErpStaff();
  const setStoresMut = useSetErpStaffStores();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "employee" as "admin" | "employee" });

  if (!isAdmin) return <Redirect href="/admin" />;

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await createMut.mutateAsync({ data: form });
      setForm({ name: "", email: "", password: "", role: "employee" });
      setCreateOpen(false);
      staffQ.refetch();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleDelete = (s: StaffMember) => {
    Alert.alert(
      t("حذف", "Delete"),
      `${s.name} (${s.email})`,
      [
        { text: t("إلغاء", "Cancel"), style: "cancel" },
        {
          text: t("حذف", "Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMut.mutateAsync({ id: s.id });
              staffQ.refetch();
            } catch {
              /* */
            }
          },
        },
      ],
    );
  };

  const toggleStore = async (member: StaffMember, storeId: number) => {
    const current = (member.stores ?? []).map((s) => s.id);
    const next = current.includes(storeId)
      ? current.filter((x) => x !== storeId)
      : [...current, storeId];
    try {
      await setStoresMut.mutateAsync({ id: member.id, data: { storeIds: next } });
      staffQ.refetch();
    } catch {
      /* */
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={t("الموظفون", "Staff")} showBack />
      <View style={styles.actionsBar}>
        <Pressable
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setCreateOpen(true)}
        >
          <Feather name="user-plus" size={14} color={colors.primaryForeground} />
          <Text style={[styles.addBtnTxt, { color: colors.primaryForeground }]}>
            {t("إضافة موظف", "Add Staff")}
          </Text>
        </Pressable>
      </View>

      {staffQ.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={staffQ.data ?? []}
          keyExtractor={(s) => String(s.id)}
          contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
          refreshControl={<RefreshControl refreshing={staffQ.isRefetching} onRefresh={staffQ.refetch} tintColor={colors.primary} />}
          ListEmptyComponent={<EmptyState icon="user" ar="لا يوجد موظفون" en="No staff" />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={[styles.email, { color: colors.mutedForeground }]}>{item.email}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: item.role === "admin" ? colors.primary : colors.muted }]}>
                  <Text style={[styles.roleTxt, { color: item.role === "admin" ? colors.primaryForeground : colors.foreground }]}>
                    {item.role}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Pressable style={[styles.smallBtn, { borderColor: colors.border }]} onPress={() => setEditing(item)}>
                  <Feather name="edit-2" size={12} color={colors.foreground} />
                  <Text style={[styles.smallBtnTxt, { color: colors.foreground }]}>{t("المتاجر", "Stores")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, { borderColor: colors.destructive }]}
                  onPress={() => handleDelete(item)}
                  disabled={deleteMut.isPending}
                >
                  <Feather name="trash-2" size={12} color={colors.destructive} />
                  <Text style={[styles.smallBtnTxt, { color: colors.destructive }]}>{t("حذف", "Delete")}</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={createOpen} transparent animationType="slide" onRequestClose={() => setCreateOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setCreateOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{t("موظف جديد", "New Staff")}</Text>
            <TextInput
              placeholder={t("الاسم", "Name")}
              placeholderTextColor={colors.mutedForeground}
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />
            <TextInput
              placeholder="email@example.com"
              placeholderTextColor={colors.mutedForeground}
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />
            <TextInput
              placeholder={t("كلمة المرور", "Password")}
              placeholderTextColor={colors.mutedForeground}
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
              secureTextEntry
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />
            <View style={styles.roleRow}>
              {(["employee", "admin"] as const).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setForm({ ...form, role: r })}
                  style={[
                    styles.roleOpt,
                    {
                      backgroundColor: form.role === r ? colors.primary : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.roleOptTxt, { color: form.role === r ? colors.primaryForeground : colors.foreground }]}>
                    {r === "admin" ? t("مدير", "Admin") : t("موظف", "Employee")}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: createMut.isPending ? 0.6 : 1 }]}
              onPress={handleCreate}
              disabled={createMut.isPending}
            >
              <Text style={[styles.primaryBtnTxt, { color: colors.primaryForeground }]}>
                {t("إنشاء", "Create")}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <Pressable style={styles.overlay} onPress={() => setEditing(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {editing?.name} · {t("المتاجر", "Stores")}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {(storesQ.data ?? []).map((s) => {
                const enabled = (editing?.stores ?? []).some((x) => x.id === s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => editing && toggleStore(editing, s.id)}
                    style={[
                      styles.storeRow,
                      { borderColor: colors.border, backgroundColor: enabled ? colors.primary + "11" : colors.background },
                    ]}
                  >
                    <Text style={[styles.storeName, { color: colors.foreground }]}>
                      {lang === "ar" ? s.nameAr : s.nameEn}
                    </Text>
                    <Feather
                      name={enabled ? "check-square" : "square"}
                      size={18}
                      color={enabled ? colors.primary : colors.mutedForeground}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { padding: 32, alignItems: "center" },
  actionsBar: { padding: 12, alignItems: "flex-end" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { padding: 14, paddingTop: 0, gap: 8 },
  card: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 14, fontFamily: "Inter_700Bold" },
  email: { fontSize: 12, fontFamily: "Inter_400Regular" },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  roleTxt: { fontSize: 11, fontFamily: "Inter_600SemiBold", textTransform: "uppercase" },
  actions: { flexDirection: "row", gap: 6 },
  smallBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  smallBtnTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, paddingBottom: 36, gap: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_500Medium" },
  roleRow: { flexDirection: "row", gap: 8 },
  roleOpt: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  roleOptTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  primaryBtn: { padding: 12, borderRadius: 10, alignItems: "center", marginTop: 6 },
  primaryBtnTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  storeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  storeName: { fontSize: 14, fontFamily: "Inter_500Medium" },
});
