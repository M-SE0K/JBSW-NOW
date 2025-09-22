import React from "react";
import { View, Text, Image, TouchableOpacity, useColorScheme } from "react-native";
import { Org } from "../types";

type Props = {
  org: Org;
  onPress?: () => void;
};

export const OrgCard = ({ org, onPress }: Props) => {
  const scheme = useColorScheme();
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={{
      backgroundColor: scheme === "dark" ? "#1c1c1c" : "#fff",
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 16,
      marginVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    }}>
      {org.logoUrl ? (
        <Image source={{ uri: org.logoUrl }} style={{ width: 44, height: 44, borderRadius: 8, marginRight: 12 }} />
      ) : (
        <View style={{ width: 44, height: 44, borderRadius: 8, marginRight: 12, backgroundColor: scheme === "dark" ? "#2a2a2a" : "#eee", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: scheme === "dark" ? "#aaa" : "#777" }}>ORG</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: scheme === "dark" ? "#fff" : "#111" }}>{org.name}</Text>
        {org.homepageUrl ? (
          <Text numberOfLines={1} style={{ color: scheme === "dark" ? "#bbb" : "#666", marginTop: 4 }}>{org.homepageUrl}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export default OrgCard;


