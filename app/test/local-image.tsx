import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { analyzePosterImageFromBundledAsset } from "../../src/api/gemini/testGemini";
import { analyzePosterText, analyzePosterImage } from "../../src/api/gemini/gemini";
import { submitTextFromTestPage } from "../../src/services/submitFromTest";

export default function LocalImageTestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rawText, setRawText] = useState("");
  const [jsonPreview, setJsonPreview] = useState("");
  const [textInput, setTextInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const run = async () => {
    setLoading(true);
    setError("");
    setRawText("");
    setJsonPreview("");
    try {
      const res = await analyzePosterImageFromBundledAsset();
      setRawText(res.rawText ?? "");
      if (res.extracted) setJsonPreview(JSON.stringify(res.extracted, null, 2));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 12 }}>번들 포스터 분석 테스트</Text>
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        <Pressable onPress={run} disabled={loading} style={{ padding: 12, backgroundColor: loading ? "#ccc" : "#cfe", borderRadius: 8 }}>
          <Text>{loading ? "분석 중..." : "이미지 분석 실행"}</Text>
        </Pressable>
      </View>
      {!!error && <Text style={{ marginTop: 12, color: "red" }}>{error}</Text>}
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontWeight: "700", marginBottom: 8 }}>이미지 URL</Text>
        <TextInput
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="http(s):// 로 접근 가능한 이미지 URL"
          autoCapitalize="none"
          autoCorrect={false}
          style={{ borderWidth: 1, borderColor: "#ddd", padding: 10, borderRadius: 8 }}
        />
        <Pressable
          onPress={async () => {
            setLoading(true);
            setError("");
            setRawText("");
            setJsonPreview("");
            try {
              const res = await analyzePosterImage({ uri: imageUrl });
              //const res = await analyzePosterImage({ uri:  "https://swuniv.jbnu.ac.kr/_data/sys_program_list/1757898366_BNsG0oAzTP6bx3hmPzNuT8kxzBmsLHA5Ju7x9pS2P68c7667e.jpg"});
              setRawText(res.rawText ?? "");
              if (res.extracted) setJsonPreview(JSON.stringify(res.extracted, null, 2));
            } catch (e: any) {
              setError(String(e?.message ?? e));
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading || !imageUrl}
          style={{ marginTop: 12, padding: 12, backgroundColor: loading || !imageUrl ? "#ccc" : "#cfe", borderRadius: 8 }}
        >
          <Text>{loading ? "분석 중..." : "이미지 URL 분석"}</Text>
        </Pressable>
      </View>
      <View style={{ marginTop: 20 }}>
        <Text style={{ fontWeight: "700", marginBottom: 8 }}>텍스트 입력</Text>
        <TextInput
          value={textInput}
          onChangeText={setTextInput}
          placeholder="공고/포스터 텍스트를 붙여넣기"
          multiline
          style={{ borderWidth: 1, borderColor: "#ddd", padding: 10, borderRadius: 8, minHeight: 120 }}
        />
        <Pressable
          onPress={async () => {
            setLoading(true);
            setError("");
            setRawText("");
            setJsonPreview("");
            try {
              // 분석 + 저장까지 수행
              const { analysis } = await submitTextFromTestPage({ text: textInput });
              setRawText(analysis.rawText ?? "");
              if (analysis.extracted) setJsonPreview(JSON.stringify(analysis.extracted, null, 2));
            } catch (e: any) {
              setError(String(e?.message ?? e));
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          style={{ marginTop: 12, padding: 12, backgroundColor: loading ? "#ccc" : "#def", borderRadius: 8 }}
        >
          <Text>{loading ? "분석 중..." : "텍스트로 분석(저장 포함)"}</Text>
        </Pressable>
      </View>
      {!!rawText && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: "700" }}>요약 텍스트</Text>
          <Text style={{ marginTop: 8 }}>{rawText}</Text>
        </View>
      )}
      {!!jsonPreview && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: "700" }}>추출 JSON</Text>
          <Text style={{ marginTop: 8, fontFamily: "Courier" }}>{jsonPreview}</Text>
        </View>
      )}
    </ScrollView>
  );
}


