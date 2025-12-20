/**
 * Gemini Embedding API를 사용한 벡터 임베딩 생성
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const EMBEDDING_MODEL = "models/text-embedding-004"; // Gemini Embedding 모델

/**
 * 텍스트를 벡터 임베딩으로 변환
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY (or EXPO_PUBLIC_GEMINI_API_KEY)");
  }

  if (!text || text.trim().length === 0) {
    throw new Error("Text cannot be empty");
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          content: {
            parts: [{ text: text.trim() }],
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini Embedding API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const embedding = data.embedding?.values;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Invalid embedding response format");
    }

    return embedding;
  } catch (error) {
    console.error("[Embeddings] Failed to generate embedding:", error);
    throw error;
  }
}

/**
 * 여러 텍스트를 한 번에 벡터 임베딩으로 변환 (배치 처리)
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  // Gemini API는 배치를 지원하지 않으므로 병렬 처리
  const promises = texts.map((text) => generateEmbedding(text));
  return Promise.all(promises);
}

/**
 * 두 벡터 간의 코사인 유사도 계산
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

