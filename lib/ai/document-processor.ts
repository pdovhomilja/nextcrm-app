import { generateObject } from "ai";
import { aiConfig } from "./config";
import db from "@/lib/db";
import { z } from "zod";
// Dynamic import handled in method
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import Tesseract from "tesseract.js";

export interface DocumentProcessingResult {
  success: boolean;
  documentId: string;
  extractedText: string;
  summary: string;
  keyInsights: string[];
  embeddingId?: string;
  processingTime: number;
  confidence: number;
}

export interface DocumentMetadata {
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  companyId: string;
  taskId?: string;
  boardId?: string;
}

export class DocumentProcessor {
  private readonly supportedTypes = [
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
    "image/webp",
  ];

  /**
   * Process uploaded document and extract insights
   */
  async processDocument(
    fileBuffer: Buffer,
    metadata: DocumentMetadata
  ): Promise<DocumentProcessingResult> {
    const startTime = Date.now();

    try {
      // Validate file type
      if (!this.supportedTypes.includes(metadata.mimeType)) {
        throw new Error(`Unsupported file type: ${metadata.mimeType}`);
      }

      // Extract text content based on file type
      let extractedText = "";

      switch (metadata.mimeType) {
        case "application/pdf":
          extractedText = await this.extractTextFromPDF(fileBuffer);
          break;
        case "text/plain":
        case "text/markdown":
          extractedText = fileBuffer.toString("utf-8");
          break;
        case "text/csv":
          extractedText = await this.processCSV(fileBuffer);
          break;
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          extractedText = await this.extractTextFromDocx(fileBuffer);
          break;
        case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
          extractedText = await this.processExcel(fileBuffer);
          break;
        case "image/png":
        case "image/jpeg":
        case "image/webp":
          extractedText = await this.extractTextFromImage(fileBuffer);
          break;
        default:
          throw new Error(`Handler not implemented for ${metadata.mimeType}`);
      }

      if (!extractedText.trim()) {
        throw new Error("No text content could be extracted from the document");
      }

      // Generate document summary and insights
      const { summary, keyInsights, confidence } =
        await this.analyzeDocumentContent(extractedText, metadata);

      // Store document in database
      const document = await db.document.create({
        data: {
          filename: metadata.filename,
          mimeType: metadata.mimeType,
          size: metadata.size,
          extractedText,
          summary,
          keyInsights,
          confidence,
          uploadedBy: metadata.uploadedBy,
          companyId: metadata.companyId,
          taskId: metadata.taskId,
          boardId: metadata.boardId,
          processedAt: new Date(),
        },
      });

      // Generate and store embedding (temporarily disabled due to pgvector compatibility)
      let embeddingId: string | undefined;
      try {
        console.log("Document embedding creation temporarily disabled");
        // const embedding = await embed({
        //   model: aiConfig.embeddingModel,
        //   value: `${summary}\n\n${extractedText.substring(0, 2000)}`,
        // });

        // await db.documentEmbedding.create({
        //   data: {
        //     documentId: document.id,
        //     embedding: `[${embedding.embedding.join(',')}]` as any,
        //     content: summary,
        //     metadata: {
        //       filename: metadata.filename,
        //       mimeType: metadata.mimeType,
        //       keyInsights,
        //       confidence,
        //     },
        //   },
        // });

        embeddingId = document.id;
      } catch (error) {
        console.error("Failed to generate document embedding:", error);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        documentId: document.id,
        extractedText,
        summary,
        keyInsights,
        embeddingId,
        processingTime,
        confidence,
      };
    } catch (error) {
      console.error("Document processing error:", error);

      return {
        success: false,
        documentId: "",
        extractedText: "",
        summary: "Failed to process document",
        keyInsights: [],
        processingTime: Date.now() - startTime,
        confidence: 0,
      };
    }
  }

  /**
   * Extract text from PDF using pdf-parse
   */
  private async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      // Dynamic import to avoid build-time issues
      const { default: pdf } = await import("pdf-parse");
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      console.error("PDF extraction error:", error);
      return "PDF text extraction failed";
    }
  }

  /**
   * Extract text from DOCX files using mammoth
   */
  private async extractTextFromDocx(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      console.error("DOCX extraction error:", error);
      return "DOCX text extraction failed";
    }
  }

  /**
   * Process CSV files and convert to readable format
   */
  private async processCSV(buffer: Buffer): Promise<string> {
    const csvContent = buffer.toString("utf-8");
    const lines = csvContent.split("\n").slice(0, 100); // First 100 lines
    return `CSV Data Analysis:\n${lines.join("\n")}`;
  }

  /**
   * Process Excel files using xlsx
   */
  private async processExcel(buffer: Buffer): Promise<string> {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheets = workbook.SheetNames;
      let extractedText = "Excel Spreadsheet Content:\n\n";

      sheets.forEach((sheetName, index) => {
        if (index < 3) {
          // Process first 3 sheets only
          const sheet = workbook.Sheets[sheetName];
          const csvData = XLSX.utils.sheet_to_csv(sheet);
          extractedText += `Sheet: ${sheetName}\n${csvData}\n\n`;
        }
      });

      return extractedText;
    } catch (error) {
      console.error("Excel processing error:", error);
      return "Excel processing failed";
    }
  }

  /**
   * Extract text from images using Tesseract OCR
   */
  private async extractTextFromImage(buffer: Buffer): Promise<string> {
    try {
      const {
        data: { text },
      } = await Tesseract.recognize(buffer, "eng");
      return text.trim();
    } catch (error) {
      console.error("OCR extraction error:", error);
      return "Image text extraction failed";
    }
  }

  /**
   * Analyze document content and generate insights
   */
  private async analyzeDocumentContent(
    text: string,
    metadata: DocumentMetadata
  ): Promise<{
    summary: string;
    keyInsights: string[];
    confidence: number;
  }> {
    try {
      const analysisResult = await generateObject({
        model: aiConfig.structuredOutputModel,
        system: `You are a document analysis expert. Analyze the provided document content and generate:
1. A concise summary (2-3 sentences)
2. Key insights relevant to project management
3. A confidence score for the analysis quality`,
        prompt: `Analyze this document content:

Filename: ${metadata.filename}
Type: ${metadata.mimeType}
Size: ${metadata.size} bytes

Content:
${text.substring(0, 4000)} ${text.length > 4000 ? "..." : ""}

Focus on insights relevant to:
- Project management and tasks
- Team collaboration
- Process improvements
- Risk factors or blockers
- Action items or decisions`,
        schema: z.object({
          summary: z.string(),
          keyInsights: z.array(z.string()).max(5),
          confidence: z.number().min(0).max(1),
          relevantTopics: z.array(z.string()).max(3),
        }),
        temperature: 0.4,
      });

      return {
        summary: analysisResult.object.summary,
        keyInsights: analysisResult.object.keyInsights,
        confidence: analysisResult.object.confidence,
      };
    } catch (error) {
      console.error("Document analysis error:", error);

      return {
        summary: `Document: ${metadata.filename} (${Math.round(metadata.size / 1024)}KB)`,
        keyInsights: ["Document processing completed"],
        confidence: 0.3,
      };
    }
  }

  /**
   * Search documents using semantic similarity
   */
  async searchDocuments(
    query: string,
    companyId: string,
    options: {
      boardId?: string;
      taskId?: string;
      limit?: number;
      threshold?: number;
    } = {}
  ): Promise<
    Array<{
      documentId: string;
      filename: string;
      summary: string;
      similarity: number;
      keyInsights: string[];
    }>
  > {
    const { limit = 5 } = options;

    try {
      console.log(
        "Document vector search temporarily disabled, using text search"
      );

      // Fallback to basic text search
      const documents = await db.document.findMany({
        where: {
          companyId,
          ...(options.boardId && { boardId: options.boardId }),
          ...(options.taskId && { taskId: options.taskId }),
          OR: [
            { filename: { contains: query, mode: "insensitive" } },
            { summary: { contains: query, mode: "insensitive" } },
            { extractedText: { contains: query, mode: "insensitive" } },
          ],
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      return documents.map((doc) => ({
        documentId: doc.id,
        filename: doc.filename,
        summary: doc.summary,
        similarity: 0.5, // Mock similarity score
        keyInsights: doc.keyInsights,
      }));
    } catch (error) {
      console.error("Document search error:", error);
      return [];
    }
  }

  /**
   * Get document processing statistics
   */
  async getProcessingStats(companyId: string): Promise<{
    totalDocuments: number;
    totalSize: number;
    typeDistribution: Record<string, number>;
    avgProcessingTime: number;
    successRate: number;
  }> {
    try {
      const stats = await db.document.aggregate({
        where: { companyId },
        _count: { id: true },
        _sum: { size: true },
        _avg: { confidence: true },
      });

      const typeStats = await db.document.groupBy({
        where: { companyId },
        by: ["mimeType"],
        _count: { mimeType: true },
      });

      return {
        totalDocuments: stats._count.id,
        totalSize: stats._sum.size || 0,
        typeDistribution: typeStats.reduce(
          (acc, item) => {
            acc[item.mimeType] = item._count.mimeType;
            return acc;
          },
          {} as Record<string, number>
        ),
        avgProcessingTime: 0, // Would need to track this separately
        successRate: stats._avg.confidence || 0,
      };
    } catch (error) {
      console.error("Error getting processing stats:", error);
      return {
        totalDocuments: 0,
        totalSize: 0,
        typeDistribution: {},
        avgProcessingTime: 0,
        successRate: 0,
      };
    }
  }
}

export const documentProcessor = new DocumentProcessor();
