import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

/**
 * Cross-platform secure key/value storage for sensitive values (e.g. the JWT).
 *
 * On native (iOS/Android) this is backed by the OS Keychain / Keystore via
 * `expo-secure-store`. On web — where SecureStore is unavailable — it falls
 * back to AsyncStorage (localStorage), which matches the web ERP/store
 * convention of keeping the token in `localStorage`.
 */

const isWeb = Platform.OS === "web";

export async function setSecureItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (isWeb) {
      return await AsyncStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    if (isWeb) {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* no-op: a missing key is fine */
  }
}
