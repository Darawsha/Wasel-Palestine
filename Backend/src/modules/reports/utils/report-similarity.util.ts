import { ReportCategory } from '../enums/report-category.enum';

export const RECENT_SIMILAR_REPORT_WINDOW_MS = 30 * 60 * 1000;
export const RECENT_OWN_DUPLICATE_REPORT_WINDOW_MS = 15 * 60 * 1000;
export const SIMILAR_REPORT_LOCATION_RADIUS_METERS = 50;
export const SIMILAR_REPORT_MESSAGE =
  'A similar report was added recently with the same information. Your report was recorded in My Reports but was not published as a separate community report.';
export const OWN_DUPLICATE_REPORT_MESSAGE =
  'You already submitted this same report recently. Please wait before submitting it again.';

type ReportMeaningInput = {
  category: ReportCategory;
  description?: string | null;
};

const CHECKPOINT_CONDITION_PATTERNS: Record<string, RegExp[]> = {
  closed: [
    /\b(closed|closure|blocked|blockage|shut|sealed|impassable)\b/i,
    /(?:مغلق|مغلقة|اغلاق|إغلاق|مسكر|مسكرة|مقفل|مقفلة)/u,
  ],
  delayed: [
    /\b(delay|delayed|traffic|jam|congestion|slow|waiting|queue)\b/i,
    /(?:تأخير|تاخير|متأخر|زحمة|ازدحام|طابور|انتظار|بطيء)/u,
  ],
  restricted: [
    /\b(restricted|restriction|limited|permit|ids?|inspection|checkpoint only)\b/i,
    /(?:مقيد|تقييد|تصاريح|تصريح|تفتيش|هويات|هوية|محدود)/u,
  ],
  open: [
    /\b(open|opened|clear|cleared|reopened|normal)\b/i,
    /(?:مفتوح|فتحو|سالكة|سالك|طبيعي|طبيعية)/u,
  ],
};

function normalizeText(value?: string | null): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectCheckpointCondition(description?: string | null): string {
  const normalizedDescription = normalizeText(description);

  for (const [condition, patterns] of Object.entries(CHECKPOINT_CONDITION_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(normalizedDescription))) {
      return condition;
    }
  }

  return 'general';
}

function getMeaningTokens(description?: string | null): Set<string> {
  return new Set(
    normalizeText(description)
      .split(' ')
      .map((token) => token.trim())
      .filter((token) => token.length >= 3),
  );
}

function haveSimilarOtherDescriptions(
  leftDescription?: string | null,
  rightDescription?: string | null,
): boolean {
  const leftText = normalizeText(leftDescription);
  const rightText = normalizeText(rightDescription);

  if (!leftText || !rightText) {
    return false;
  }

  if (leftText === rightText) {
    return true;
  }

  const leftTokens = getMeaningTokens(leftText);
  const rightTokens = getMeaningTokens(rightText);
  const smallerSize = Math.min(leftTokens.size, rightTokens.size);

  if (smallerSize < 3) {
    return false;
  }

  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap / smallerSize >= 0.75;
}

export function haveSameEffectiveReportMeaning(
  left: ReportMeaningInput,
  right: ReportMeaningInput,
): boolean {
  if (left.category !== right.category) {
    return false;
  }

  if (left.category === ReportCategory.CHECKPOINT_ISSUE) {
    return (
      detectCheckpointCondition(left.description) ===
      detectCheckpointCondition(right.description)
    );
  }

  if (left.category === ReportCategory.OTHER) {
    return haveSimilarOtherDescriptions(left.description, right.description);
  }

  return true;
}

export function getRecentSimilarReportThreshold(referenceDate = new Date()): Date {
  return new Date(referenceDate.getTime() - RECENT_SIMILAR_REPORT_WINDOW_MS);
}

export function getRecentOwnDuplicateReportThreshold(
  referenceDate = new Date(),
): Date {
  return new Date(
    referenceDate.getTime() - RECENT_OWN_DUPLICATE_REPORT_WINDOW_MS,
  );
}
