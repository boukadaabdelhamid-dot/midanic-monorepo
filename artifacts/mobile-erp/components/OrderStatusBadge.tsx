import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { OrderStatus } from "@workspace/api-client-react";
import { useLang } from "@/context/LanguageContext";

const STATUS_CONFIG: Record<
  string,
  { bgColor: string; textColor: string; arLabel: string; enLabel: string }
> = {
  pending: { bgColor: "#FEF3C7", textColor: "#D97706", arLabel: "قيد الانتظار", enLabel: "Pending" },
  processing: { bgColor: "#DBEAFE", textColor: "#2563EB", arLabel: "قيد المعالجة", enLabel: "Processing" },
  shipped: { bgColor: "#E0E7FF", textColor: "#7C3AED", arLabel: "تم الشحن", enLabel: "Shipped" },
  delivered: { bgColor: "#D1FAE5", textColor: "#059669", arLabel: "تم التوصيل", enLabel: "Delivered" },
  cancelled: { bgColor: "#FEE2E2", textColor: "#DC2626", arLabel: "ملغي", enLabel: "Cancelled" },
};

interface OrderStatusBadgeProps {
  status: OrderStatus | string;
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const { t } = useLang();
  const config = STATUS_CONFIG[status] ?? {
    bgColor: "#F3F4F6",
    textColor: "#6B7280",
    arLabel: status,
    enLabel: status,
  };

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }]}>
      <Text style={[styles.label, { color: config.textColor }]}>
        {t(config.arLabel, config.enLabel)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});
