/**
 * 환경변수를 기반으로 이미지 요청을 프록시로 우회할 URL을 생성합니다.
 * - EXPO_PUBLIC_IMAGE_PROXY 또는 IMAGE_PROXY 사용
 *   - 템플릿 방식: "https://proxy.example.com/?url={url}"
 *   - prefix 방식: "https://proxy.example.com/" + target
 */
export function buildProxyUrl(target: string): string | null {
  try {
    const envProxy = (process.env.EXPO_PUBLIC_IMAGE_PROXY || process.env.IMAGE_PROXY || "").trim();
    if (!envProxy) return null;
    if (envProxy.includes("{url}")) return envProxy.replace("{url}", encodeURIComponent(target));
    return envProxy.endsWith("/") ? envProxy + target : envProxy + "/" + target;
  } catch (_) {
    return null;
  }
}

/**
 * 웹 환경에서만 프록시 URL로 바꿔 주는 헬퍼. 네이티브는 원본 URL을 그대로 사용.
 */
export function maybeProxyForWeb(url?: string | null): string | undefined | null {
  if (!url) return url ?? null;
  if (typeof window === "undefined") return url; // 네이티브/서버 사이드
  // 웹 환경에서는 원본 URL을 그대로 사용 (프록시 없이)
  return url;
}


