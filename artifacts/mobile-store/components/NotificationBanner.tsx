import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNotifications, type WsNotification } from "@/context/NotificationsContext";
import { useColors } from "@/hooks/useColors";

export function NotificationBanner() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { latestBanner, clearBanner } = useNotifications();
  const translateY = useRef(new Animated.Value(-120)).current;
  const prevRef = useRef<WsNotification | null>(null);

  useEffect(() => {
    if (latestBanner && latestBanner !== prevRef.current) {
      prevRef.current = latestBanner;
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 10,
      }).start();
    } else if (!latestBanner) {
      Animated.timing(translateY, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [latestBanner, translateY]);

  if (!latestBanner) return null;

  const isOrder = latestBanner.type === "new_order";
  const topOffset = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isOrder ? colors.primary : colors.warning,
          top: topOffset + 8,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.iconWrap}>
        <Feather
          name={isOrder ? "shopping-bag" : "alert-triangle"}
          size={18}
          color="#fff"
        />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{latestBanner.title}</Text>
        <Text style={styles.body} numberOfLines={1}>{latestBanner.body}</Text>
      </View>
      <Pressable onPress={clearBanner} style={styles.closeBtn}>
        <Feather name="x" size={16} color="rgba(255,255,255,0.8)" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  body: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
});
