export type Settings = {
  GEMINI_API_KEY: string;
  MAX_CHUNK_SIZE: number;
  CHUNK_OVERLAP: number;
  MAX_FILE_SIZE_MB: number;
  EMBEDDING_MODEL: string;
  GEMINI_MODEL: string;
  TEMPERATURE: number;
  MAX_OUTPUT_TOKENS: number;
  ENABLE_OCR: boolean;
  ENABLE_YOUTUBE: boolean;
  MONGODB_URI: string;
  MONGODB_DB_NAME: string;
};

export const settings: Settings = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  MAX_CHUNK_SIZE: Number(process.env.MAX_CHUNK_SIZE || 1000),
  CHUNK_OVERLAP: Number(process.env.CHUNK_OVERLAP || 200),
  MAX_FILE_SIZE_MB: Number(process.env.MAX_FILE_SIZE_MB || 50),
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || "Xenova/all-MiniLM-L6-v2",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
  TEMPERATURE: Number(process.env.TEMPERATURE || 0.7),
  MAX_OUTPUT_TOKENS: Number(process.env.MAX_OUTPUT_TOKENS || 2048),
  ENABLE_OCR: String(process.env.ENABLE_OCR || "true") === "true",
  ENABLE_YOUTUBE: String(process.env.ENABLE_YOUTUBE || "true") === "true",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017",
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "docs-chat",
};

export const SYSTEM_PROMPT = `You are a helpful assistant that answers questions based on the provided document context and any images provided.
When answering:
1. Use the document context provided to answer the question as accurately as possible
2. If images are provided, analyze them carefully and describe what you see
3. If the information is partially available in the context, provide what you can find and mention what might be missing
4. If the answer cannot be found in the provided context or images, clearly state that the specific information is not available
5. Be helpful and provide relevant information even if it's not an exact match to the question
6. Always cite which part of the document or image you're referencing when possible`;

