import numpy as np
import os
import shutil
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from friction_engine import FrictionEngine

# --- SELF-HEALING MODEL LOADER ---
def load_robust_model(model_name='all-MiniLM-L6-v2'):
    """
    Attempts to load the AI model. 
    If a 'Consistency check failed' error occurs (corrupted download),
    it deletes the cache and forces a fresh download.
    """
    try:
        print(f"Loading AI Model: {model_name}...")
        return SentenceTransformer(model_name)
    except Exception as e:
        print(f"CRITICAL LOAD ERROR: {e}")
        print("Detected corrupted model cache. Initiating self-repair...")
        
        # Location where Hugging Face stores files
        cache_dir = os.path.expanduser('~/.cache/huggingface')
        if os.path.exists(cache_dir):
            print(f"Deleting corrupted cache at: {cache_dir}")
            shutil.rmtree(cache_dir) # Wipe the bad files
        
        print("Retrying download...")
        return SentenceTransformer(model_name)

# Initialize components
model = load_robust_model()
friction_engine = FrictionEngine()

class LCastRecommender:
    def recommend(self, user_preferences_string, poi_list):
        """
        poi_list: List of dicts {id, name, description, lat, lon, region}
        """
        # 1. Convert user text to vector
        user_vector = model.encode([user_preferences_string])
        
        results = []
        for poi in poi_list:
            # 2. Content-Based Score
            poi_desc = poi.get('description') or poi.get('name') # Fallback if desc is empty
            poi_vector = model.encode([poi_desc])
            
            sim_score = cosine_similarity(user_vector, [poi_vector])[0][0]
            
            # 3. Real-time Friction
            mu, reasons = friction_engine.calculate_final_mu(poi['lat'], poi['lon'], poi['region'])
            
            final_score = sim_score * mu
            
            results.append({
                "poi_id": poi['id'],
                "name": poi['name'],
                "final_score": float(final_score),
                "mu_applied": mu,
                "safety_reasons": reasons,
                "xai_explanation": self.generate_xai(sim_score, mu, reasons)
            })
            
        return sorted(results, key=lambda x: x['final_score'], reverse=True)[:10]

    def generate_xai(self, sim, mu, reasons):
        base = f"This matches {int(sim*100)}% of your profile."
        if mu < 1.0:
            return base + f" Warning: Visibility reduced due to {', '.join(reasons)}."
        return base + " Area is currently stable."