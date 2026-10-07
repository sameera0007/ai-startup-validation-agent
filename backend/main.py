import os
import json
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from duckduckgo_search import DDGS
from crawl4ai import AsyncWebCrawler
import google.generativeai as genai

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
# Using Gemini 1.5 Flash - extremely fast and free
model = genai.GenerativeModel(
    'gemini-1.5-flash',
    generation_config={"response_mime_type": "application/json"}
)

class ValidationRequest(BaseModel):
    idea: str
    audience: str

# --- 1. FREE TOOLS ---
def search_duckduckgo(query: str, max_results=3):
    try:
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            return results
    except Exception as e:
        return []

async def scrape_urls(urls: list[str]):
    scraped_data = ""
    async with AsyncWebCrawler() as crawler:
        for url in urls:
            try:
                result = await crawler.arun(url=url)
                scraped_data += f"\n\n--- Source: {url} ---\n{result.markdown[:1500]}"
            except:
                continue
    return scraped_data

# --- 2. AGENT PIPELINE & STREAMING ---
async def validation_generator(request: ValidationRequest):
    idea = request.idea
    audience = request.audience

    yield {"data": json.dumps({"status": "thinking", "message": "🔍 Formulating market search queries..."})}
    await asyncio.sleep(0.5) 
    
    yield {"data": json.dumps({"status": "thinking", "message": f"🌐 Searching DuckDuckGo for existing '{idea}' solutions..."})}
    # Run synchronous search in a thread to avoid blocking asyncio
    search_results = await asyncio.to_thread(search_duckduckgo, f"top competitors tools software for {idea}")
    urls_to_scrape = [res['href'] for res in search_results if 'href' in res][:2]
    
    yield {"data": json.dumps({"status": "thinking", "message": "🕷️ Scraping competitor landing pages with Crawl4AI..."})}
    scraped_context = await scrape_urls(urls_to_scrape)
    
    yield {"data": json.dumps({"status": "thinking", "message": "🧠 Running Gemini 1.5 Market Evaluation..."})}
    
    prompt = f"""
    You are an elite VC and startup evaluator. Validate this idea based strictly on the scraped market context.
    Idea: {idea}
    Audience: {audience}
    
    Market Context:
    {scraped_context}
    
    Return your analysis STRICTLY using this exact JSON schema:
    {{
        "score": 85,
        "verdict": "GO",
        "market_demand": "reasoning string",
        "defensibility": "reasoning string",
        "competitors": [{{"name": "Comp 1", "weakness": "their flaw"}}],
        "recommendations": ["step 1", "step 2"]
    }}
    """

    try:
        # Generate content using Gemini
        response = await asyncio.to_thread(model.generate_content, prompt)
        final_json = response.text
        yield {"data": json.dumps({"status": "complete", "report": json.loads(final_json)})}
    except Exception as e:
        yield {"data": json.dumps({"status": "error", "message": str(e)})}

@app.post("/api/validate")
async def validate_idea(request: ValidationRequest):
    return EventSourceResponse(validation_generator(request))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)