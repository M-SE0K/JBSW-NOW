import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, TextInput, Button, useColorScheme } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

type Filters = { tags?: string[]; orgId?: string; startDate?: string; endDate?: string };

export default function FiltersModal() {
  const router = useRouter();
  const scheme = useColorScheme();
  const params = useLocalSearchParams<{ current?: string }>();
  const [orgId, setOrgId] = useState("");
  const [tags, setTags] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (params.current) {
      try {
        const parsed = JSON.parse(params.current) as Filters;
        setOrgId(parsed.orgId ?? "");
        setTags((parsed.tags ?? []).join(","));
        setStartDate(parsed.startDate ?? "");
        setEndDate(parsed.endDate ?? "");
      } catch {}
    }
  }, [params.current]);

  const apply = () => {
    const next: Filters = {
      orgId: orgId || undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    };
    // 현재는 쿼리 키로만 구동되고, 상태 공유를 간단히 위해 뒤로 가기만 수행
    // 실제 앱에서는 글로벌 상태/URL 파라미터 공유 등을 사용할 수 있음
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: scheme === "dark" ? "#fff" : "#111" }}>필터</Text>
        <TextInput placeholder="orgId" value={orgId} onChangeText={setOrgId} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }} />
        <TextInput placeholder="tags (comma)" value={tags} onChangeText={setTags} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }} />
        <TextInput placeholder="startDate (ISO)" value={startDate} onChangeText={setStartDate} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }} />
        <TextInput placeholder="endDate (ISO)" value={endDate} onChangeText={setEndDate} style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }} />
        <Button title="적용" onPress={apply} />
      </View>
    </SafeAreaView>
  );
}


