import React from "react";
import { View, Text, TouchableOpacity, useColorScheme } from "react-native";

type Props = {
  title: string;
  onPressMore?: () => void;
  showMore?: boolean;
  rightText?: string;
  style?: any;
};

export default function SectionHeader({ title, onPressMore, showMore = true, rightText = "더보기 ▸", style }: Props) {
  const scheme = useColorScheme();
  const textColor = scheme === "dark" ? "#fff" : "#111";

  return (
    <View style={[{ marginTop: 20, marginBottom: 8, flexDirection: "row", alignItems: "center" }, style]}>
      <Text style={{ fontSize: 22, fontWeight: "800", color: textColor }}>{title}</Text>
      <View style={{ flex: 1 }} />
      {showMore ? (
        <TouchableOpacity disabled={!onPressMore} onPress={onPressMore}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: textColor }}>{rightText}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}


