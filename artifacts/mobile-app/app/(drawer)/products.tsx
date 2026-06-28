import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActionSheetIOS,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetProducts,
  useGetLowStock,
  useUpdateProduct,
  useDeleteProduct,
  useCreateProduct,
  type Product,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";
import { useServerConfig } from "@/context/ServerConfigContext";
import { DrawerHeader } from "@/components/DrawerHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/ErpUi";
import { CURRENCY, fmtInt, fmtNum } from "@/lib/format";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";

// ─── helpers ──────────────────────────────────────────────────────────────────
function resolveImg(url: string | null | undefined, serverUrl: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (serverUrl && url.startsWith("/")) return `${serverUrl}${url}`;
  return null;
}

const CATALOGUE_COLORS: Record<string, { bg: string; fg: string }> = {
  ARTICLE:    { bg: "#e0f2fe", fg: "#0369a1" },
  PRODUITS:   { bg: "#ede9fe", fg: "#5b21b6" },
  APPAREIL:   { bg: "#fef3c7", fg: "#92400e" },
  ACCESSOIRE: { bg: "#d1fae5", fg: "#065f46" },
  SERVICE:    { bg: "#ffe4e6", fg: "#9f1239" },
  Vrac:       { bg: "#ffedd5", fg: "#7c2d12" },
};
function catColor(type?: string | null) {
  return CATALOGUE_COLORS[type ?? ""] ?? { bg: "#f3f4f6", fg: "#6b7280" };
}

function fmtP(val: string | null | undefined): string | null {
  if (!val) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : fmtNum(val, CURRENCY);
}

// ─── filter state ─────────────────────────────────────────────────────────────
const EMPTY_FILTERS = {
  name: "", code: "", brand: "", family: "", stock: "",
  id: "", ref: "", catalogueType: "", description: "", model: "", color: "",
  exposed: "", active: "",
  price: "", priceGros: "", priceSemiGros: "", priceMin: "", costPrice: "",
} as const;
type Filters = typeof EMPTY_FILTERS;
type FilterKey = keyof Filters;

const PAGE_SIZE = 20;

// ─── action sheet (cross-platform) ───────────────────────────────────────────
function showActionMenu(
  title: string,
  actions: { label: string; destructive?: boolean; onPress: () => void }[],
) {
  if (Platform.OS === "ios") {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...actions.map((a) => a.label), "إلغاء"],
        cancelButtonIndex: actions.length,
        destructiveButtonIndex: actions.findIndex((a) => a.destructive),
      },
      (i) => { if (i < actions.length) actions[i].onPress(); },
    );
  } else {
    Alert.alert(
      title,
      undefined,
      [
        ...actions.map((a) => ({
          text: a.label,
          style: (a.destructive ? "destructive" : "default") as "destructive" | "default",
          onPress: a.onPress,
        })),
        { text: "إلغاء", style: "cancel" as const },
      ],
    );
  }
}

// ─── PriceCell ────────────────────────────────────────────────────────────────
type Colors = ReturnType<typeof useColors>;
function PriceCell({ label, value, bold, c }: { label: string; value: string | null; bold?: boolean; c: Colors }) {
  if (!value) return null;
  return (
    <View style={styles.priceCell}>
      <Text style={[styles.priceLbl, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.priceVal, { color: bold ? c.primary : c.text }, bold ? styles.priceBold : undefined]}>
        {value}
      </Text>
    </View>
  );
}

// ─── ProductCard ──────────────────────────────────────────────────────────────
function ProductCard({
  product, isLow, serverUrl, exposedOverride,
  onEdit, onDuplicate, onDelete, onToggleExposed,
}: {
  product: Product;
  isLow: boolean;
  serverUrl: string | null;
  exposedOverride: boolean | undefined;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleExposed: () => void;
}) {
  const c = useColors();
  const isExposed = exposedOverride !== undefined ? exposedOverride : (product.isExposed ?? false);
  const isActive  = product.isActive !== false;
  const stock     = product.stock ?? 0;
  const stockColor = stock === 0 ? c.danger : stock < 5 ? c.warning : c.success;
  const imgSrc = resolveImg(product.imageUrl, serverUrl);
  const cat = catColor(product.catalogueType);

  const openMenu = () =>
    showActionMenu(product.nameEn ?? product.nameAr ?? "المنتج", [
      { label: "✏️  تعديل",                           onPress: onEdit },
      { label: isExposed ? "🙈  إخفاء من الواجهة" : "👁  إظهار في الواجهة", onPress: onToggleExposed },
      { label: "📋  نسخ (Dupliquer)",                  onPress: onDuplicate },
      { label: "🗑  حذف",                              onPress: onDelete, destructive: true },
    ]);

  return (
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [styles.card, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.87 : 1 }]}
    >
      {/* ── row 1: image · info · controls ── */}
      <View style={styles.cardTop}>
        {imgSrc ? (
          <Image source={{ uri: imgSrc }} style={[styles.thumb, { borderColor: c.border }]} resizeMode="cover" />
        ) : (
          <View style={[styles.thumbPh, { backgroundColor: c.inputBg, borderColor: c.border }]}>
            <Ionicons name="image-outline" size={22} color={c.textMuted} />
          </View>
        )}

        <View style={styles.mainInfo}>
          {/* ref + catalogue badge */}
          <View style={styles.refRow}>
            {product.reference ? (
              <Text style={[styles.refText, { color: c.textMuted }]}>{product.reference}</Text>
            ) : null}
            <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
              <Text style={[styles.catText, { color: cat.fg }]}>{product.catalogueType ?? "ARTICLE"}</Text>
            </View>
          </View>
          {/* nameEn (bold) + nameAr */}
          <Text style={[styles.nameEn, { color: c.text }]} numberOfLines={2}>
            {product.nameEn || "—"}
          </Text>
          {product.nameAr ? (
            <Text style={[styles.nameAr, { color: c.textMuted }]} numberOfLines={1}>{product.nameAr}</Text>
          ) : null}
        </View>

        {/* vitrine toggle + menu */}
        <View style={styles.cardControls}>
          <Pressable
            onPress={onToggleExposed}
            hitSlop={6}
            style={[styles.vitrineBtn, { backgroundColor: isExposed ? "#d1fae5" : c.inputBg }]}
          >
            <Ionicons name={isExposed ? "eye" : "eye-off-outline"} size={16} color={isExposed ? "#065f46" : c.textMuted} />
          </Pressable>
          <Pressable onPress={openMenu} hitSlop={6} style={styles.menuBtn}>
            <Ionicons name="ellipsis-vertical" size={18} color={c.textMuted} />
          </Pressable>
        </View>
      </View>

      {/* ── row 2: barcode · brand · model · color ── */}
      {(product.barcode || product.brand || product.model || product.color) ? (
        <View style={styles.metaRow}>
          {product.barcode ? (
            <View style={styles.metaChip}>
              <Ionicons name="barcode-outline" size={11} color={c.textMuted} />
              <Text style={[styles.metaMono, { color: c.textMuted }]}>{product.barcode}</Text>
            </View>
          ) : null}
          {product.brand ? (
            <View style={styles.metaChip}>
              <Text style={[styles.metaLbl, { color: c.textMuted }]}>Marque:</Text>
              <Text style={[styles.metaVal, { color: c.text }]}>{product.brand}</Text>
            </View>
          ) : null}
          {product.model ? (
            <View style={styles.metaChip}>
              <Text style={[styles.metaLbl, { color: c.textMuted }]}>Modèle:</Text>
              <Text style={[styles.metaVal, { color: c.text }]}>{product.model}</Text>
            </View>
          ) : null}
          {product.color ? (
            <View style={styles.metaChip}>
              <Text style={[styles.metaLbl, { color: c.textMuted }]}>Couleur:</Text>
              <Text style={[styles.metaVal, { color: c.text }]}>{product.color}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── row 3: status badges ── */}
      <View style={styles.statusRow}>
        <View style={[styles.badge, { backgroundColor: isActive ? "#e0f2fe" : "#fee2e2" }]}>
          <Text style={[styles.badgeTxt, { color: isActive ? "#0369a1" : "#b91c1c" }]}>
            {isActive ? "نشط" : "غير نشط"}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: isExposed ? "#d1fae5" : "#f3f4f6" }]}>
          <Text style={[styles.badgeTxt, { color: isExposed ? "#065f46" : "#6b7280" }]}>
            {isExposed ? "مرئي" : "مخفي"}
          </Text>
        </View>
        {stock === 0 ? (
          <View style={[styles.badge, { backgroundColor: "#fee2e2" }]}>
            <Text style={[styles.badgeTxt, { color: "#b91c1c" }]}>نفد</Text>
          </View>
        ) : isLow ? (
          <View style={[styles.badge, { backgroundColor: "#fef3c7" }]}>
            <Text style={[styles.badgeTxt, { color: "#92400e" }]}>منخفض</Text>
          </View>
        ) : null}
      </View>

      {/* ── row 4: prices + stock ── */}
      <View style={[styles.priceRow, { borderTopColor: c.border }]}>
        <View style={styles.pricesGrid}>
          <PriceCell label="PU Détail"  value={fmtP(product.price)}         bold c={c} />
          <PriceCell label="PU Gros"    value={fmtP(product.priceGros)}      c={c} />
          <PriceCell label="PU S.Gros"  value={fmtP(product.priceSemiGros)}  c={c} />
          <PriceCell label="Prix Min"   value={fmtP(product.priceMin)}       c={c} />
          <PriceCell label="Coût"       value={fmtP(product.costPrice)}      c={c} />
        </View>
        <View style={styles.stockBox}>
          <Text style={[styles.stockNum, { color: stockColor }]}>{fmtInt(stock)}</Text>
          <Text style={[styles.stockLbl, { color: c.textMuted }]}>Stock</Text>
          {(product.colisage ?? 1) > 1 ? (
            <Text style={[styles.colisage, { color: c.textMuted }]}>×{product.colisage}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ─── FilterPanel ──────────────────────────────────────────────────────────────
function FilterPanel({
  visible, filters, onChange, onClear, onClose, c,
}: {
  visible: boolean;
  filters: Filters;
  onChange: (k: FilterKey, v: string) => void;
  onClear: () => void;
  onClose: () => void;
  c: Colors;
}) {
  const hasFilters = Object.values(filters).some(Boolean);

  function Field({ fkey, placeholder }: { fkey: FilterKey; placeholder: string }) {
    return (
      <View style={styles.ffField}>
        <Text style={[styles.ffLabel, { color: c.textMuted }]}>{placeholder}</Text>
        <TextInput
          value={filters[fkey]}
          onChangeText={(v) => onChange(fkey, v)}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          style={[styles.ffInput, { backgroundColor: c.inputBg, borderColor: c.border, color: c.text }]}
        />
      </View>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: c.surface }]}>
          <View style={[styles.sheetHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>الفلاتر</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {hasFilters ? (
                <Pressable onPress={onClear} style={[styles.clearBtn, { borderColor: "#f59e0b" }]}>
                  <Text style={{ color: "#b45309", fontSize: 13 }}>مسح الكل</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={24} color={c.text} />
              </Pressable>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
            <Field fkey="name"         placeholder="الاسم / Désignation" />
            <Field fkey="ref"          placeholder="المرجع / Réf." />
            <Field fkey="code"         placeholder="الكود / Code-barres" />
            <Field fkey="brand"        placeholder="الماركة / Marque" />
            <Field fkey="model"        placeholder="الموديل / Modèle" />
            <Field fkey="color"        placeholder="اللون / Couleur" />
            <Field fkey="catalogueType"placeholder="النوع: ARTICLE / PRODUITS / APPAREIL…" />
            <Field fkey="family"       placeholder="العائلة / Famille" />
            <Field fkey="stock"        placeholder="المخزون: min:5 أو max:10" />
            <Field fkey="price"        placeholder="PU Détail" />
            <Field fkey="priceGros"    placeholder="PU Gros" />
            <Field fkey="priceSemiGros"placeholder="PU S.Gros" />
            <Field fkey="priceMin"     placeholder="Prix Min" />
            <Field fkey="costPrice"    placeholder="Coût" />
            <Field fkey="exposed"      placeholder="مرئي / Exposé: true | false" />
            <Field fkey="active"       placeholder="نشط / Actif: true | false" />
          </ScrollView>
          <Pressable onPress={onClose} style={[styles.applyBtn, { backgroundColor: c.primary }]}>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>تطبيق</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, onPage, c }: {
  page: number; totalPages: number; total: number; onPage: (p: number) => void; c: Colors;
}) {
  const pages = useMemo<(number | "...")[]>(() => {
    const arr: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) arr.push(i);
    } else {
      arr.push(1);
      if (page > 3) arr.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) arr.push(i);
      if (page < totalPages - 2) arr.push("...");
      arr.push(totalPages);
    }
    return arr;
  }, [page, totalPages]);

  return (
    <View style={[styles.pag, { borderTopColor: c.border }]}>
      <Text style={[styles.pagInfo, { color: c.textMuted }]}>
        {total === 0
          ? "لا توجد نتائج"
          : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} من ${fmtInt(total)}`}
      </Text>
      <View style={styles.pagBtns}>
        <Pressable
          onPress={() => onPage(Math.max(1, page - 1))}
          disabled={page === 1}
          style={[styles.pagBtn, { backgroundColor: c.inputBg, borderColor: c.border }, page === 1 && { opacity: 0.35 }]}
        >
          <Ionicons name="chevron-back" size={16} color={c.text} />
        </Pressable>
        {pages.map((pg, i) =>
          pg === "..." ? (
            <Text key={`d${i}`} style={[styles.pagDots, { color: c.textMuted }]}>…</Text>
          ) : (
            <Pressable
              key={pg}
              onPress={() => onPage(pg as number)}
              style={[
                styles.pagBtn,
                pg === page
                  ? { backgroundColor: c.primary, borderColor: c.primary }
                  : { backgroundColor: c.inputBg, borderColor: c.border },
              ]}
            >
              <Text style={[styles.pagBtnTxt, { color: pg === page ? "#fff" : c.text }]}>{pg}</Text>
            </Pressable>
          ),
        )}
        <Pressable
          onPress={() => onPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          style={[styles.pagBtn, { backgroundColor: c.inputBg, borderColor: c.border }, page === totalPages && { opacity: 0.35 }]}
        >
          <Ionicons name="chevron-forward" size={16} color={c.text} />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function ProductsScreen() {
  const c = useColors();
  const { user } = useAuth();
  const { serverUrl } = useServerConfig();
  const isAdmin = user?.role === "admin";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [debouncedFilters, setDebouncedFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [filterOpen, setFilterOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const [exposedMap, setExposedMap] = useState<Map<number, boolean>>(new Map());

  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createProduct = useCreateProduct();

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 600);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedFilters(filters); setPage(1); }, 600);
    return () => clearTimeout(t);
  }, [filters]);

  const hasFilters = Object.values(filters).some(Boolean);

  const productsQuery = useGetProducts({
    page,
    limit: PAGE_SIZE,
    search:              debouncedSearch || undefined,
    filterName:          debouncedFilters.name || undefined,
    filterCode:          debouncedFilters.code || undefined,
    filterBrand:         debouncedFilters.brand || undefined,
    filterFamily:        debouncedFilters.family || undefined,
    filterStock:         debouncedFilters.stock || undefined,
    filterId:            debouncedFilters.id || undefined,
    filterRef:           debouncedFilters.ref || undefined,
    filterCatalogueType: debouncedFilters.catalogueType || undefined,
    filterDescription:   debouncedFilters.description || undefined,
    filterModel:         debouncedFilters.model || undefined,
    filterColor:         debouncedFilters.color || undefined,
    filterExposed:       debouncedFilters.exposed || undefined,
    filterActive:        debouncedFilters.active || undefined,
    filterPrice:         debouncedFilters.price || undefined,
    filterPriceGros:     debouncedFilters.priceGros || undefined,
    filterPriceSemiGros: debouncedFilters.priceSemiGros || undefined,
    filterPriceMin:      debouncedFilters.priceMin || undefined,
    filterCostPrice:     debouncedFilters.costPrice || undefined,
  });

  const lowStock = useGetLowStock();
  const lowIds = useMemo(() => new Set((lowStock.data ?? []).map((p) => p.id)), [lowStock.data]);
  const products = useMemo(() => productsQuery.data?.products ?? [], [productsQuery.data]);
  const total = productsQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // barcode API lookup (fallback when not found in current page)
  const barcodeQuery = useGetProducts(
    pendingBarcode ? { filterBarcode: pendingBarcode, limit: 1 } : undefined,
    { query: { enabled: !!pendingBarcode } },
  );

  const forceRefresh = useCallback(() => {
    void productsQuery.refetch();
    void lowStock.refetch();
  }, [productsQuery, lowStock]);

  const handleBarcodeScan = (code: string) => {
    setScannerOpen(false);
    navigatedRef.current = false;
    const norm = code.trim();
    const found = products.find(
      (p: any) => p.barcode === norm || p.reference === norm || String(p.id) === norm,
    );
    if (found) {
      navigatedRef.current = true;
      router.push({ pathname: "/product-form", params: { id: found.id } });
      return;
    }
    setPendingBarcode(norm);
  };

  useEffect(() => {
    if (!pendingBarcode || barcodeQuery.isLoading || navigatedRef.current) return;
    const found = (barcodeQuery.data?.products ?? [])[0];
    if (found) {
      navigatedRef.current = true;
      router.push({ pathname: "/product-form", params: { id: found.id } });
    } else {
      setSearch(pendingBarcode);
      if (Platform.OS !== "web") {
        Alert.alert("لم يُعثر على المنتج", `لا يوجد منتج بالباركود:\n${pendingBarcode}`);
      }
    }
    setPendingBarcode(null);
  }, [pendingBarcode, barcodeQuery.isLoading, barcodeQuery.data]);

  const getExposed = (p: Product) =>
    exposedMap.has(p.id) ? exposedMap.get(p.id)! : (p.isExposed ?? false);

  const toggleExposed = useCallback((p: Product) => {
    const newVal = !getExposed(p);
    setExposedMap((m) => new Map(m).set(p.id, newVal));
    updateProduct.mutate(
      { id: p.id, data: { isExposed: newVal } },
      {
        onSuccess: forceRefresh,
        onError: () => {
          setExposedMap((m) => { const n = new Map(m); n.delete(p.id); return n; });
          Alert.alert("خطأ", "فشل تحديث الرؤية");
        },
      },
    );
  }, [exposedMap, forceRefresh]);

  const handleDelete = useCallback((p: Product) => {
    Alert.alert(
      "حذف المنتج",
      `هل تريد حذف "${p.nameEn ?? p.nameAr}"؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "حذف", style: "destructive",
          onPress: () => deleteProduct.mutate({ id: p.id }, { onSettled: forceRefresh }),
        },
      ],
    );
  }, [forceRefresh]);

  const handleDuplicate = useCallback((p: Product) => {
    createProduct.mutate(
      {
        data: {
          nameEn: `${p.nameEn} (copie)`,
          nameAr: p.nameAr ?? undefined,
          price: p.price ?? "0",
          stock: 0,
          categoryId: p.categoryId ?? undefined,
          imageUrl: p.imageUrl ?? undefined,
          reference: p.reference ? `${p.reference}-COPY` : undefined,
          costPrice: p.costPrice ?? undefined,
          catalogueType: p.catalogueType ?? "ARTICLE",
          brand: p.brand ?? undefined,
          model: p.model ?? undefined,
          color: p.color ?? undefined,
          colisage: p.colisage ?? 1,
          weight: p.weight ?? undefined,
          priceGros: p.priceGros ?? undefined,
          priceSemiGros: p.priceSemiGros ?? undefined,
          priceMin: p.priceMin ?? undefined,
          isActive: p.isActive ?? true,
          isExposed: false,
        },
      },
      {
        onSuccess: () => { forceRefresh(); Alert.alert("تم النسخ", `تم نسخ: ${p.nameEn ?? p.nameAr}`); },
        onError: () => Alert.alert("خطأ", "فشل نسخ المنتج"),
      },
    );
  }, [forceRefresh]);

  const AddButton = isAdmin ? (
    <Pressable
      onPress={() => router.push("/product-form")}
      style={({ pressed }) => [styles.fabInHeader, { opacity: pressed ? 0.7 : 1 }]}
      hitSlop={8}
    >
      <Ionicons name="add" size={24} color="#ffffff" />
    </Pressable>
  ) : undefined;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <DrawerHeader title="المنتجات" subtitle="Articles" rightAction={AddButton} />

      {/* ── toolbar ── */}
      <View style={[styles.toolbar, { backgroundColor: c.background }]}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, { backgroundColor: c.inputBg, borderColor: c.border }]}>
            <Ionicons name="search-outline" size={18} color={c.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="ابحث عن منتج…"
              placeholderTextColor={c.textMuted}
              style={[styles.searchInput, { color: c.text }]}
            />
            {search ? (
              <Pressable onPress={() => setSearch("")} hitSlop={6}>
                <Ionicons name="close-circle" size={18} color={c.textMuted} />
              </Pressable>
            ) : null}
          </View>
          {/* filter button */}
          <Pressable
            onPress={() => setFilterOpen(true)}
            style={({ pressed }) => [
              styles.toolBtn,
              { backgroundColor: hasFilters ? "#fef3c7" : c.inputBg, borderColor: hasFilters ? "#f59e0b" : c.border, opacity: pressed ? 0.8 : 1 },
            ]}
            hitSlop={4}
          >
            <Ionicons name="options-outline" size={20} color={hasFilters ? "#b45309" : c.textMuted} />
            {hasFilters ? <View style={styles.filterDot} /> : null}
          </Pressable>
          {/* barcode scan */}
          <Pressable
            onPress={() => setScannerOpen(true)}
            style={({ pressed }) => [styles.toolBtn, { backgroundColor: c.primary, borderColor: c.primary, opacity: pressed ? 0.8 : 1 }]}
            hitSlop={4}
          >
            <Ionicons name="barcode-outline" size={20} color="#ffffff" />
          </Pressable>
        </View>

        <View style={styles.countRow}>
          {productsQuery.data ? (
            <Text style={[styles.countTxt, { color: c.textMuted }]}>{fmtInt(total)} منتج</Text>
          ) : null}
          {hasFilters ? (
            <Pressable onPress={() => setFilters({ ...EMPTY_FILTERS })} style={styles.clearFiltersBtn}>
              <Ionicons name="close-circle" size={13} color="#b45309" />
              <Text style={{ fontSize: 12, color: "#b45309" }}>مسح الفلاتر</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* ── content ── */}
      {productsQuery.isLoading ? (
        <LoadingState />
      ) : productsQuery.isError ? (
        <ErrorState onRetry={() => void productsQuery.refetch()} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              isLow={lowIds.has(item.id)}
              serverUrl={serverUrl}
              exposedOverride={exposedMap.get(item.id)}
              onEdit={() => router.push({ pathname: "/product-form", params: { id: item.id } })}
              onDuplicate={() => handleDuplicate(item)}
              onDelete={() => handleDelete(item)}
              onToggleExposed={() => toggleExposed(item)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState icon="cube-outline" message="لا توجد منتجات" />}
          refreshControl={
            <RefreshControl
              refreshing={productsQuery.isFetching && !productsQuery.isLoading}
              onRefresh={() => { void productsQuery.refetch(); void lowStock.refetch(); }}
              tintColor={c.primary}
            />
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} c={c} />
            ) : null
          }
        />
      )}

      {/* ── modals ── */}
      <FilterPanel
        visible={filterOpen}
        filters={filters}
        onChange={(k, v) => setFilters((f) => ({ ...f, [k]: v }))}
        onClear={() => setFilters({ ...EMPTY_FILTERS })}
        onClose={() => setFilterOpen(false)}
        c={c}
      />
      <BarcodeScannerModal
        visible={scannerOpen}
        onScanned={handleBarcodeScan}
        onClose={() => setScannerOpen(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:            { flex: 1 },
  fabInHeader:     { width: 36, height: 36, alignItems: "center", justifyContent: "center" },

  toolbar:         { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 },
  searchRow:       { flexDirection: "row", alignItems: "center", gap: 8 },
  searchBox:       { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  searchInput:     { flex: 1, fontSize: 15, textAlign: "right", height: "100%" as any },
  toolBtn:         { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  filterDot:       { position: "absolute", top: 7, right: 7, width: 7, height: 7, borderRadius: 4, backgroundColor: "#f59e0b" },
  countRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 5 },
  countTxt:        { fontSize: 12 },
  clearFiltersBtn: { flexDirection: "row", alignItems: "center", gap: 4 },

  list:            { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 40, gap: 12 },

  // card
  card:            { borderRadius: 16, borderWidth: 1, padding: 12, gap: 8 },
  cardTop:         { flexDirection: "row", gap: 10 },
  thumb:           { width: 64, height: 64, borderRadius: 10, borderWidth: 1 },
  thumbPh:         { width: 64, height: 64, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  mainInfo:        { flex: 1 },
  refRow:          { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 },
  refText:         { fontSize: 11, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  catBadge:        { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  catText:         { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  nameEn:          { fontSize: 14, fontWeight: "700", textAlign: "right", lineHeight: 20 },
  nameAr:          { fontSize: 12, textAlign: "right", marginTop: 1 },
  cardControls:    { alignItems: "center", gap: 6 },
  vitrineBtn:      { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  menuBtn:         { width: 30, height: 30, alignItems: "center", justifyContent: "center" },

  metaRow:         { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metaChip:        { flexDirection: "row", alignItems: "center", gap: 3 },
  metaMono:        { fontSize: 10, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
  metaLbl:         { fontSize: 10 },
  metaVal:         { fontSize: 10, fontWeight: "600" },

  statusRow:       { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge:           { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  badgeTxt:        { fontSize: 10, fontWeight: "600" },

  priceRow:        { flexDirection: "row", alignItems: "flex-start", borderTopWidth: 1, paddingTop: 8, gap: 8 },
  pricesGrid:      { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  priceCell:       { minWidth: 68 },
  priceLbl:        { fontSize: 9, textTransform: "uppercase", letterSpacing: 0.3 },
  priceVal:        { fontSize: 13, marginTop: 1, fontVariant: ["tabular-nums"] },
  priceBold:       { fontWeight: "800" },
  stockBox:        { alignItems: "center", minWidth: 52 },
  stockNum:        { fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"], lineHeight: 28 },
  stockLbl:        { fontSize: 10 },
  colisage:        { fontSize: 10 },

  // pagination
  pag:             { padding: 16, borderTopWidth: 1, gap: 10 },
  pagInfo:         { fontSize: 12, textAlign: "center" },
  pagBtns:         { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 4, flexWrap: "wrap" },
  pagBtn:          { width: 34, height: 34, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pagBtnTxt:       { fontSize: 13, fontWeight: "600" },
  pagDots:         { fontSize: 14, paddingHorizontal: 2 },

  // filter sheet
  overlay:         { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:           { borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "88%" },
  sheetHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  sheetTitle:      { fontSize: 18, fontWeight: "700" },
  clearBtn:        { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  sheetBody:       { padding: 16, gap: 12, paddingBottom: 8 },
  ffField:         { gap: 4 },
  ffLabel:         { fontSize: 12 },
  ffInput:         { height: 42, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontSize: 14 },
  applyBtn:        { margin: 16, marginTop: 8, height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
