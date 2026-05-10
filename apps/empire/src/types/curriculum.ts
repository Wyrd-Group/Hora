// ── Content Block Types ──

export type BlockType =
  | 'heading'
  | 'text'
  | 'keyterm'
  | 'callout'
  | 'activity'
  | 'diagram'
  | 'code'
  | 'image'
  | 'quiz'       // inline quiz within lesson
  | 'quote'      // blockquote / pull-quote
  | 'truefalse'
  | 'matching'
  | 'essay'
  // ── Interactive block types (F0/F1+ short-attention formats) ──
  | 'microcard'    // swipeable 1-concept 30-60 sec card
  | 'scenario'     // "you're the CFO" A/B/C branching decision card
  | 'calculator'   // interactive financial calculator widget (compound, budget, etc.)
  | 'datasight'    // read a chart/statement excerpt, answer a question
  | 'casetree'     // multi-step branching case study with graded outcome
  | 'flashcard'    // spaced-repetition term/definition flip card
  // ── Jurisdictional block type ──
  | 'jurisdictionGroup'; // country/supranational-filtered content variants

export type CalloutVariant = 'info' | 'warning' | 'tip' | 'example' | 'funfact';

export interface ActivityItem {
  statement?: string;    // truefalse
  answer?: boolean | number; // truefalse (boolean) or multiplechoice (index)
  question?: string;     // multiplechoice
  options?: string[];    // multiplechoice
  answer_index?: number; // multiplechoice (named for ecflContent compat)
  explanation?: string;  // multiplechoice
  left?: string;         // matching pair left side
  right?: string;        // matching pair right side
}

export interface ContentBlock {
  type: BlockType;
  content?: string;
  level?: number;           // heading level 1-4
  term?: string;            // keyterm: the term itself
  definition?: string;      // keyterm: the definition
  variant?: CalloutVariant; // callout variant (courseContent format)
  style?: string;           // callout/activity style (ecflContent format — alias for variant)
  title?: string;           // callout/activity title
  instructions?: string;    // activity instructions
  items?: ActivityItem[];   // activity items (truefalse, matching, multiplechoice)
  description?: string;     // diagram description (text-based diagrams)
  src?: string;             // image source
  alt?: string;             // image alt / diagram alt
  caption?: string;         // image caption
  language?: string;        // code block language
  options?: string[];       // quiz options
  correctIndex?: number;    // quiz correct answer index
  answer?: number;          // quiz answer (alias)
  explanation?: string;     // quiz explanation
  pairs?: { left: string; right: string }[]; // matching pairs
  attribution?: string;     // quote attribution
  cite?: string;            // quote citation
  // ── Interactive block fields ──
  cards?: { front: string; back: string; hint?: string }[];    // microcard / flashcard sequence
  prompt?: string;                                              // scenario / datasight prompt
  choices?: { label: string; outcome: string; correct?: boolean }[]; // scenario branching choices
  calculator?: 'compound' | 'budget-50-30-20' | 'loan' | 'bond-price' | 'dcf' | 'option-payoff' | 'duration'; // calculator kind
  chartSpec?: string;                                           // datasight: text description of chart to render
  tree?: {                                                      // casetree: branching graph
    root: string;
    nodes: Record<string, { text: string; choices?: { label: string; next: string; score?: number }[]; terminal?: boolean; verdict?: string }>;
  };
  // ── JurisdictionGroup fields ──
  topic?: string;                                               // human-readable topic label (e.g. "Retirement accounts")
  regions?: Record<string, ContentBlock[]>;                     // keyed by country code / supranational code / "DEFAULT"
}

// ── Lesson & Course ──

export interface Lesson {
  id: string;
  title: string;
  duration?: string;   // e.g. '15 min'
  content: ContentBlock[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface Exam {
  id: string;
  title: string;
  passingScore: number; // 0-100
  timeLimit?: number;   // seconds
  questions: QuizQuestion[];
}

export type CourseTrack = 'foundation' | 'ecfl';

export interface Course {
  id: string;
  title: string;
  description: string;
  icon: string;
  track?: CourseTrack;      // 'foundation' = game unlock, 'ecfl' = professional certification
  band?: 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6'; // ECFL band
  lessons: Lesson[];
  exam?: Exam;
  prerequisites?: string[]; // course IDs
  unlocks?: string;         // what game feature this course unlocks (foundation track)
}

// ── Glossary ──

export interface GlossaryTerm {
  term: string;
  category: string;
  definition: string;
  why?: string;
  interpret?: string;
  marketEffect?: string;
}

// ── Scenario ──

export interface ScenarioValidator {
  type: string; // e.g. 'UNIQUE_ASSETS_GTE', 'MAX_ALLOCATION_LTE'
  value: number;
  asset?: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  startingBalance: number;
  validators: ScenarioValidator[];
  targetValue?: number;
  timeLimit?: number;
}

// ── Certificate ──

export type DistinctionLevel = 'Pass' | 'Merit' | 'Distinction' | 'High Distinction';

export interface Certificate {
  id: string;
  courseId: string;
  courseName: string;
  earnedAt: number; // timestamp
  verificationCode: string;
  band?: 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6';
  score?: number;           // exam percentage
  grade?: string;           // A+, A, A-, B+, B, B-, C+, C
  distinction?: DistinctionLevel;
  totalQuestions?: number;
  correctAnswers?: number;
  timeTaken?: number;       // seconds
  timeAllowed?: number;     // seconds
}

// ── Notebook ──

export interface NotebookEntry {
  id: string;
  lessonId: string;
  text: string;
  createdAt: number;
}
