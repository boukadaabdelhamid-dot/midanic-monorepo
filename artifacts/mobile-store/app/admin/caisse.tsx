import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import {
  useCreateOrder,
  useGetProducts,
  type Product,
} from "@workspace/api-client-react";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { BarcodeScanner } from "@/components/admin/BarcodeScanner";
import { EmptyState } from "@/components/admin/EmptyState";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface CartLine { product: Product; qty: number }

const fmtDZ = (n: number) =>
  n.toLocaleString("fr-DZ", { minimumFractionDigits: 2 }) + " دج";

export default function CaisseScreen() {
  const colors = useColors();
  const { t, lang } = useLang();
  const [search, setSearch] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [withTva, setWithTva] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const productsQ = useGetProducts({ search: search || undefined, limit: 50 });
  const createOrder = useCreateOrder();
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);

  const products = productsQ.data?.products ?? [];

  const subtotal = useMemo(
    () => cart.reduce((s, l) => s + Number(l.product.price) * l.qty, 0),
    [cart],
  );
  const tva = withTva ? subtotal * 0.19 : 0;
  const total = subtotal + tva;

  const addProduct = (p: Product) => {
    Haptics.selectionAsync();
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === p.id);
      if (i >= 0) {
        const next = [...c];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...c, { product: p, qty: 1 }];
    });
    setPickerOpen(false);
  };

  const handleScanned = (code: string) => {
    setScanOpen(false);
    const match = products.find((p) => p.barcode === code || p.reference === code);
    if (match) addProduct(match);
    else {
      setSearch(code);
      setPickerOpen(true);
    }
  };

  const setQty = (id: number, q: number) => {
    setCart((c) =>
      q <= 0 ? c.filter((l) => l.product.id !== id) : c.map((l) => (l.product.id === id ? { ...l, qty: q } : l)),
    );
  };

  const buildReceipt = (orderId: number) => {
    const lines = cart
      .map((l) => `${(lang === "ar" ? l.product.nameAr : l.product.nameEn).slice(0, 24)}  x${l.qty}  ${fmtDZ(Number(l.product.price) * l.qty)}`)
      .join("\n");
    return [
      "    MIDANIC",
      "    " + (lang === "ar" ? "إيصال بيع" : "Sale Receipt"),
      `#${orderId}   ${new Date().toLocaleString()}`,
      "------------------------",
      lines,
      "------------------------",
      `${t("المجموع", "Subtotal")}:  ${fmtDZ(subtotal)}`,
      withTva ? `${t("ض.ق.م 19٪", "TVA 19%")}:  ${fmtDZ(tva)}` : "",
      `${t("الإجمالي", "Total")}:  ${fmtDZ(total)}`,
      phone ? `\n${t("الهاتف", "Phone")}: ${phone}` : "",
      "\n" + t("شكراً لزيارتكم", "Thank you!"),
    ].filter(Boolean).join("\n");
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const order = await createOrder.mutateAsync({
        data: {
          customerName: name || t("زبون نقدي", "Walk-in"),
          customerPhone: phone || "0000000000",
          customerAddress: t("بيع داخل المتجر", "In-store sale"),
          items: cart.map((l) => ({ productId: l.product.id, quantity: l.qty })),
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const receipt = buildReceipt(order.id);
      setLastReceipt(receipt);
      setCart([]);
      setPhone("");
      setName("");
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const shareReceipt = async () => {
    if (!lastReceipt) return;
    try {
      if (Platform.OS === "web") {
        if (navigator.share) await navigator.share({ text: lastReceipt });
        else navigator.clipboard?.writeText(lastReceipt);
        return;
      }
      const file = new File(Paths.cache, "receipt.txt");
      file.write(lastReceipt);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri);
    } catch {
      /* */
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <AdminHeader title={t("الصندوق", "POS")} showBack />

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.action, { backgroundColor: colors.primary }]}
          onPress={() => setScanOpen(true)}
        >
          <Feather name="maximize" size={16} color={colors.primaryForeground} />
          <Text style={[styles.actionTxt, { color: colors.primaryForeground }]}>
            {t("مسح", "Scan")}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => setPickerOpen(true)}
        >
          <Feather name="search" size={16} color={colors.foreground} />
          <Text style={[styles.actionTxt, { color: colors.foreground }]}>
            {t("بحث منتج", "Search Product")}
          </Text>
        </Pressable>
      </View>

      {cart.length === 0 ? (
        <EmptyState icon="shopping-cart" ar="السلة فارغة" en="Cart is empty" />
      ) : (
        <FlatList
          data={cart}
          keyExtractor={(l) => String(l.product.id)}
          contentContainerStyle={[styles.list, { paddingBottom: 24 }]}
          renderItem={({ item }) => (
            <View style={[styles.line, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lineName, { color: colors.foreground }]} numberOfLines={1}>
                  {lang === "ar" ? item.product.nameAr : item.product.nameEn}
                </Text>
                <Text style={[styles.linePrice, { color: colors.mutedForeground }]}>
                  {fmtDZ(Number(item.product.price))} × {item.qty}
                </Text>
              </View>
              <View style={styles.qtyBox}>
                <Pressable onPress={() => setQty(item.product.id, item.qty - 1)} style={[styles.qtyBtn, { borderColor: colors.border }]}>
                  <Feather name="minus" size={14} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.qty, { color: colors.foreground }]}>{item.qty}</Text>
                <Pressable onPress={() => setQty(item.product.id, item.qty + 1)} style={[styles.qtyBtn, { borderColor: colors.border }]}>
                  <Feather name="plus" size={14} color={colors.foreground} />
                </Pressable>
              </View>
              <Text style={[styles.lineTotal, { color: colors.primary }]}>
                {fmtDZ(Number(item.product.price) * item.qty)}
              </Text>
            </View>
          )}
        />
      )}

      <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.row}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("اسم الزبون (اختياري)", "Name (optional)")}
            placeholderTextColor={colors.mutedForeground}
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, flex: 1 }]}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={t("الهاتف (اختياري)", "Phone (optional)")}
            placeholderTextColor={colors.mutedForeground}
            keyboardType="phone-pad"
            style={[styles.input, { borderColor: colors.border, color: colors.foreground, flex: 1 }]}
          />
          <Pressable
            onPress={() => setWithTva((v) => !v)}
            style={[styles.tvaBtn, { borderColor: withTva ? colors.primary : colors.border, backgroundColor: withTva ? colors.primary + "1A" : "transparent" }]}
          >
            <Text style={[styles.tvaTxt, { color: withTva ? colors.primary : colors.mutedForeground }]}>TVA</Text>
          </Pressable>
        </View>

        <View style={styles.totalsRow}>
          <Text style={[styles.totalsLbl, { color: colors.mutedForeground }]}>{t("المجموع", "Subtotal")}</Text>
          <Text style={[styles.totalsVal, { color: colors.foreground }]}>{fmtDZ(subtotal)}</Text>
        </View>
        {withTva ? (
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLbl, { color: colors.mutedForeground }]}>TVA 19%</Text>
            <Text style={[styles.totalsVal, { color: colors.foreground }]}>{fmtDZ(tva)}</Text>
          </View>
        ) : null}
        <View style={styles.totalsRow}>
          <Text style={[styles.bigLbl, { color: colors.foreground }]}>{t("الإجمالي", "Total")}</Text>
          <Text style={[styles.bigVal, { color: colors.primary }]}>{fmtDZ(total)}</Text>
        </View>

        <Pressable
          onPress={checkout}
          disabled={createOrder.isPending || cart.length === 0}
          style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: createOrder.isPending || cart.length === 0 ? 0.5 : 1 }]}
        >
          {createOrder.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <>
              <Feather name="check-circle" size={16} color={colors.primaryForeground} />
              <Text style={[styles.submitTxt, { color: colors.primaryForeground }]}>
                {t("إنهاء البيع (نقدي)", "Cash Sale")}
              </Text>
            </>
          )}
        </Pressable>

        {lastReceipt ? (
          <Pressable
            onPress={shareReceipt}
            style={[styles.shareBtn, { borderColor: colors.border }]}
          >
            <Feather name="share-2" size={14} color={colors.foreground} />
            <Text style={[styles.shareTxt, { color: colors.foreground }]}>
              {t("مشاركة الإيصال الأخير", "Share Last Receipt")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <BarcodeScanner visible={scanOpen} onClose={() => setScanOpen(false)} onScanned={handleScanned} />

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.card }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
              {t("اختر منتج", "Pick Product")}
            </Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("بحث", "Search")}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground, borderColor: colors.border }]}
            />
            <FlatList
              data={products}
              keyExtractor={(p) => String(p.id)}
              style={{ maxHeight: 360 }}
              ListEmptyComponent={<Text style={{ color: colors.mutedForeground, textAlign: "center", padding: 16 }}>{t("لا نتائج", "No results")}</Text>}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => addProduct(item)}
                  style={({ pressed }) => [styles.pickRow, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.pickName, { color: colors.foreground }]} numberOfLines={1}>
                    {lang === "ar" ? item.nameAr : item.nameEn}
                  </Text>
                  <Text style={[styles.pickPrice, { color: colors.primary }]}>
                    {fmtDZ(Number(item.price))}
                  </Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  actionRow: { flexDirection: "row", gap: 8, padding: 12 },
  action: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 10, borderRadius: 10 },
  actionTxt: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 12, gap: 6 },
  line: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 10, borderWidth: 1 },
  lineName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  linePrice: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  qtyBox: { flexDirection: "row", alignItems: "center", gap: 6 },
  qtyBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  qty: { fontSize: 13, fontFamily: "Inter_700Bold", minWidth: 18, textAlign: "center" },
  lineTotal: { fontSize: 13, fontFamily: "Inter_700Bold", minWidth: 80, textAlign: "right" },
  summary: { borderTopWidth: 1, padding: 12, paddingBottom: 100, gap: 8 },
  row: { flexDirection: "row", gap: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, fontFamily: "Inter_500Medium" },
  tvaBtn: { width: 56, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1 },
  tvaTxt: { fontSize: 13, fontFamily: "Inter_700Bold" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  totalsLbl: { fontSize: 12, fontFamily: "Inter_500Medium" },
  totalsVal: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  bigLbl: { fontSize: 14, fontFamily: "Inter_700Bold" },
  bigVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 12, marginTop: 4 },
  submitTxt: { fontSize: 14, fontFamily: "Inter_700Bold" },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 8, borderRadius: 10, borderWidth: 1 },
  shareTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 32, gap: 8, maxHeight: "80%" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  pickRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1 },
  pickName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  pickPrice: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
