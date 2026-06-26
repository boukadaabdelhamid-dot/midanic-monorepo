import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { useServerConfig } from "@/context/ServerConfigContext";
import { useAuth } from "@/context/AuthContext";
import { palette } from "@/constants/brand";

export default function Index() {
  const { serverUrl, isLoading: serverLoading } = useServerConfig();
  const {
    isLoading: authLoading,
    isAuthenticated,
    needsStoreSelection,
  } = useAuth();

  if (serverLoading || authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: palette.navy }]}>
        <Image
          source={require("@/assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <ActivityIndicator color="#FFFFFF" style={{ marginTop: 24 }} />
      </View>
    );
  }

  if (!serverUrl) return <Redirect href="/onboarding" />;
  if (!isAuthenticated) return <Redirect href="/login" />;
  if (needsStoreSelection) return <Redirect href="/select-store" />;
  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 28,
  },
});
