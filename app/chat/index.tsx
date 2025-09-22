import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, Button, useColorScheme, ScrollView } from "react-native";
import { askChat } from "../../src/api/chat";

type Msg = { role: "user" | "bot"; text: string };

export default function ChatScreen() {
  const scheme = useColorScheme();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const q = input.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    const res = await askChat({ query: q });
    setLoading(false);
    setMessages((m) => [...m, { role: "bot", text: res.answer }]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {messages.map((m, i) => (
          <View key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            backgroundColor: m.role === "user" ? (scheme === "dark" ? "#374151" : "#e0f2fe") : (scheme === "dark" ? "#1f2937" : "#eef2ff"),
            padding: 12,
            borderRadius: 12,
            maxWidth: "85%",
          }}>
            <Text style={{ color: scheme === "dark" ? "#fff" : "#111" }}>{m.text}</Text>
          </View>
        ))}
        {loading ? (
          <Text style={{ color: scheme === "dark" ? "#bbb" : "#666" }}>답변 생성 중...</Text>
        ) : null}
      </ScrollView>
      <View style={{ padding: 12, flexDirection: "row", gap: 8 }}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="메시지를 입력하세요"
          style={{ flex: 1, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}
          onSubmitEditing={send}
          editable={!loading}
        />
        <Button title="전송" onPress={send} disabled={loading} />
      </View>
    </SafeAreaView>
  );
}


