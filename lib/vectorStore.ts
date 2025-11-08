import { pipeline } from "@xenova/transformers";
import type { Chunk } from "./textChunker";
import { MongoClient, Db, Collection } from "mongodb";
import { settings } from "./settings";

type Embedding = Float32Array;

interface ChunkDocument {
  id: number;
  text: string;
  embedding: number[];
  createdAt: Date;
}

export class VectorStore {
  private chunks: Chunk[] = [];
  private embeddings: Embedding[] = [];
  private embedderPromise: Promise<any> | null = null;
  private modelName: string;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private collection: Collection<ChunkDocument> | null = null;
  private useMongo: boolean;
  private isConnected: boolean = false;

  constructor(modelName: string, mongoUri?: string, dbName?: string) {
    this.modelName = modelName;
    this.useMongo = Boolean(mongoUri);
    
    if (mongoUri) {
      this.client = new MongoClient(mongoUri);
      this.initMongo(dbName || "docs-chat").catch((err) => {
        console.error("Failed to initialize MongoDB:", err);
      });
    }
  }

  private async initMongo(dbName: string) {
    try {
      if (!this.client) {
        console.warn("MongoDB client not initialized");
        this.isConnected = false;
        return;
      }
      
      await this.client.connect();
      this.db = this.client.db(dbName);
      this.collection = this.db.collection<ChunkDocument>("chunks");
      
      // Create index on id for faster lookups
      try {
        await this.collection.createIndex({ id: 1 });
      } catch (idxErr) {
        // Index might already exist, that's okay
        console.log("Index creation note:", idxErr);
      }
      
      this.isConnected = true;
      console.log(`Connected to MongoDB database: ${dbName}`);
      await this.loadFromMongo();
    } catch (err: any) {
      console.error("MongoDB connection error:", err.message || err);
      console.warn("Falling back to in-memory storage. Data will not persist.");
      this.isConnected = false;
      // Continue with in-memory mode - the app will still work
    }
  }

  private async loadFromMongo() {
    if (!this.collection || !this.isConnected) {
      console.log("Skipping MongoDB load - not connected");
      return;
    }
    
    try {
      const documents = await this.collection.find({}).sort({ id: 1 }).toArray();
      
      // Only load if we don't already have chunks in memory (to avoid overwriting)
      if (this.chunks.length === 0 && documents.length > 0) {
        this.chunks = documents.map((doc) => ({ 
          id: doc.id, 
          text: doc.text 
        }));
        this.embeddings = documents.map((doc) => 
          new Float32Array(doc.embedding)
        );
        console.log(`Loaded ${this.chunks.length} chunks from MongoDB`);
      } else if (this.chunks.length > 0) {
        console.log(`Skipping MongoDB load - already have ${this.chunks.length} chunks in memory`);
      } else {
        console.log("No chunks in MongoDB to load");
      }
    } catch (err) {
      console.error("Failed to load from MongoDB:", err);
    }
  }

  private async getEmbedder() {
    if (!this.embedderPromise) {
      const model = this.modelName.includes('/') ? this.modelName : `Xenova/${this.modelName}`;
      this.embedderPromise = pipeline("feature-extraction", model);
    }
    return this.embedderPromise;
  }

  async addDocuments(chunks: Chunk[]): Promise<void> {
    if (!chunks.length) {
      console.warn("addDocuments called with empty chunks array");
      return;
    }
    
    console.log(`Adding ${chunks.length} chunks to vector store. Current chunks: ${this.chunks.length}`);
    
    const embedder = await this.getEmbedder();
    const texts = chunks.map(c => c.text);
    const outputs = await embedder(texts, { pooling: "mean", normalize: true });
    const vectors: Embedding[] = outputs.tolist().map((row: number[]) => new Float32Array(row));
    
    // Determine starting ID
    const startId = this.chunks.length > 0 ? Math.max(...this.chunks.map(c => c.id)) + 1 : 0;
    const chunksWithIds = chunks.map((chunk, i) => ({ ...chunk, id: startId + i }));
    
    // Add to memory FIRST (this ensures in-memory mode works even if MongoDB fails)
    this.chunks.push(...chunksWithIds);
    this.embeddings.push(...vectors);
    
    console.log(`Added ${chunksWithIds.length} chunks to memory. Total chunks now: ${this.chunks.length}`);
    
    // Save to MongoDB if connected (this is optional - memory storage is primary)
    if (this.collection && this.isConnected) {
      try {
        const documents: ChunkDocument[] = chunksWithIds.map((chunk, i) => ({
          id: chunk.id,
          text: chunk.text,
          embedding: Array.from(vectors[i]),
          createdAt: new Date(),
        }));
        
        await this.collection.insertMany(documents);
        console.log(`Saved ${documents.length} chunks to MongoDB`);
      } catch (err) {
        console.error("Failed to save to MongoDB (continuing with in-memory storage):", err);
        // Continue even if MongoDB save fails - memory storage is already done
      }
    } else {
      console.log(`MongoDB not connected (isConnected: ${this.isConnected}), using in-memory storage only`);
    }
  }

  async search(query: string, topK: number = 5): Promise<{ chunk: Chunk; score: number }[]> {
    if (this.chunks.length === 0) return [];
    
    const embedder = await this.getEmbedder();
    const out = await embedder(query, { pooling: "mean", normalize: true });
    const q = new Float32Array(out.tolist()[0]);
    
    // Calculate cosine similarity for all embeddings
    const scores = this.embeddings.map((v) => cosineSimilarity(q, v));
    
    // Sort by score and get top K
    const indices = scores
      .map((s, i) => [s, i] as const)
      .sort((a, b) => b[0] - a[0])
      .slice(0, Math.min(topK, scores.length));
    
    return indices.map(([score, i]) => ({ 
      chunk: this.chunks[i], 
      score 
    }));
  }

  async clear() {
    this.chunks = [];
    this.embeddings = [];
    
    if (this.collection && this.isConnected) {
      try {
        const result = await this.collection.deleteMany({});
        console.log(`Cleared ${result.deletedCount} chunks from MongoDB`);
      } catch (err) {
        console.error("Failed to clear MongoDB:", err);
        // Continue even if MongoDB clear fails - memory is already cleared
      }
    }
  }

  getStats() {
    return {
      total_chunks: this.chunks.length,
      dimension: this.embeddings[0]?.length || 0,
      model_name: this.modelName,
      index_size: this.embeddings.length,
    };
  }

  async close() {
    if (this.client && this.isConnected) {
      await this.client.close();
      this.isConnected = false;
    }
  }
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
