/**
 * 알림 기능 테스트 페이지
 * - 앱 내에서 인증된 사용자로 테스트 이벤트 생성
 * - Firestore 보안 규칙을 통과할 수 있음
 */
import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, useColorScheme } from "react-native";
import "../../src/db/firebase";
import { getCurrentUser } from "../../src/services/auth";
import { saveEventToFirestore } from "../../src/services/eventsStore";
import type { GeminiAnalysisResult } from "../../src/types";

export default function NotificationTestPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const testEvents = [
    {
      title: "2025년 하반기 해커톤 참가자 모집",
      summary: "교내 해커톤 참가자를 모집합니다. 팀 매칭 및 사전 교육 제공, 우수팀 시상.",
      tags: ["공모전", "교내활동"],
      org: {
        id: "engineering",
        name: "공학대학",
        logoUrl: null,
        homepageUrl: null,
      },
      sourceUrl: "https://example.com/hackathon",
      posterImageUrl: null,
    },
    {
      title: "현직자 멘토링 프로그램 안내",
      summary: "IT·SW 분야 현직자와의 1:1 멘토링. 신청 선착순 마감.",
      tags: ["취업", "대외활동"],
      org: {
        id: "career",
        name: "취업진로지원과",
        logoUrl: null,
        homepageUrl: null,
      },
      sourceUrl: null,
      posterImageUrl: null,
    },
    {
      title: "알고리즘 스터디 모집(초급/중급)",
      summary: "백준 단계별/분류별 문제로 진행. 주 2회 오프라인 스터디.",
      tags: ["학사", "교내활동"],
      org: {
        id: "cs",
        name: "컴퓨터공학부",
        logoUrl: null,
        homepageUrl: null,
      },
      sourceUrl: null,
      posterImageUrl: null,
    },
    {
      title: "봉사활동 프로그램 신청 안내",
      summary: "지역사회 봉사활동 프로그램에 참여하세요.",
      tags: ["봉사활동"],
      org: {
        id: "volunteer",
        name: "학생처",
        logoUrl: null,
        homepageUrl: null,
      },
      sourceUrl: null,
      posterImageUrl: null,
    },
  ];

  const createTestEvents = async () => {
    const user = getCurrentUser();
    if (!user) {
      Alert.alert("오류", "로그인이 필요합니다.");
      return;
    }

    setLoading(true);
    setResults([]);
    const newResults: string[] = [];

    try {
      for (const event of testEvents) {
        try {
          // saveEventToFirestore 함수 사용 (보안 규칙 통과 + 알림 생성 로직 포함)
          const analysis: GeminiAnalysisResult = {
            rawText: event.summary || event.title,
            extracted: {
              title: event.title,
              summary: event.summary || undefined,
            },
          };

          const eventId = await saveEventToFirestore({
            sourceUrl: event.sourceUrl ?? null,
            analysis,
            tags: event.tags,
            org: event.org,
            posterImageUrl: event.posterImageUrl ?? undefined,
          } as any);

          const result = `✅ ${event.title}\n   ID: ${eventId}\n   태그: ${event.tags.join(", ")}`;
          newResults.push(result);
          setResults([...newResults]);
        } catch (error: any) {
          const result = `❌ ${event.title}\n   오류: ${error.message}`;
          newResults.push(result);
          setResults([...newResults]);
        }
      }

      const successCount = newResults.filter(r => r.startsWith("✅")).length;
      if (successCount > 0) {
        Alert.alert(
          "완료",
          `${successCount}개의 테스트 이벤트가 생성되었습니다.\n\n알림 페이지에서 새 알림을 확인하세요.`
        );
      } else {
        Alert.alert(
          "실패",
          "모든 이벤트 생성이 실패했습니다.\n\nFirestore 보안 규칙을 확인해주세요."
        );
      }
    } catch (error: any) {
      Alert.alert("오류", `테스트 이벤트 생성 실패: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const user = getCurrentUser();

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: isDark ? "#000" : "#fff" }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: isDark ? "#fff" : "#000" }]}>
        알림 기능 테스트
      </Text>
      
      <View style={[styles.infoBox, { backgroundColor: isDark ? "#1E293B" : "#F3F4F6" }]}>
        <Text style={[styles.infoText, { color: isDark ? "#CBD5E1" : "#4B5563" }]}>
          📝 테스트 순서:
        </Text>
        <Text style={[styles.infoText, { color: isDark ? "#CBD5E1" : "#4B5563" }]}>
          1. 설정 페이지에서 관심 태그 선택
        </Text>
        <Text style={[styles.infoText, { color: isDark ? "#CBD5E1" : "#4B5563" }]}>
          2. 아래 버튼으로 테스트 이벤트 생성
        </Text>
        <Text style={[styles.infoText, { color: isDark ? "#CBD5E1" : "#4B5563" }]}>
          3. 알림 페이지에서 새 알림 확인
        </Text>
      </View>

      {!user && (
        <View style={[styles.warningBox, { backgroundColor: isDark ? "#7F1D1D" : "#FEE2E2" }]}>
          <Text style={[styles.warningText, { color: isDark ? "#FCA5A5" : "#DC2626" }]}>
            ⚠️ 로그인이 필요합니다
          </Text>
        </View>
      )}

      <Pressable
        onPress={createTestEvents}
        disabled={loading || !user}
        style={[
          styles.button,
          {
            backgroundColor: loading || !user 
              ? (isDark ? "#334155" : "#D1D5DB")
              : "#6466E9",
            opacity: loading || !user ? 0.5 : 1,
          }
        ]}
      >
        <Text style={styles.buttonText}>
          {loading ? "생성 중..." : "테스트 이벤트 생성 (4개)"}
        </Text>
      </Pressable>

      {results.length > 0 && (
        <View style={[styles.resultsBox, { backgroundColor: isDark ? "#1E293B" : "#F9FAFB" }]}>
          <Text style={[styles.resultsTitle, { color: isDark ? "#F1F5F9" : "#111827" }]}>
            생성 결과:
          </Text>
          {results.map((result, index) => (
            <Text 
              key={index} 
              style={[styles.resultText, { color: isDark ? "#CBD5E1" : "#4B5563" }]}
            >
              {result}
            </Text>
          ))}
        </View>
      )}

      <View style={[styles.noteBox, { backgroundColor: isDark ? "#1E293B" : "#F3F4F6" }]}>
        <Text style={[styles.noteText, { color: isDark ? "#94A3B8" : "#6B7280" }]}>
          💡 참고: 알림은 관심 태그와 매칭된 이벤트에 대해서만 생성됩니다.
        </Text>
        <Text style={[styles.noteText, { color: isDark ? "#94A3B8" : "#6B7280", marginTop: 8 }]}>
          생성되는 테스트 이벤트 태그:
        </Text>
        <Text style={[styles.noteText, { color: isDark ? "#94A3B8" : "#6B7280" }]}>
          • 공모전, 교내활동
        </Text>
        <Text style={[styles.noteText, { color: isDark ? "#94A3B8" : "#6B7280" }]}>
          • 취업, 대외활동
        </Text>
        <Text style={[styles.noteText, { color: isDark ? "#94A3B8" : "#6B7280" }]}>
          • 학사, 교내활동
        </Text>
        <Text style={[styles.noteText, { color: isDark ? "#94A3B8" : "#6B7280" }]}>
          • 봉사활동
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  warningBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  resultsBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  resultText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
    fontFamily: "monospace",
  },
  noteBox: {
    padding: 16,
    borderRadius: 12,
  },
  noteText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

