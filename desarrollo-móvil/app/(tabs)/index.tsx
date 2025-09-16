// app/(tabs)/index.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Link } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Gyroscope } from "expo-sensors";

const Card = ({ children }: { children: React.ReactNode }) => (
  <View style={styles.card}>{children}</View>
);

export default function HomeScreen() {
  const [best, setBest] = useState<number | null>(null);
  const [gyro, setGyro] = useState({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem("@best_time_ms");
      if (raw) setBest(Number(raw));
    })();
  }, []);

  useEffect(() => {
    Gyroscope.setUpdateInterval(200);
    const sub = Gyroscope.addListener((g) => setGyro({ x: g.x, y: g.y, z: g.z }));
    return () => sub.remove();
  }, []);

  const msToS = (ms: number) => (ms / 1000).toFixed(2) + "s";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>¡Bienvenido! 👋</Text>
      <Text style={styles.subtitle}>Explorá los sensores del dispositivo</Text>

      <View style={styles.grid}>
        <Link href="/(tabs)/motion" asChild>
          <Pressable style={styles.button}>
            <Text style={styles.buttonTitle}>Jugar: Movimiento</Text>
            <Text style={styles.buttonDesc}>Equilibra la pelota con el giroscopio</Text>
          </Pressable>
        </Link>

        <Card>
          <Text style={styles.cardTitle}>Giroscopio en vivo</Text>
          <Text style={styles.cardBody}>
            x: {gyro.x.toFixed(2)} | y: {gyro.y.toFixed(2)} | z: {gyro.z.toFixed(2)}
          </Text>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Tu mejor tiempo</Text>
          <Text style={styles.bestTime}>{best ? msToS(best) : "—"}</Text>
          <Text style={styles.cardHint}>¡Mejoralo jugando otra vez!</Text>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40, paddingHorizontal: 16 },
  title: { fontSize: 24, fontWeight: "bold" },
  subtitle: { fontSize: 16, color: "#555", marginBottom: 16 },
  grid: { gap: 12 },
  button: {
    backgroundColor: "#2e7d32",
    borderRadius: 16,
    padding: 16,
  },
  buttonTitle: { color: "white", fontSize: 18, fontWeight: "700" },
  buttonDesc: { color: "white", opacity: 0.9, marginTop: 4 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  cardBody: { fontSize: 14, color: "#333" },
  bestTime: { fontSize: 28, fontWeight: "800", color: "#1e88e5" },
  cardHint: { fontSize: 12, color: "#777" },
});
