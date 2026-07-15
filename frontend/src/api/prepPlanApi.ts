import type {
  PrepPlanGenerateResponse,
  PrepPlanStatusResponse,
  PrepPlanCachedCompaniesResponse,
} from '../types';

const BASE = import.meta.env.VITE_API_URL;

// ---------------------------------------------------------------------------
// POST /prep-plan/generate
// ---------------------------------------------------------------------------
export async function generatePrepPlan(params: {
  companyName: string;
  days: number;
}): Promise<PrepPlanGenerateResponse> {
  const res = await fetch(`${BASE}/prep-plan/generate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(params),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// GET /prep-plan/company-status?company=
// ---------------------------------------------------------------------------
export async function getCompanyStatus(
  company: string
): Promise<PrepPlanStatusResponse> {
  const res = await fetch(
    `${BASE}/prep-plan/company-status?company=${encodeURIComponent(company)}`
  );
  return res.json();
}

// ---------------------------------------------------------------------------
// GET /prep-plan/cached-companies
// ---------------------------------------------------------------------------
export async function getCachedCompanies(): Promise<PrepPlanCachedCompaniesResponse> {
  const res = await fetch(`${BASE}/prep-plan/cached-companies`);
  return res.json();
}
