"""
Doubt Solver Service — orchestration layer.

Coordinates Tavily searches and LLM synthesis to answer student questions.
"""

import logging
import json
import re
from typing import Any

from langchain.chat_models import init_chat_model
from ..config import Config
from . import tavily_service
from ..utils.doubt_solver_prompts import DOUBT_SYNTHESIS_PROMPT, format_search_results

logger = logging.getLogger(__name__)

# Initialize LLM (reuse same model as Agent)
model = init_chat_model(
    "perplexity:sonar-pro",
    api_key=Config.PERPLEXITY_API_KEY
)


def ask_doubt(question: str) -> dict[str, Any]:
    """
    Answer a student's doubt by:
    1. Searching multiple sources (general, GitHub, YouTube)
    2. Synthesizing via LLM
    3. Returning structured result with explanation + resources
    
    Returns:
    {
        "success": true,
        "explanation": "...",
        "youtube_videos": [...],
        "documentation": [...],
        "practice_resources": [...],
        "github_examples": [...]
    }
    """
    
    # Validation
    if not question or len(question.strip()) < 5:
        return {
            "success": False,
            "error": "Question must be at least 5 characters"
        }
    
    if len(question) > 300:
        return {
            "success": False,
            "error": "Question must be under 300 characters"
        }
    
    question = question.strip()
    logger.info(f"Answering doubt: {question}")
    
    try:
        # Step 1: Parallel searches
        logger.info("Starting parallel searches...")
        search_results = tavily_service.search_parallel(question)
        
        # Log result counts
        for source, results in search_results.items():
            logger.info(f"{source}: {len(results)} results")
        
        # Step 2: Format results for LLM
        general_formatted = format_search_results(search_results.get("general", []))
        github_formatted = format_search_results(search_results.get("github", []))
        youtube_formatted = format_search_results(search_results.get("youtube", []))
        
        # Step 3: LLM synthesis
        logger.info("Sending to LLM for synthesis...")
        prompt = DOUBT_SYNTHESIS_PROMPT.format(
            question=question,
            general_results=general_formatted,
            github_results=github_formatted,
            youtube_results=youtube_formatted,
        )
        
        response = model.invoke(prompt)
        response_text = response.content.strip()
        
        # Strip markdown fences defensively
        response_text = re.sub(r"```json\n?", "", response_text)
        response_text = re.sub(r"```\n?", "", response_text)
        response_text = response_text.strip()
        
        # Parse JSON
        logger.info("Parsing LLM response...")
        result_data = json.loads(response_text)
        
        # Validate required fields
        required_fields = ["explanation", "youtube_videos", "documentation", "practice_resources", "github_examples"]
        for field in required_fields:
            if field not in result_data:
                result_data[field] = []
        
        logger.info("Doubt answer generated successfully")
        
        return {
            "success": True,
            "explanation": result_data.get("explanation", ""),
            "youtube_videos": result_data.get("youtube_videos", []),
            "documentation": result_data.get("documentation", []),
            "practice_resources": result_data.get("practice_resources", []),
            "github_examples": result_data.get("github_examples", []),
        }
    
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {e}")
        return {
            "success": False,
            "error": "Failed to generate answer. Please try a different question."
        }
    
    except Exception as e:
        logger.exception(f"Doubt solver error: {e}")
        return {
            "success": False,
            "error": "An error occurred while processing your question. Please try again."
        }
