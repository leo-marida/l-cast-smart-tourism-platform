from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from recommender import LCastRecommender
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="L-CAST Inference Engine")

try:
    recommender_engine = LCastRecommender()
    logger.info("AI Model Loaded Successfully")
except Exception as e:
    logger.error(f"Failed to load AI Model: {e}")

# --- INPUT MODELS ---
class POICandidate(BaseModel):
    id: int
    name: str
    description: Optional[str] = "No description"
    region: Optional[str] = "Lebanon"
    lat: float  
    lon: float
    base_popularity_score: float = 0.5
    
    # ✅ FIX: Explicitly allow these fields to prevent crashing
    image_url: Optional[str] = None
    distance_meters: Optional[float] = None
    
    class Config:
        extra = "allow" 

class ReRankRequest(BaseModel):
    user_id: Optional[int] = None
    user_interest_profile: str = "General"
    candidates: List[POICandidate]

@app.get("/")
def health_check():
    return {"status": "online"}

@app.post("/v1/recommend")
def recommend(payload: ReRankRequest):
    if not payload.candidates:
        return []

    try:
        poi_data = [poi.dict() for poi in payload.candidates]
        ranked_results = recommender_engine.recommend(
            user_preferences_string=payload.user_interest_profile,
            poi_list=poi_data
        )
        return ranked_results
    except Exception as e:
        logger.error(f"ML ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))