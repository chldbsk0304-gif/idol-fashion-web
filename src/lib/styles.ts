// The canonical Musinsa 15-style order. Kept here (not in the React tree) so
// API routes and matching logic stay decoupled from UI.

export const STYLE_ORDER = [
  '캐주얼', '스트릿', '미니멀', '걸리시', '스포티',
  '로맨틱', '클래식', '시크', '워크웨어', '시티보이',
  '고프코어', '레트로', '프레피', '리조트', '에스닉',
] as const;

export type Style = (typeof STYLE_ORDER)[number];

export type StyleDistribution = Partial<Record<string, number>>;

// Vision endpoint contract
export interface AnalyzeResponse {
  distribution: StyleDistribution;
  dominant_style: string;
  confidence: number;
  brief_analysis: string;
}

// One worn product to surface in the result page's product carousel.
export interface IdolItem {
  brand: string | null;
  productName: string | null;
  style: string | null;
  imageUrl: string | null;
  postUrl: string | null;
}

// Match endpoint contract
export interface MatchedIdol {
  name: string;            // identifier (Korean name used as DB key)
  nameKr: string;          // display name (Korean)
  group: string;
  primary: string;         // primary style
  score: number;           // cosine similarity 0..1
  seed: number;            // deterministic palette seed for IdolPortrait
  /** Real OOTD image URL when we have one for the idol; falls back to portrait. */
  imageUrl?: string;
  distribution: StyleDistribution;
  totalItems: number;
  /** Up to ~12 worn items, primary-style first. Only set on the top match. */
  items?: IdolItem[];
}

export interface MatchResponse {
  user_distribution: StyleDistribution;
  matches: MatchedIdol[];  // 1st + 2 secondary (length 3 when DB has enough)
  considered: number;      // how many idols passed the min-items filter
}
