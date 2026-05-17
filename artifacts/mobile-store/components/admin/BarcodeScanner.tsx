import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useLang } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CameraMod = any;

interface CameraSurfaceProps {
  mod: CameraMod;
  onScanned: (code: string) => void;
}

function CameraSurface({ mod, onScanned }: CameraSurfaceProps) {
  const { t } = useLang();
  const [permission, requestPermission] = mod.useCameraPermissions();
  const lockRef = React.useRef(false);
  const CameraView = mod.CameraView;

  React.useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={styles.fallback}>
        <Feather name="camera" size={36} color="#fff" />
        <Text style={styles.fallbackText}>{t("جارٍ التحميل…", "Loading…")}</Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.fallback}>
        <Feather name="camera-off" size={36} color="#fff" />
        <Text style={styles.fallbackText}>{t("لا يوجد إذن للكاميرا", "Camera permission denied")}</Text>
        <Pressable style={styles.permBtn} onPress={() => requestPermission()}>
          <Text style={styles.permBtnText}>{t("منح الإذن", "Grant permission")}</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "qr", "code128", "code39", "upc_a", "upc_e"] }}
      onBarcodeScanned={(r: { data: string }) => {
        if (lockRef.current) return;
        lockRef.current = true;
        onScanned(r.data);
      }}
    />
  );
}

export function BarcodeScanner({ visible, onClose, onScanned }: BarcodeScannerProps) {
  const colors = useColors();
  const { t } = useLang();
  const [manual, setManual] = React.useState("");
  const [cameraMod, setCameraMod] = React.useState<CameraMod | null>(null);
  const [hasScanned, setHasScanned] = React.useState(false);
  const isWeb = Platform.OS === "web";

  React.useEffect(() => {
    if (visible) {
      setManual("");
      setHasScanned(false);
    }
  }, [visible]);

  React.useEffect(() => {
    if (!visible || isWeb || cameraMod) return;
    let alive = true;
    (async () => {
      try {
        const mod = await import("expo-camera");
        if (alive) setCameraMod(mod);
      } catch {
        // keep manual fallback
      }
    })();
    return () => { alive = false; };
  }, [visible, isWeb, cameraMod]);

  const submit = (code: string) => {
    const c = code.trim();
    if (!c || hasScanned) return;
    setHasScanned(true);
    onScanned(c);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Feather name="x" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.title}>{t("مسح الباركود", "Scan Barcode")}</Text>
          <View style={{ width: 32 }} />
        </View>

        <View style={styles.cameraWrap}>
          {!isWeb && cameraMod ? (
            <CameraSurface mod={cameraMod} onScanned={submit} />
          ) : (
            <View style={styles.fallback}>
              <Feather name="camera-off" size={36} color="#fff" />
              <Text style={styles.fallbackText}>
                {isWeb
                  ? t("الكاميرا غير مدعومة هنا", "Camera not supported here")
                  : t("جارٍ تجهيز الكاميرا…", "Preparing camera…")}
              </Text>
            </View>
          )}
          <View style={styles.frame} pointerEvents="none" />
        </View>

        <View style={[styles.footer, { backgroundColor: colors.card }]}>
          <Text style={[styles.footerLabel, { color: colors.mutedForeground }]}>
            {t("أو أدخل يدويًا", "Or enter manually")}
          </Text>
          <View style={[styles.inputRow, { borderColor: colors.border }]}>
            <TextInput
              value={manual}
              onChangeText={setManual}
              placeholder="EAN-13 / SKU"
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={() => submit(manual)}
            />
            <Pressable
              style={[styles.goBtn, { backgroundColor: colors.primary }]}
              onPress={() => submit(manual)}
            >
              <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "space-between", backgroundColor: "rgba(0,0,0,0.85)" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingTop: 60, paddingBottom: 14 },
  title: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  cameraWrap: { flex: 1, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  frame: { width: "70%", aspectRatio: 1.4, borderWidth: 2, borderColor: "#fff", borderRadius: 12, opacity: 0.7 },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 12 },
  fallbackText: { color: "#fff", fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center", paddingHorizontal: 30 },
  permBtn: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, backgroundColor: "#fff" },
  permBtnText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  footer: { padding: 16, gap: 8, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  footerLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputRow: { flexDirection: "row", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, alignItems: "center", gap: 8 },
  input: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", paddingVertical: 10 },
  goBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
