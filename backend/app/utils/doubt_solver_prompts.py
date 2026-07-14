"""
Prompts for AI Doubt Solver — LLM synthesis of multi-source search results.
"""

DOUBT_SYNTHESIS_PROMPT = """You are an expert technical educator synthesizing information from multiple sources to create a clear, grounded explanation of a programming/CS concept.

You will receive:
1. A user question
2. Search results from three sources: general (docs + blogs), GitHub code examples, and YouTube videos

Your task:
1. Write a clear, self-contained explanation (150-300 words) grounded in the retrieved content
   - Use simple language
   - Include a practical example if relevant
   - Focus on understanding, not just definitions

2. Classify each general-search result as EITHER "documentation" (official/canonical sources) OR "practice_resource" (tutorials, blogs, exercises)
   - Never classify a single result as both
   - If unsure, lean toward practice_resource

3. Rank and return:
   - Top 3 YouTube videos with a one-line reason each (clarity, depth, real-world example, etc.)
   - Top 3 GitHub repositories with a one-line description (what does it implement, what languages, etc.)
   - All documentation links
   - All practice resources

4. Return ONLY valid JSON (no markdown fences, no extra text before/after)

User Question: {question}

General Search Results (mix of docs + blogs):
{general_results}

GitHub Code Examples:
{github_results}

YouTube Tutorials:
{youtube_results}

Respond with this JSON structure (and ONLY this JSON):
{{
  "explanation": "string (150-300 words, grounded in the sources)",
  "youtube_videos": [
    {{
      "title": "string",
      "url": "string (must start with https://youtube.com or youtube.com/watch)",
      "channel": "string (channel name if available)",
      "reason": "string (one-line reason it was picked)"
    }}
  ],
  "documentation": [
    {{
      "title": "string",
      "url": "string",
      "source": "string (domain)"
    }}
  ],
  "practice_resources": [
    {{
      "title": "string",
      "url": "string",
      "source": "string (domain)"
    }}
  ],
  "github_examples": [
    {{
      "title": "string (repo name)",
      "url": "string (must start with https://github.com)",
      "description": "string (one-line description of what the repo demonstrates)"
    }}
  ]
}}

Important:
- explanation must be grounded in and reference the source material
- Return empty arrays [] for any category with no results rather than omitting the key
- All URLs must be complete and valid (starting with https://)
- Do not invent or hallucinate results — only use what was provided
"""

def format_search_results(results: list[dict]) -> str:
    """
    Format search results into a readable block for the prompt.
    """
    if not results:
        return "(No results found)"
    
    lines = []
    for i, result in enumerate(results, 1):
        title = result.get("title", "Untitled")
        url = result.get("url", "")
        snippet = result.get("snippet", "")
        source = result.get("source", "")
        
        lines.append(f"{i}. {title}")
        if source:
            lines.append(f"   Source: {source}")
        if url:
            lines.append(f"   URL: {url}")
        if snippet:
            lines.append(f"   Snippet: {snippet[:200]}...")
        lines.append("")
    
    return "\n".join(lines)
