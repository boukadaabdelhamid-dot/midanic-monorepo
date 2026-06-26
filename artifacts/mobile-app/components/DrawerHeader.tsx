import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";
import { useColors } from "@/hooks/useColors";

type DrawerHeaderProps = {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function DrawerHeader({ title, subtitle, rightAction, style }: DrawerHeaderProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const webInset = Platform.OS === "web" ? 12 : 0;

  const openDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.primaryDeep,
          paddingTop: insets.top + webInset + 10,
          paddingBottom: 12,
          borderBottomColor: "rgba(255,255,255,0.08)",
        },
        style,
      ]}
    >
      <Pressable
        onPress={openDrawer}
        style={({ pressed }) => [styles.menuBtn, { opacity: pressed ? 0.6 : 1 }]}
        hitSlop={10}
      >
        <Ionicons name="menu" size={26} color="#FFFFFF" />
      </Pressable>

      <View style={styles.titleWrap}>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.right}>
        {rightAction ?? <View style={{ width: 38 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
  },
  subtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
    textAlign: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },
  right: {
    width: 38,
    alignItems: "flex-end",
  },
});
