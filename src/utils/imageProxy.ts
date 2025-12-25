import { Platform } from "react-native";
import Constants from "expo-constants";

/**
 * 네이티브 환경에서 localhost를 실제 IP 주소로 변환합니다.
 * 웹 환경에서는 원본 URL을 그대로 반환합니다.
 */
function resolveProxyBaseUrl(proxyUrl: string): string {
  // 웹 환경에서는 localhost를 그대로 사용
  if (Platform.OS === "web") {
    return proxyUrl;
  }

  // localhost나 127.0.0.1이 포함된 경우 IP로 변환
  if (proxyUrl.includes("localhost") || proxyUrl.includes("127.0.0.1")) {
    // Expo 개발 서버의 IP 주소 사용
    const debuggerHost = Constants.expoConfig?.hostUri?.split(":")[0] || 
                         Constants.expoConfig?.extra?.host;
    
    if (debuggerHost && debuggerHost !== "localhost" && debuggerHost !== "127.0.0.1") {
      // localhost를 실제 IP로 교체
      return proxyUrl.replace(/localhost|127\.0\.0\.1/g, debuggerHost);
    }
    
    // IP를 찾을 수 없으면 원본 유지 (시뮬레이터에서는 작동할 수 있음)
    return proxyUrl;
  }

  return proxyUrl;
}

/**
 * 프록시 베이스 URL을 가져옵니다.
 * 환경변수가 없으면 기본값을 사용합니다 (chat.ts와 동일한 방식).
 */
function getProxyBaseUrl(): string {
  // 환경변수에서 가져오기 (우선순위)
  let baseUrl = (process.env.EXPO_PUBLIC_IMAGE_PROXY || process.env.IMAGE_PROXY || "").trim();
  
  // 환경변수가 없으면 기본값 사용 (chat.ts와 동일한 패턴)
  if (!baseUrl) {
    baseUrl = "http://localhost:4000/proxy?url={url}";
  }
  
  return baseUrl;
}

/**
 * 환경변수를 기반으로 이미지 요청을 프록시로 우회할 URL을 생성합니다.
 * - EXPO_PUBLIC_IMAGE_PROXY 또는 IMAGE_PROXY 사용
 *   - 템플릿 방식: "https://proxy.example.com/?url={url}"
 *   - prefix 방식: "https://proxy.example.com/" + target
 * - 환경변수가 없으면 기본값 사용: "http://localhost:4000/proxy?url={url}"
 */
export function buildProxyUrl(target: string): string | null {
  try {
    let envProxy = getProxyBaseUrl();
    
    // 네이티브 환경에서 localhost를 실제 IP로 변환
    envProxy = resolveProxyBaseUrl(envProxy);
    
    if (envProxy.includes("{url}")) {
      return envProxy.replace("{url}", encodeURIComponent(target));
    }
    return envProxy.endsWith("/") ? envProxy + target : envProxy + "/" + target;
  } catch (_) {
    return null;
  }
}


export function maybeProxyForWeb(url?: string | null): string | undefined | null {
  if (!url) return url ?? null;
  
  // 네이티브 환경에서는 HTTP URL을 프록시로 변환
  if (Platform.OS !== "web") {
    // HTTP URL인 경우 프록시 사용
    if (url.startsWith("http://")) {
      const proxied = buildProxyUrl(url);
      if (proxied) {
        if (__DEV__) {
          const envProxy = process.env.EXPO_PUBLIC_IMAGE_PROXY || process.env.IMAGE_PROXY || "(기본값 사용)";
        }
        return proxied;
      }
    }
    // HTTPS는 그대로 사용
    return url;
  }
  // 웹 환경에서는 원본 URL 사용 (CORS는 브라우저가 처리)
  return url;
}


