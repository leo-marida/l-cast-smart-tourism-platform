from fastapi import FastAPI, HTTPException, Security
from fastapi.security import APIKeyHeader
from recommender import LCastRecommender
import os

app = FastAPI(title="L-CAST Inference Service")
engine = LCastRecommender()

# Security: Internal API Key so only our Gateway can call this service
API_KEY_NAME = "X-Internal-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME)

def get_api_key(api_key: str = Security(api_key_header)):
    # IT COMPARES THE INCOMING HEADER TO THE SECRET
    if api_key != os.getenv("INTERNAL_SERVICE_KEY"):
        raise HTTPException(status_code=403, detail="Could not validate credentials")
    return api_key

@app.post("/v1/recommend")
async def get_results(payload: dict, api_key: str = Security(get_api_key)):
    """
    Payload contains: user_prefs, poi_candidates
    """
    try:
        user_prefs = payload.get("user_prefs")
        pois = payload.get("poi_candidates")
        
        recommendations = engine.recommend(user_prefs, pois)
        return {"status": "success", "data": recommendations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/v1/update-feedback")
async def update_feedback(payload: dict):
    """
    Automatically adjust the User's Interest Vector based on behavior.
    If they click a 'Nature' site, we bump their Nature preference by 0.02.
    """
    current_vector = np.array(payload['current_vector'])
    poi_category_index = payload['category_index'] # e.g., Nature = 3
    
    # Reinforcement Learning: Slowly shift the vector toward their actions
    current_vector[poi_category_index] = min(1.0, current_vector[poi_category_index] + 0.02)
    
    return {"new_vector": current_vector.tolist()}