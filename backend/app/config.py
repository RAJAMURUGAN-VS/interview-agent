import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
    MURF_API_KEY = os.getenv("MURF_API_KEY")
    ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
    FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
