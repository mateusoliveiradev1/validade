import { HEALTH_SERVICE_NAME } from "@validade-zero/contracts";
import { StyleSheet, Text, View } from "react-native";

export const MOBILE_SMOKE_COPY = [
  "Validade Zero",
  "Nenhum dado real neste ambiente",
  "Checagem de base pronta",
] as const;

export default function App() {
  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>Smoke mobile seguro</Text>
      <Text style={styles.title}>{MOBILE_SMOKE_COPY[0]}</Text>
      <Text style={styles.body}>{MOBILE_SMOKE_COPY[1]}</Text>
      <Text style={styles.status}>{MOBILE_SMOKE_COPY[2]}</Text>
      <Text style={styles.contract}>Contrato compartilhado: {HEALTH_SERVICE_NAME}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    gap: 12,
    padding: 24,
    backgroundColor: "#f5f7ef",
  },
  eyebrow: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    color: "#112016",
    fontSize: 40,
    fontWeight: "800",
  },
  body: {
    color: "#26382c",
    fontSize: 18,
  },
  status: {
    alignSelf: "flex-start",
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#f9fff6",
    backgroundColor: "#166534",
    fontSize: 16,
    fontWeight: "700",
  },
  contract: {
    color: "#4b5f51",
    fontSize: 14,
  },
});
