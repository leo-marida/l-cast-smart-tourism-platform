from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from recommender import LCastRecommender

# Initialize the API
app = FastAPI(title="L-CAST Inference Engine")

# Initialize the Brain (Loads BERT Model & Connects to Redis/APIs)
# We do this globally so the model loads only once on startup, not every request.
recommender_engine = LCastRecommender()

# --- INPUT MODELS ---
# Updated to include Lat/Lon so the Friction Engine can check local weather
class POICandidate(BaseModel):
    id: int
    name: str
    description: str
    region: str
    lat: float  
    lon: float
    base_popularity: float = 0.5 # Default if missing

class ReRankRequest(BaseModel):
    user_id: Optional[int] = None
    user_interest_profile: str  # e.g., "I love hiking and ancient ruins"
    candidates: List[POICandidate]

# --- API ENDPOINTS ---

@app.get("/")
def health_check():
    return {"status": "online", "service": "L-CAST Brain"}

@app.post("/v1/recommend")
def recommend(payload: ReRankRequest):
    """
    Receives a list of candidates from the Gateway.
    Returns the list re-ranked by Safety (Friction) and Interest (Cosine Sim).
    """
    if not payload.candidates:
        return []

    try:
        # 1. Convert Pydantic models to a list of dictionaries
        # This makes it compatible with our 'LCastRecommender' class
        poi_data = [poi.dict() for poi in payload.candidates]
        
        # 2. Delegate to the Intelligent Engine
        # The engine handles:
        #   - Vectorizing the user text (BERT)
        #   - Fetching Real-time Weather/News (FrictionEngine)
        #   - Computing the Weighted Harmonic Mean
        #   - Generating the 'Why am I seeing this?' explanation
        ranked_results = recommender_engine.recommend(
            user_preferences_string=payload.user_interest_profile,
            poi_list=poi_data
        )
        
        return ranked_results

    except Exception as e:
        print(f"CRITICAL ML ERROR: {str(e)}")
        # Graceful Degradation:
        # If the ML crashes, return a 500 so the Gateway knows to fall back 
        # to basic raw data (as defined in your Gateway's circuit breaker).
        raise HTTPException(status_code=500, detail=str(e))