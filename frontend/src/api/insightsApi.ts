import type {
  CompanySummary,
  CompanyDetail,
  InsightsSubmitResponse,
  InsightsUpvoteResponse,
  InsightsSearchResponse,
  InsightsPostType,
  ExperienceDraft,
  PreparationDraft,
} from '../types';

const BASE = import.meta.env.VITE_API_URL;

// ---------------------------------------------------------------------------
// GET /insights/companies?search=<query>
// ---------------------------------------------------------------------------
export async function getCompanies(search = ''): Promise<CompanySummary[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${BASE}/insights/companies${params}`);
  if (!res.ok) throw new Error('Failed to fetch companies');
  return res.json();
}

// ---------------------------------------------------------------------------
// GET /insights/companies/<company>
// ---------------------------------------------------------------------------
export async function getCompanyPosts(company: string): Promise<CompanyDetail> {
  const res = await fetch(
    `${BASE}/insights/companies/${encodeURIComponent(company)}`
  );
  if (!res.ok) throw new Error(`Failed to fetch posts for ${company}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// POST /insights/experience
// ---------------------------------------------------------------------------
export async function submitExperience(
  draft: ExperienceDraft
): Promise<InsightsSubmitResponse> {
  const res = await fetch(`${BASE}/insights/experience`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      company:    draft.company,
      role:       draft.role,
      department: draft.department,
      offerType:  draft.offerType,
      difficulty: draft.difficulty,
      outcome:    draft.outcome,
      rounds:     draft.rounds,
      tips:       draft.tips,
    }),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// POST /insights/preparation
// ---------------------------------------------------------------------------
export async function submitPreparation(
  draft: PreparationDraft
): Promise<InsightsSubmitResponse> {
  const res = await fetch(`${BASE}/insights/preparation`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      company:           draft.company,
      role:              draft.role,
      department:        draft.department,
      prepDurationWeeks: Number(draft.prepDurationWeeks),
      codingPlatforms:   draft.codingPlatforms,
      studyMaterials:    draft.studyMaterials,
      youtubeChannels:   draft.youtubeChannels,
      dailyRoutine:      draft.dailyRoutine,
      advice:            draft.advice,
    }),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// POST /insights/upvote/<post_type>/<id>
// ---------------------------------------------------------------------------
export async function upvotePost(
  postType: InsightsPostType,
  postId: string
): Promise<InsightsUpvoteResponse> {
  const res = await fetch(`${BASE}/insights/upvote/${postType}/${postId}`, {
    method: 'POST',
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// POST /insights/report/<post_type>/<id>
// ---------------------------------------------------------------------------
export async function reportPost(
  postType: InsightsPostType,
  postId: string
): Promise<{ success: boolean; error?: string }> {
  const res = await fetch(`${BASE}/insights/report/${postType}/${postId}`, {
    method: 'POST',
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// GET /insights/search?q=<query>
// ---------------------------------------------------------------------------
export async function searchInsights(q: string): Promise<InsightsSearchResponse> {
  const res = await fetch(
    `${BASE}/insights/search?q=${encodeURIComponent(q)}`
  );
  return res.json();
}
