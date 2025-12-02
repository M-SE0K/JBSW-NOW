import React, { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TextInput,
  useColorScheme,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { askChat } from "../../src/api/chat";

type Msg = { role: "user" | "bot"; text: string };

const QUICK_PROMPTS = [
  "오늘 새로 올라온 공지 요약해줘",
  "다가온 행사 일정 알려줘",
  "관심 태그 관련 소식있어?",
];

export default function ChatScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const heroAnim = useRef(new Animated.Value(0)).current;
  const promptAnim = useRef(new Animated.Value(0)).current;
  const composerAnim = useRef(new Animated.Value(0)).current;
  const heroAnimatedStyle = {
    opacity: heroAnim,
    transform: [
      {
        translateY: heroAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
    ],
  };
  const promptAnimatedStyle = {
    opacity: promptAnim,
    transform: [
      {
        translateY: promptAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
        }),
      },
    ],
  };
  const composerAnimatedStyle = {
    opacity: composerAnim,
    transform: [
      {
        translateY: composerAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        delay: 80,
        useNativeDriver: true,
      }),
      Animated.timing(promptAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(composerAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [heroAnim, promptAnim, composerAnim]);

  const send = async (preset?: string) => {
    const query = (preset ?? input).trim();
    if (!query || loading) return;

    setMessages((prev) => [...prev, { role: "user", text: query }]);
    setInput("");
    setLoading(true);
    try {
      const res = await askChat({ query });
      const answer = res?.answer?.trim();
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: answer?.length ? answer : "관련 답변을 찾지 못했어요. 다른 질문을 해볼까요?",
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "잠시 문제가 발생했어요. 조금 뒤에 다시 시도해주세요." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? "#05070d" : "#f5f6fb" }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={16}
      >
        <View style={styles.wrapper}>
          <Animated.View
            style={[
              styles.hero,
              { backgroundColor: isDark ? "#0f172a" : "#ffffff" },
              heroAnimatedStyle,
            ]}
          >
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={20} color="#2563eb" />
            </View>
            <Text style={[styles.heroTitle, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
              JBSW 챗 어시스턴트
            </Text>
            <Text style={[styles.heroDesc, { color: isDark ? "#94a3b8" : "#475569" }]}>
              공지/이벤트 데이터를 기반으로 궁금한 점을 바로 답해드릴게요.
            </Text>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="newspaper-outline" size={14} color="#2563eb" />
                <Text style={styles.heroBadgeText}>최근 공지</Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="search-outline" size={14} color="#2563eb" />
                <Text style={styles.heroBadgeText}>RAG 검색</Text>
              </View>
            </View>
          </Animated.View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={[styles.messagesContainer, { paddingBottom: 20 }]}
            showsVerticalScrollIndicator={false}
          >
            {messages.length === 0 && (
              <Text style={[styles.emptyText, { color: isDark ? "#94a3b8" : "#94a3b8" }]}>
                아직 대화가 없어요. 아래 추천 질문을 눌러 시작해보세요.
              </Text>
            )}

            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <View
                  key={`${m.role}-${i}-${m.text.slice(0, 8)}`}
                  style={[
                    styles.messageBubble,
                    isUser ? styles.messageUser : styles.messageBot,
                    {
                      backgroundColor: isUser
                        ? isDark
                          ? "#1d4ed8"
                          : "#111827"
                        : isDark
                        ? "#1f2937"
                        : "#ffffff",
                      borderColor: isUser ? "transparent" : isDark ? "#334155" : "#e2e8f0",
                    },
                  ]}
                >
                  {!isUser && (
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={16}
                      color={isDark ? "#94a3b8" : "#475569"}
                      style={{ marginBottom: 4 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      { color: isUser ? "#ffffff" : isDark ? "#e2e8f0" : "#0f172a" },
                    ]}
                  >
                    {m.text}
                  </Text>
                </View>
              );
            })}

            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={[styles.loadingText, { color: isDark ? "#cbd5f5" : "#475569" }]}>
                  답변을 찾고 있어요...
                </Text>
              </View>
            )}
          </ScrollView>

          {messages.length === 0 && (
            <Animated.View style={[styles.promptChips, promptAnimatedStyle]}>
              {QUICK_PROMPTS.map((prompt) => (
                <Pressable
                  key={prompt}
                  style={({ pressed }) => [
                    styles.promptChip,
                    {
                      backgroundColor: pressed
                        ? isDark
                          ? "#1e293b"
                          : "#e2e8f0"
                        : isDark
                        ? "#0f172a"
                        : "#ffffff",
                      borderColor: isDark ? "#1e293b" : "#e2e8f0",
                    },
                  ]}
                  onPress={() => send(prompt)}
                >
                  <Ionicons name="sparkles-outline" size={14} color="#2563eb" />
                  <Text style={styles.promptChipText}>{prompt}</Text>
                </Pressable>
              ))}
            </Animated.View>
          )}
        </View>

        <Animated.View
          style={[
            styles.composerWrapper,
            {
              backgroundColor: isDark ? "#0f172a" : "#ffffff",
            },
            composerAnimatedStyle,
          ]}
        >
          <View
            style={[
              styles.composer,
              {
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
                backgroundColor: isDark ? "#101828" : "#f8fafc",
              },
            ]}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="무엇이 궁금한가요?"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              style={[styles.input, { color: isDark ? "#f1f5f9" : "#0f172a" }]}
              onSubmitEditing={() => send()}
              editable={!loading}
              multiline
            />
            <Pressable
              onPress={() => send()}
              disabled={loading || !input.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor:
                    loading || !input.trim()
                      ? "rgba(37, 99, 235, 0.3)"
                      : pressed
                      ? "#1d4ed8"
                      : "#2563eb",
                },
              ]}
            >
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  hero: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.08)",
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(37,99,235,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  heroBadgeRow: {
    flexDirection: "row",
    gap: 8,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(37,99,235,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "600",
  },
  messagesContainer: {
    flexGrow: 1,
    gap: 12,
    paddingVertical: 16,
  },
  messageBubble: {
    padding: 14,
    borderRadius: 18,
    maxWidth: "85%",
    borderWidth: 1,
  },
  messageUser: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  messageBot: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    marginTop: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  promptChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  promptChipText: {
    color: "#1d4ed8",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
  },
  composerWrapper: {
    borderTopWidth: 1,
    borderColor: "rgba(148,163,184,0.3)",
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: -36,
  },
  composer: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 3,
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    minHeight: 28,
    maxHeight: 80,
    paddingTop: 0,
    paddingBottom: 0,
    lineHeight: 20,
    textAlignVertical: "center",
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});


