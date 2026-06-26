import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetLowStock,
  useGetProducts,
  type Product,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  Pill,
} from "@/components/ErpUi";
import { CURRENCY, fmtInt, fmtNum } from "@/lib/format";

const WEB_TOP_INSET = Platform.OS === "web" ? 67 : 0;
const PAGE_LIMIT = 50;

function ProductRow({
  product,
  isLow,
}: {
  product: Product;
  isLow: boolean;
}) {
  const c = useColors();
  const name = product.nameAr || product.nameEn;
  const ref = product.reference || product.barcode;
  const stockColor =
    product.stock <= 0 ? c.danger : isLow ? c.warning : c.success;

  return (
    <View
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <View style={styles.cardMain}>
        <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {name}
        </Text>
        {ref ? (
          <Text style={[styles.ref, { color: c.textMuted }]} numberOfLines={1}>
            {ref}
          </Text>
        ) : null}
        <Text style={[styles.price, { color: c.primaryTint }]}>
          {fmtNum(product.price, CURRENCY)}
        </Text>
      </View>

      <View style={styles.stockBox}>
        <Text style={[styles.stockNum, { color: stockColor }]}>
          {fmtInt(product.stock)}
        </Text>
        <Text style={[styles.stockLabel, { color: c.textMuted }]}>المخزون</Text>
        {product.stock <= 0 ? (
          <Pill label="نفد" color={c.danger} />
        ) : isLow ? (
          <Pill label="منخفض" color={c.warning} />
        ) : null}
      </View>
    </View>
  );
}

export default function Products() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState<string>("");

  const products = useGetProducts({ limit: PAGE_LIMIT, search: search || undefined });
  const lowStock = useGetLowStock();

  const lowStockIds = useMemo(
    () => new Set((lowStock.data ?? []).map((p) => p.id)),
    [lowStock.data],
  );

  const items = useMemo(
    () => products.data?.products ?? [],
    [products.data],
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <View style={{ paddingTop: insets.top + WEB_TOP_INSET + 20 }}>
        <Text style={[styles.title, { color: c.text }]}>المنتجات والمخزون</Text>

        <View
          style={[
            styles.searchBox,
            { backgroundColor: c.inputBg, borderColor: c.border },
          ]}
        >
          <Ionicons name="search" size={18} color={c.textMuted} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث عن منتج…"
            placeholderTextColor={c.textMuted}
            style={[styles.searchInput, { color: c.text }]}
            returnKeyType="search"
          />
          {search ? (
            <Ionicons
              name="close-circle"
              size={18}
              color={c.textMuted}
              onPress={() => setSearch("")}
            />
          ) : null}
        </View>

        {products.data ? (
          <Text style={[styles.countHint, { color: c.textMuted }]}>
            {fmtInt(products.data.total)} منتج
          </Text>
        ) : null}
      </View>

      {products.isLoading ? (
        <LoadingState />
      ) : products.isError ? (
        <ErrorState onRetry={() => void products.refetch()} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <ProductRow product={item} isLow={lowStockIds.has(item.id)} />
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyState icon="cube-outline" message="لا توجد منتجات" />
          }
          refreshControl={
            <RefreshControl
              refreshing={products.isFetching}
              onRefresh={() => {
                void products.refetch();
                void lowStock.refetch();
              }}
              tintColor={c.primary}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    marginBottom: 16,
    textAlign: "right",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    textAlign: "right",
    height: "100%",
  },
  countHint: {
    fontSize: 13,
    marginTop: 10,
    textAlign: "right",
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  cardMain: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  ref: {
    fontSize: 12,
    marginTop: 3,
    textAlign: "right",
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 8,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  stockBox: {
    alignItems: "center",
    gap: 4,
    minWidth: 64,
  },
  stockNum: {
    fontSize: 22,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  stockLabel: {
    fontSize: 11,
  },
});
