import React from "react";
import { View, Text, Button, useColorScheme } from "react-native";

export const ErrorState = ({ message = "문제가 발생했습니다.", onRetry }: { message?: string; onRetry?: () => void }) => {
  const scheme = useColorScheme();
  return (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Text style={{ color: scheme === "dark" ? "#ff8080" : "#b00020", marginBottom: 12 }}>{message}</Text>
      {onRetry ? <Button title="다시 시도" onPress={onRetry} /> : null}
    </View>
  );
};

export default ErrorState;


