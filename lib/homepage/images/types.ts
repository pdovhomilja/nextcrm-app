export type ImageSpec = {
  token: string;
  role: "hero" | "section";
  prompt: string;
  alt: string;
  aspectRatio: "16:9" | "4:5";
};

export type GeneratedImage = {
  token: string;
  alt: string;
  url: string;
};

export interface ImageProvider {
  readonly name: string;
  isConfigured(): boolean;
  /** Returns raw image bytes (type detected at store time), or throws on failure (caller handles fallback/fail-open). */
  generateImage(spec: ImageSpec): Promise<Buffer>;
}

export const imageToken = (i: number): string => `__RADE_IMG_${i}__`;
