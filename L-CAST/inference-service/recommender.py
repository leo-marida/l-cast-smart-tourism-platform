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
        # Encode user profile once (Result is a 2D array: [1, 384])
        user_vector = model.encode([user_preferences_string])
        results = []
        
        for poi in poi_list:
            # 1. Similarity
            poi_desc = poi.get('description') or poi.get('name')
            
            # Encode POI (Result is a 2D array: [1, 384])
            poi_vector = model.encode([poi_desc])
            
            # ✅ FIX: Removed extra brackets around poi_vector.
            # user_vector is (1, 384) and poi_vector is (1, 384).
            # cosine_similarity expects two 2D arrays.
            sim_score = cosine_similarity(user_vector, poi_vector)[0][0]
            
            # 2. Friction (Now returns detailed factors)
            mu, factors = friction_engine.calculate_final_mu(poi['lat'], poi['lon'], poi['region'])
            
            # 3. Hybrid Score
            final_score = sim_score * mu
            
            results.append({
                "id": poi['id'],
                "name": poi['name'],
                "region": poi['region'],
                "final_score": float(final_score),
                "match_rate": float(sim_score),
                "friction_index": float(mu),
                "safety_factors": factors, 
                "xai_explanation": self.generate_xai(sim_score, mu)
            })
            
        # Return ALL results (sorted) so frontend can show bad ones too
        return sorted(results, key=lambda x: x['final_score'], reverse=True)

    def generate_xai(self, sim, mu):
        # Simple explanation string
        return f"Interest Match: {int(sim*100)}%"