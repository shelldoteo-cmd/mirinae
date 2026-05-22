export interface StoryContext {
  topic: string;
  keywords: string[];
  selectedType?: YadamType;
  recommendedTypes?: YadamType[];
  analysis?: InputAnalysis;
  selectedHook?: HookCandidate;
  hookCandidates?: HookCandidate[];
  plotPlan?: PlotPlan;
  actScripts: Record<number, string>;
  polishedScript?: string;
  validationResult?: ValidationResult;
  ttsSegments?: TtsSegment[];
}

export interface InputAnalysis {
  mainCharacters: string;
  setting: string;
  narrativeConflict: string;
  foreshadowingPlan: string;
  lessonDirection: string;
}

export interface YadamType {
  name: string;
  description: string;
  tone: string;
  reason: string;
}

export interface HookCandidate {
  id: number;
  title: string;
  hookText: string;
  technique: string;
}

export interface PlotPlan {
  acts: {
    actNumber: number;
    title: string;
    synopsis: string;
    keyLines: string;
    foreshadowingDetails: string;
  }[];
  lesson: string;
}

export interface ValidationResult {
  charCount: number;
  pureTextCharCount: number;
  isValidCharCount: boolean;
  hasHook: boolean;
  hookCheckDetails: string;
  hasForeshadowingResolved: boolean;
  foreshadowingDetails: string;
  hasLesson: boolean;
  lessonDetails: string;
  isCrueltyMinimized: boolean;
  crueltyDetails: string;
  metadataCoveragePercentage: number;
  metadataCoverageDetails: string;
  translationToneCount: number;
  translationToneDetails: string;
  isTranslationToneClean: boolean;
  overallPassed: boolean;
}

export interface TtsSegment {
  id: number;
  speakerId: string;
  emotion: string;
  type: "N" | "대사" | "BGM" | "E";
  text: string;
  pauseAfterMs: number;
  ssml?: string;
  isUnknownSpeaker?: boolean;
}
