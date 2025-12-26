import React, { useEffect, useRef, useState, memo, useCallback } from "react";
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
import Markdown from "react-native-markdown-display";
import { askChat } from "../../src/api/chat";
import { PageTransition } from "../../src/components/PageTransition";
import { usePageTransition } from "../../src/hooks/usePageTransition";

type Msg = { role: "user" | "bot"; text: string };

const QUICK_PROMPTS = [
  "오늘 새로 올라온 공지 요약해줘",
  "다가온 행사 일정 알려줘",
  "관심 태그 관련 소식있어?",
];

const ChatScreen = memo(() => {
  const { isVisible, direction } = usePageTransition();
  const isDark = useColorScheme() === "dark";
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const inputValueRef = useRef("");
  const loadingRef = useRef(false);

  // ref를 통해 최신 값 추적
  useEffect(() => {
    inputValueRef.current = input;
  }, [input]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);
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

  const send = useCallback(async (preset?: string) => {
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
  }, [input, loading]);

  // 웹에서 inputRef가 변경될 때 이벤트 리스너 추가 (백업용)
  // onKeyPress가 작동하지 않는 경우를 대비
  useEffect(() => {
    if (Platform.OS !== "web") return;
    
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let handler: ((e: KeyboardEvent) => void) | null = null;
    
    const setupListener = () => {
      // 여러 방법으로 노드 찾기 시도
      const node = (inputRef.current as any)?._node 
        || (inputRef.current as any)?.node
        || (inputRef.current as any)?.base
        || (inputRef.current as any);
      
      // DOM 노드인지 확인 (textarea 또는 input)
      const domNode = (node?.tagName === "TEXTAREA" || node?.tagName === "INPUT") ? node : null;
      
      if (!domNode) {
        // 노드가 아직 준비되지 않았으면 재시도 (최대 10번)
        let retryCount = 0;
        const maxRetries = 10;
        timeoutId = setTimeout(() => {
          retryCount++;
          if (retryCount < maxRetries) {
            setupListener();
          }
        }, 100);
        return;
      }

      handler = (e: KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          // ref를 통해 최신 상태 참조
          const currentInput = inputValueRef.current;
          const currentLoading = loadingRef.current;
          if (currentInput.trim() && !currentLoading) {
            send();
          }
        }
      };
      
      domNode.addEventListener('keydown', handler, true);
    };

    setupListener();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (handler) {
        const node = (inputRef.current as any)?._node 
          || (inputRef.current as any)?.node
          || (inputRef.current as any)?.base
          || (inputRef.current as any);
        const domNode = (node?.tagName === "TEXTAREA" || node?.tagName === "INPUT") ? node : null;
        if (domNode) {
          domNode.removeEventListener('keydown', handler, true);
        }
      }
    };
  }, [send]);

  return (
    <PageTransition isVisible={isVisible} direction={direction}>
      <SafeAreaView 
        edges={Platform.OS === "web" ? ["top", "left", "right"] : undefined}
        style={[styles.safeArea, { backgroundColor: isDark ? "#05070d" : "#f5f6fb" }]}
      >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={16}
      >
        <View style={[
          styles.wrapper,
          Platform.OS === "web" && { maxWidth: 800, width: "100%", alignSelf: "center" } as any
        ]}>
          <Animated.View
            style={[
              styles.hero,
              { backgroundColor: isDark ? "#0f172a" : "#ffffff" },
              heroAnimatedStyle,
            ]}
          >
            <View style={styles.heroIcon}>
              <Ionicons name="chatbubble-ellipses" size={20} color="#6466E9" />
            </View>
            <Text style={[styles.heroTitle, { color: isDark ? "#f8fafc" : "#0f172a" }]}>
              JBSW 챗 어시스턴트
            </Text>
            <Text style={[styles.heroDesc, { color: isDark ? "#94a3b8" : "#475569" }]}>
              공지/이벤트 데이터를 기반으로 궁금한 점을 바로 답해드릴게요.
            </Text>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="newspaper-outline" size={14} color="#6466E9" />
                <Text style={styles.heroBadgeText}>최근 공지</Text>
              </View>
              <View style={styles.heroBadge}>
                <Ionicons name="search-outline" size={14} color="#6466E9" />
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
                        ? "#6466E9"
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
                  {isUser ? (
                    <Text
                      style={[
                        styles.messageText,
                        { color: "#ffffff" },
                      ]}
                    >
                      {m.text}
                    </Text>
                  ) : (
                    <Markdown
                      style={{
                        body: {
                          color: isDark ? "#e2e8f0" : "#0f172a",
                          fontSize: 15,
                          lineHeight: 22,
                          fontFamily: Platform.OS === "ios" ? "-apple-system" : "sans-serif",
                          width: "100%",
                          flexShrink: 1,
                          overflow: "hidden",
                        },
                        paragraph: {
                          marginTop: 0,
                          marginBottom: 12,
                        },
                        heading1: {
                          fontSize: 22,
                          fontWeight: "700",
                          marginTop: 16,
                          marginBottom: 12,
                          color: isDark ? "#f1f5f9" : "#0f172a",
                          letterSpacing: -0.3,
                        },
                        heading2: {
                          fontSize: 18,
                          fontWeight: "700",
                          marginTop: 16,
                          marginBottom: 10,
                          color: isDark ? "#f1f5f9" : "#0f172a",
                          letterSpacing: -0.2,
                        },
                        heading3: {
                          fontSize: 16,
                          fontWeight: "600",
                          marginTop: 12,
                          marginBottom: 8,
                          color: isDark ? "#e2e8f0" : "#1e293b",
                          letterSpacing: -0.1,
                        },
                        strong: {
                          fontWeight: "700",
                          color: isDark ? "#f1f5f9" : "#0f172a",
                        },
                        em: {
                          fontStyle: "italic",
                          color: isDark ? "#cbd5e1" : "#475569",
                        },
                        listItem: {
                          marginBottom: 6,
                          paddingLeft: 4,
                        },
                        bullet_list: {
                          marginBottom: 12,
                          marginTop: 4,
                        },
                        ordered_list: {
                          marginBottom: 12,
                          marginTop: 4,
                        },
                        code_inline: {
                          backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                          color: isDark ? "#6466E9" : "#6466E9",
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          fontSize: 13,
                          fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                        },
                        code_block: {
                          backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
                          color: isDark ? "#6466E9" : "#6466E9",
                          padding: 12,
                          borderRadius: 8,
                          marginVertical: 12,
                          fontSize: 13,
                          fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                        },
                        link: {
                          color: "#6466E9",
                          textDecorationLine: "none",
                          fontWeight: "500",
                        },
                        blockquote: {
                          borderLeftWidth: 3,
                          borderLeftColor: isDark ? "#475569" : "#cbd5e1",
                          paddingLeft: 16,
                          marginLeft: 0,
                          marginVertical: 12,
                          backgroundColor: isDark ? "rgba(148, 163, 184, 0.08)" : "rgba(148, 163, 184, 0.04)",
                          paddingVertical: 10,
                          paddingRight: 12,
                          borderRadius: 4,
                        },
                        hr: {
                          backgroundColor: isDark ? "#334155" : "#e2e8f0",
                          height: 1,
                          marginVertical: 16,
                        },
                      }}
                    >
                      {m.text}
                    </Markdown>
                  )}
                </View>
              );
            })}

            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#6466E9" />
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
                  <Ionicons name="chatbubble-ellipses-outline" size={14} color="#6466E9" />
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
              backgroundColor: "transparent",
              marginBottom: Platform.OS === "web" ? 0 : -36,
              paddingBottom: Platform.OS === "web" ? 16 : 12,
              paddingTop: Platform.OS === "web" ? 8 : 12,
              ...(Platform.OS === "web" ? { maxWidth: 800, width: "100%", alignSelf: "center" } : {} as any),
            },
            composerAnimatedStyle,
          ]}
        >
          <View
            style={[
              styles.composer,
              {
                borderColor: isDark ? "#1e293b" : "#e2e8f0",
                backgroundColor: "#ffffff",
              },
            ]}
          >
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="무엇이 궁금한가요?"
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              style={[styles.input, { color: isDark ? "#f1f5f9" : "#0f172a" }]}
              editable={!loading}
              multiline
              blurOnSubmit={false}
              returnKeyType="send"
              onSubmitEditing={() => {
                if (input.trim() && !loading) {
                  send();
                }
              }}
              onKeyPress={(e) => {
                const key = e.nativeEvent.key;
                if (key === "Enter") {
                  // 모든 플랫폼에서 Enter 키로 전송
                  // 웹에서는 Shift+Enter 체크가 불가능하지만, 일반적으로 Enter만 누르면 전송
                  if (input.trim() && !loading) {
                    send();
                  }
                }
              }}
            />
            <Pressable
              onPress={() => send()}
              disabled={loading || !input.trim()}
              style={({ pressed }) => [
                styles.sendButton,
                {
                  backgroundColor:
                    loading || !input.trim()
                      ? "rgba(100, 102, 233, 0.3)"
                      : pressed
                      ? "#5557D9"
                      : "#6466E9",
                },
              ]}
            >
              <Ionicons name="arrow-up" size={Platform.OS === "web" ? 16 : 18} color="#fff" />
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </PageTransition>
  );
});

ChatScreen.displayName = "ChatScreen";

export default ChatScreen;

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
    borderColor: "rgba(100, 102, 233, 0.08)",
  },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(100,102,233,0.1)",
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
    backgroundColor: "rgba(100,102,233,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: "#6466E9",
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
    maxWidth: "100%",
    flexShrink: 1,
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
    color: "#6466E9",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
  },
  composerWrapper: {
    borderTopWidth: 0,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  composer: {
    flexDirection: "row",
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "web" ? 6 : 8,
    alignItems: "center",
    gap: 12,
  } as any,
  input: {
    flex: 1,
    fontSize: 15,
    minHeight: Platform.OS === "web" ? 28 : 36,
    maxHeight: 100,
    paddingTop: Platform.OS === "web" ? 2 : 4,
    paddingBottom: Platform.OS === "web" ? 2 : 4,
    paddingHorizontal: 4,
    lineHeight: 20,
    textAlignVertical: "center",
  } as any,
  sendButton: {
    width: Platform.OS === "web" ? 32 : 36,
    height: Platform.OS === "web" ? 32 : 36,
    borderRadius: Platform.OS === "web" ? 16 : 18,
    alignItems: "center",
    justifyContent: "center",
  } as any,
});

