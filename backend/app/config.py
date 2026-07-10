import os
from dotenv import load_dotenv
load_dotenv()

class Config:
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    MURF_API_KEY = os.getenv("MURF_API_KEY")
    ASSEMBLYAI_API_KEY = os.getenv("ASSEMBLYAI_API_KEY")
    FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY")
