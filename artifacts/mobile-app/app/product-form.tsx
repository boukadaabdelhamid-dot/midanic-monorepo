import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  useCreateProduct,
  useDeleteProduct,
  useGetCategories,
  useGetProduct,
  useUpdateProduct,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useServerConfig } from "@/context/ServerConfigContext";
import { LoadingState } from "@/components/ErpUi";
import { Button } from "@/components/Button";
import { getSecureItem } from "@/lib/secure-storage";

const TOKEN_KEY = "midanic_token";

function resolveImg(url: string | null | undefined, serverUrl: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (serverUrl && url.startsWith("/")) return `${serverUrl}${url}`;
  return null;
}

async function uploadProductImage(serverUrl: string, localUri: string, mimeType: string): Promise<string> {
  const token = await getSecureItem(TOKEN_KEY);
  const formData = new FormData();
  const ext = mimeType.split("/")[1] ?? "jpg";
  formData.append("file", {
    uri: localUri,
    type: mimeType,
    name: `product.${ext}`,
  } as any);

  const res = await fetch(`${serverUrl}/api/uploads`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${res.status} ${body}`);
  }

  const json = await res.json() as { url: string };
  return json.url;
}

function BackHeader({ title }: { title: string }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { backgroundColor: c.primaryDeep, paddingTop: insets.top + (Platform.OS === "web" ? 12 : 8) }]}>
      <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={10}>
        <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 38 }} />
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }: any) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.textMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={c.textMuted}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        style={[
          styles.fieldInput,
          { color: c.text, backgroundColor: c.inputBg, borderColor: c.border },
          multiline && { height: 80, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}

export default function ProductFormScreen() {
  const c = useColors();
  const { serverUrl } = useServerConfig();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const productId = Number(id);

  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [reference, setReference] = useState("");
  const [barcode, setBarcode] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("");
  const [minStock, setMinStock] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: product, isLoading } = useGetProduct(isEdit ? productId : 0);
  const categories = useGetCategories();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  useEffect(() => {
    const p = product as any;
    if (!p) return;
    setNameAr(p.nameAr ?? "");
    setNameEn(p.nameEn ?? "");
    setReference(p.reference ?? "");
    setBarcode(p.barcode ?? "");
    setPrice(String(p.price ?? ""));
    setCostPrice(String(p.costPrice ?? ""));
    setStock(String(p.stock ?? ""));
    setMinStock(String(p.minStock ?? ""));
    setDescription(p.description ?? "");
    setCategoryId(p.categoryId ?? null);
    setImageUrl(p.imageUrl ?? null);
  }, [product]);

  const pickImage = async (source: "gallery" | "camera") => {
    if (!serverUrl) {
      Alert.alert("خطأ", "لم يتم الاتصال بالخادم بعد");
      return;
    }

    let result: ImagePicker.ImagePickerResult;

    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("الإذن مطلوب", "يرجى السماح بالوصول إلى الكاميرا في إعدادات التطبيق");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
    } else {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("الإذن مطلوب", "يرجى السماح بالوصول إلى الصور في إعدادات التطبيق");
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
    }

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? "image/jpeg";

    setUploading(true);
    try {
      const url = await uploadProductImage(serverUrl, asset.uri, mimeType);
      setImageUrl(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء رفع الصورة";
      Alert.alert("فشل الرفع", msg);
    } finally {
      setUploading(false);
    }
  };

  const showImageOptions = () => {
    if (Platform.OS === "web") {
      void pickImage("gallery");
      return;
    }
    Alert.alert("اختر صورة المنتج", "", [
      { text: "الكاميرا", onPress: () => void pickImage("camera") },
      { text: "معرض الصور", onPress: () => void pickImage("gallery") },
      { text: "إلغاء", style: "cancel" },
    ]);
  };

  const handleSave = () => {
    if (!nameAr && !nameEn) {
      if (Platform.OS !== "web") Alert.alert("خطأ", "يرجى إدخال اسم المنتج");
      return;
    }
    const payload = {
      nameAr: nameAr || undefined,
      nameEn: nameEn || undefined,
      reference: reference || undefined,
      barcode: barcode || undefined,
      price: price || undefined,
      costPrice: costPrice ? String(costPrice) : undefined,
      stock: stock ? Number(stock) : undefined,
      minStock: minStock ? Number(minStock) : undefined,
      description: description || undefined,
      categoryId: categoryId ?? undefined,
      imageUrl: imageUrl || undefined,
    };

    if (isEdit) {
      updateProduct.mutate(
        { id: productId, data: payload as any },
        { onSuccess: () => router.back() },
      );
    } else {
      createProduct.mutate(
        { data: payload as any },
        { onSuccess: () => router.back() },
      );
    }
  };

  const handleDelete = () => {
    const doDelete = () => {
      deleteProduct.mutate(
        { id: productId },
        { onSuccess: () => router.back() },
      );
    };
    if (Platform.OS === "web") { doDelete(); return; }
    Alert.alert(
      "حذف المنتج",
      `هل تريد حذف "${nameAr || nameEn}"؟ هذا الإجراء لا يمكن التراجع عنه.`,
      [
        { text: "إلغاء", style: "cancel" },
        { text: "حذف", style: "destructive", onPress: doDelete },
      ],
    );
  };

  if (isEdit && isLoading) return <LoadingState />;

  const catList = (categories.data ?? []) as any[];
  const isPending = createProduct.isPending || updateProduct.isPending;
  const resolvedImg = resolveImg(imageUrl, serverUrl);

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BackHeader title={isEdit ? "تعديل المنتج" : "إضافة منتج"} />
      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: c.textMuted }]}>صورة المنتج</Text>
          <Pressable
            onPress={showImageOptions}
            disabled={uploading}
            style={({ pressed }) => [
              styles.imagePicker,
              { borderColor: c.border, backgroundColor: c.inputBg, opacity: pressed || uploading ? 0.7 : 1 },
            ]}
          >
            {resolvedImg ? (
              <Image
                source={{ uri: resolvedImg }}
                style={styles.imagePreview}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera-outline" size={32} color={c.textMuted} />
                <Text style={[styles.imagePlaceholderText, { color: c.textMuted }]}>
                  {uploading ? "جارٍ الرفع…" : "اضغط لإضافة صورة"}
                </Text>
              </View>
            )}
            {resolvedImg && (
              <View style={[styles.imageEditBadge, { backgroundColor: c.primary }]}>
                <Ionicons name="pencil" size={14} color="#fff" />
              </View>
            )}
            {uploading && (
              <View style={[styles.imageOverlay, { backgroundColor: "rgba(0,0,0,0.45)" }]}>
                <Text style={styles.uploadingText}>جارٍ الرفع…</Text>
              </View>
            )}
          </Pressable>
          {imageUrl && !uploading && (
            <Pressable
              onPress={() => setImageUrl(null)}
              style={styles.removeImageBtn}
            >
              <Ionicons name="trash-outline" size={14} color={c.danger} />
              <Text style={[styles.removeImageText, { color: c.danger }]}>إزالة الصورة</Text>
            </Pressable>
          )}
        </View>

        <Field label="الاسم بالعربية" value={nameAr} onChangeText={setNameAr} />
        <Field label="الاسم بالفرنسية" value={nameEn} onChangeText={setNameEn} />
        <Field label="المرجع / الرمز" value={reference} onChangeText={setReference} />
        <Field label="الباركود" value={barcode} onChangeText={setBarcode} keyboardType="numeric" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="السعر" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="سعر التكلفة" value={costPrice} onChangeText={setCostPrice} keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="المخزون" value={stock} onChangeText={setStock} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="الحد الأدنى" value={minStock} onChangeText={setMinStock} keyboardType="numeric" />
          </View>
        </View>
        <Field label="الوصف" value={description} onChangeText={setDescription} multiline />

        {catList.length > 0 && (
          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: c.textMuted }]}>الفئة</Text>
            <View style={styles.catGrid}>
              {catList.map((cat: any) => (
                <Pressable
                  key={cat.id}
                  onPress={() => setCategoryId(cat.id === categoryId ? null : cat.id)}
                  style={({ pressed }) => [
                    styles.catBtn,
                    {
                      backgroundColor: cat.id === categoryId ? c.primary : c.surface,
                      borderColor: cat.id === categoryId ? c.primary : c.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.catText, { color: cat.id === categoryId ? c.onPrimary : c.text }]}>
                    {cat.nameAr || cat.nameEn}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Button
          label={isEdit ? "حفظ التعديلات" : "إضافة المنتج"}
          onPress={handleSave}
          loading={isPending || uploading}
          style={{ marginTop: 8 }}
        />

        {isEdit && (
          <Pressable
            onPress={handleDelete}
            disabled={deleteProduct.isPending}
            style={({ pressed }) => [
              styles.deleteBtn,
              { borderColor: c.danger, opacity: pressed || deleteProduct.isPending ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="trash-outline" size={18} color={c.danger} />
            <Text style={[styles.deleteBtnText, { color: c.danger }]}>حذف المنتج</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)",
  },
  backBtn: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: "#FFFFFF", textAlign: "center" },
  content: { padding: 16, paddingBottom: 48, gap: 4 },
  row: { flexDirection: "row", gap: 12 },
  field: { gap: 6, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "600", textAlign: "right" },
  fieldInput: {
    height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14,
    fontSize: 15, textAlign: "right",
  },
  imagePicker: {
    height: 140, borderRadius: 14, borderWidth: 1, borderStyle: "dashed",
    overflow: "hidden", alignItems: "center", justifyContent: "center",
  },
  imagePreview: { width: "100%", height: "100%" },
  imagePlaceholder: { alignItems: "center", gap: 8 },
  imagePlaceholderText: { fontSize: 13 },
  imageEditBadge: {
    position: "absolute", bottom: 8, right: 8,
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center", justifyContent: "center",
  },
  uploadingText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  removeImageBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    alignSelf: "flex-end", paddingVertical: 4,
  },
  removeImageText: { fontSize: 12, fontWeight: "600" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  catText: { fontSize: 13, fontWeight: "700" },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, marginTop: 12, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  deleteBtnText: { fontSize: 15, fontWeight: "700" },
});
