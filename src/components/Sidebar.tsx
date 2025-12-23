import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export function RAGBotCard() {
  const scheme = useColorScheme();
  const router = useRouter();
  const isDark = scheme === "dark";

  return (
    <View style={[styles.ragCard, { backgroundColor: isDark ? "#4338CA" : "#4F46E5" }]}>
      <View style={[styles.ragDecorativeCircle, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.1)" }]} />
      
      <View style={styles.ragContent}>
        <View style={styles.ragHeader}>
          <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
          <Text style={styles.ragTitle}>JB-RAG 봇</Text>
        </View>
        <Text style={styles.ragDescription}>
          "이번 달 군산대 해커톤 일정 알려줘"{'\n'}
          전북권 대학 정보를 학습한 AI에게 물어보세요.
        </Text>
        <TouchableOpacity 
          style={styles.ragButton}
          activeOpacity={0.8}
          onPress={() => router.push("/chat")}
        >
          <Text style={styles.ragButtonText}>대화 시작하기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function AcademicScheduleCard() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const bgColor = isDark ? "#1E293B" : "#fff";
  const textColor = isDark ? "#F1F5F9" : "#111827";
  const subTextColor = isDark ? "#94A3B8" : "#6B7280";

  const schedules = [
    { univ: "전북대", date: "05.22", event: "개교기념일 휴강", color: "#3B82F6", bgColor: "#DBEAFE" },
    { univ: "군산대", date: "05.25", event: "LINC 3.0 페스티벌", color: "#EAB308", bgColor: "#FEF3C7" },
    { univ: "원광대", date: "06.01", event: "SW창업 경진대회", color: "#22C55E", bgColor: "#D1FAE5" },
  ];

  return (
    <View style={[styles.scheduleCard, { backgroundColor: bgColor, borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
      <View style={styles.scheduleHeader}>
        <Ionicons name="calendar" size={18} color="#4F46E5" />
        <Text style={[styles.scheduleTitle, { color: textColor }]}>통합 학사 일정</Text>
      </View>
      <View style={styles.scheduleList}>
        {schedules.map((schedule, idx) => (
          <View key={idx} style={[styles.scheduleItem, idx < schedules.length - 1 && { marginBottom: 12 }]}>
            <View style={[styles.scheduleDateBox, { backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : schedule.bgColor }]}>
              <Text style={[styles.scheduleUnivText, { color: isDark ? "#93C5FD" : schedule.color }]}>
                {schedule.univ}
              </Text>
              <Text style={[styles.scheduleDateText, { color: textColor }]}>
                {schedule.date}
              </Text>
            </View>
            <View style={styles.scheduleEvent}>
              <Text style={[styles.scheduleEventText, { color: textColor }]}>
                {schedule.event}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function NoticesCard({ notices, onPressMore }: { notices: any[]; onPressMore?: () => void }) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const bgColor = isDark ? "#1E293B" : "#fff";
  const textColor = isDark ? "#F1F5F9" : "#111827";
  const subTextColor = isDark ? "#94A3B8" : "#6B7280";

  const getNoticeTypeColor = (type: string) => {
    if (type === "통합") return { bg: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2", text: isDark ? "#FCA5A5" : "#DC2626" };
    if (type === "전북대") return { bg: isDark ? "rgba(59, 130, 246, 0.2)" : "#DBEAFE", text: isDark ? "#93C5FD" : "#1E40AF" };
    if (type === "군산대") return { bg: isDark ? "rgba(234, 179, 8, 0.2)" : "#FEF3C7", text: isDark ? "#FCD34D" : "#854D0E" };
    return { bg: isDark ? "rgba(34, 197, 94, 0.2)" : "#D1FAE5", text: isDark ? "#86EFAC" : "#166534" };
  };

  return (
    <View style={[styles.noticesCard, { backgroundColor: bgColor, borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }]}>
      <View style={styles.noticesHeader}>
        <Text style={[styles.noticesTitle, { color: textColor }]}>기관별 공지</Text>
        <TouchableOpacity onPress={onPressMore} activeOpacity={0.7}>
          <Text style={[styles.noticesMore, { color: subTextColor }]}>전체보기</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.noticesList}>
        {notices.slice(0, 3).map((notice, idx) => {
          const type = notice.org?.name?.includes("전북") ? "전북대" : 
                      notice.org?.name?.includes("군산") ? "군산대" : 
                      notice.org?.name?.includes("원광") ? "원광대" : "통합";
          const colors = getNoticeTypeColor(type);
          const dateStr = notice.startAt ? new Date(notice.startAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }) : "";
          
          return (
            <TouchableOpacity key={notice.id} style={[styles.noticeItem, idx < Math.min(notices.length, 3) - 1 && { marginBottom: 10 }]} activeOpacity={0.7}>
              <View style={styles.noticeHeader}>
                <View style={[styles.noticeType, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.noticeTypeText, { color: colors.text }]}>
                    {type}
                  </Text>
                </View>
                <Text style={[styles.noticeDate, { color: subTextColor }]}>{dateStr}</Text>
              </View>
              <Text style={[styles.noticeTitle, { color: textColor }]} numberOfLines={1}>
                {notice.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ragCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  ragDecorativeCircle: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 128,
    height: 128,
    borderRadius: 64,
  },
  ragContent: {
    position: "relative",
    zIndex: 10,
  },
  ragHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ragTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    marginLeft: 6,
  },
  ragDescription: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 18,
    marginBottom: 12,
  },
  ragButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  ragButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },
  scheduleCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 6,
  },
  scheduleList: {},
  scheduleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  scheduleDateBox: {
    borderRadius: 8,
    padding: 6,
    minWidth: 50,
    alignItems: "center",
  },
  scheduleUnivText: {
    fontSize: 9,
    fontWeight: "800",
    marginBottom: 3,
  },
  scheduleDateText: {
    fontSize: 14,
    fontWeight: "800",
  },
  scheduleEvent: {
    flex: 1,
    justifyContent: "center",
  },
  scheduleEventText: {
    fontSize: 13,
    fontWeight: "700",
  },
  noticesCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  noticesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  noticesTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  noticesMore: {
    fontSize: 12,
    fontWeight: "600",
  },
  noticesList: {},
  noticeItem: {
    marginBottom: 4,
  },
  noticeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  noticeType: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  noticeTypeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  noticeDate: {
    fontSize: 12,
  },
  noticeTitle: {
    fontSize: 12,
    lineHeight: 16,
  },
});

