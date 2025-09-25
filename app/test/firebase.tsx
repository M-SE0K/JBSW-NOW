import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { getApps } from "firebase/app";
import "../../src/db/firebase";

export default function FirebaseTestPage() {
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [docData, setDocData] = useState<any>(null);

  const checkInit = () => {
    try {
      const apps = getApps();
      setStatus(apps.length > 0 ? `Firebase initialized (${apps[0].name})` : "No Firebase app");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  const writeAndRead = async () => {
    setError("");
    setDocData(null);
    try {
      const db = getFirestore();
      const ref = doc(db, "_healthcheck", "test");
      await setDoc(ref, { ok: true, at: serverTimestamp() }, { merge: true });
      const snap = await getDoc(ref);
      setDocData(snap.exists() ? snap.data() : null);
      setStatus("Firestore write/read OK");
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>Firebase 연결 테스트</Text>
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        <Pressable onPress={checkInit} style={{ padding: 12, backgroundColor: "#cfe", borderRadius: 8 }}>
          <Text>초기화 상태 확인</Text>
        </Pressable>
        <Pressable onPress={writeAndRead} style={{ padding: 12, backgroundColor: "#def", borderRadius: 8 }}>
          <Text>Firestore 쓰고 읽기</Text>
        </Pressable>
      </View>
      {!!status && <Text style={{ marginTop: 12, color: "#333" }}>{status}</Text>}
      {!!error && <Text style={{ marginTop: 12, color: "red" }}>{error}</Text>}
      {!!docData && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: "700" }}>문서 데이터</Text>
          <Text style={{ marginTop: 8 }}>{JSON.stringify(docData, null, 2)}</Text>
        </View>
      )}
    </ScrollView>
  );
}


