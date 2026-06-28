import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useColors } from "@/hooks/useColors";

type Props = {
  visible: boolean;
  onScanned: (code: string) => void;
  onClose: () => void;
};

function WebInputFallback({ onScanned, onClose }: Pick<Props, "onScanned" | "onClose">) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");

  const handleConfirm = () => {
    if (code.trim()) {
      onScanned(code.trim());
      setCode("");
    }
  };

  return (
    <View style={[styles.webOverlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
      <View style={[styles.webCard, { backgroundColor: c.surface, marginTop: insets.top + 80 }]}>
        <View style={styles.webHeader}>
          <Text style={[styles.webTitle, { color: c.text }]}>مسح الباركود</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={c.textMuted} />
          </Pressable>
        </View>
        <Text style={[styles.webHint, { color: c.textMuted }]}>
          أدخل رمز الباركود يدوياً
        </Text>
        <View style={[styles.webInputWrap, { backgroundColor: c.inputBg, borderColor: c.border }]}>
          <Ionicons name="barcode-outline" size={20} color={c.textMuted} />
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="رمز الباركود…"
            placeholderTextColor={c.textMuted}
            autoFocus
            onSubmitEditing={handleConfirm}
            returnKeyType="search"
            style={[styles.webInput, { color: c.text }]}
          />
          {code ? (
            <Pressable onPress={() => setCode("")}>
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [styles.webConfirmBtn, { backgroundColor: c.primary, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.webConfirmText}>بحث</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PermissionDenied({ onRequest, onClose }: { onRequest: () => void; onClose: () => void }) {
  const c = useColors();
  return (
    <View style={[styles.permScreen, { backgroundColor: "#000" }]}>
      <Pressable onPress={onClose} style={styles.closeBtn}>
        <Ionicons name="close" size={28} color="#FFF" />
      </Pressable>
      <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,0.5)" />
      <Text style={styles.permTitle}>يلزم الوصول للكاميرا</Text>
      <Text style={styles.permHint}>السماح لتطبيق ميدانيك بالوصول إلى الكاميرا لمسح الباركود</Text>
      <Pressable
        onPress={onRequest}
        style={[styles.permBtn, { backgroundColor: c.primary }]}
      >
        <Text style={styles.permBtnText}>السماح</Text>
      </Pressable>
    </View>
  );
}

export function BarcodeScannerModal({ visible, onScanned, onClose }: Props) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const scannedRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (visible) {
      scannedRef.current = false;
    }
  }, [visible]);

  const handleBarcodeScanned = ({ data }: BarcodeScanningResult) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    onScanned(data);
  };

  if (!visible) return null;

  if (Platform.OS === "web") {
    return <WebInputFallback onScanned={onScanned} onClose={onClose} />;
  }

  if (!permission?.granted) {
    return (
      <Modal visible animationType="fade" statusBarTranslucent>
        <PermissionDenied onRequest={requestPermission} onClose={onClose} />
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" statusBarTranslucent>
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "code128", "code39", "code93", "upc_a", "upc_e", "itf14", "pdf417"],
          }}
        />

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={12}>
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>
          <Text style={styles.topTitle}>مسح الباركود</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.reticle}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom}>
            <Text style={styles.scanHint}>وجّه الكاميرا نحو الباركود</Text>
            <Text style={styles.scanHintSub}>سيتم المسح تلقائياً</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const RETICLE_SIZE = 260;
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;
const CORNER_COLOR = "#FFFFFF";

const styles = StyleSheet.create({
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  topBar: {
    position: "absolute", top: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 10,
  },
  topTitle: { color: "#FFF", fontSize: 17, fontWeight: "700" },
  closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  overlayTop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  overlayMiddle: { flexDirection: "row", height: RETICLE_SIZE },
  overlaySide: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
  reticle: {
    width: RETICLE_SIZE,
    height: RETICLE_SIZE,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: CORNER_COLOR,
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
  },
  overlayBottom: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "flex-start", paddingTop: 28,
  },
  scanHint: { color: "#FFF", fontSize: 18, fontWeight: "700", textAlign: "center" },
  scanHintSub: { color: "rgba(255,255,255,0.7)", fontSize: 14, marginTop: 8, textAlign: "center" },
  permScreen: {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: 16, padding: 40,
  },
  permTitle: { color: "#FFF", fontSize: 20, fontWeight: "700", textAlign: "center" },
  permHint: { color: "rgba(255,255,255,0.7)", fontSize: 14, textAlign: "center", lineHeight: 22 },
  permBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  permBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  webOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  webCard: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  webHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  webTitle: { fontSize: 18, fontWeight: "700" },
  webHint: { fontSize: 14, textAlign: "right" },
  webInputWrap: {
    flexDirection: "row", alignItems: "center", gap: 10,
    height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14,
  },
  webInput: { flex: 1, fontSize: 16, textAlign: "right" },
  webConfirmBtn: { height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  webConfirmText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
