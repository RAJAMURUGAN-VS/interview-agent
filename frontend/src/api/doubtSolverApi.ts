import type {
  DoubtSolverResult,
  DoubtSolverResponse,
} from '../types';

const BASE = import.meta.env.VITE_API_URL;

/**
 * Ask a doubt question and get an AI-synthesized answer with resources.
 */
export async function askDoubt(
  question: string,
): Promise<DoubtSolverResult> {
  const res = await fetch(`${BASE}/doubt-solver/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  // Try to parse response as JSON for better error messages
  let data: DoubtSolverResponse;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error(`Failed to ask doubt: ${res.status} ${res.statusText}`);
  }

  // Check for API-level errors first
  if (!res.ok) {
    throw new Error(`Failed to ask doubt: ${data.error || res.statusText}`);
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to generate answer');
  }

  return {
    explanation: data.explanation || '',
    youtubeVideos: data.youtube_videos || [],
    documentation: data.documentation || [],
    practiceResources: data.practice_resources || [],
    githubExamples: data.github_examples || [],
  };
}
