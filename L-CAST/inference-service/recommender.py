import numpy as np
import os
import shutil
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from friction_engine import FrictionEngine

def load_robust_model(model_name='all-MiniLM-L6-v2'):
    try:
        print(f"Loading AI Model: {model_name}...")
        return SentenceTransformer(model_name)
    except Exception as e:
        print(f"CRITICAL LOAD ERROR: {e}")
        cache_dir = os.path.expanduser('~/.cache/huggingface')
        if os.path.exists(cache_dir):
            shutil.rmtree(cache_dir)
        return SentenceTransformer(model_name)

model = load_robust_model()
friction_engine = FrictionEngine()

class LCastRecommender:
    def recommend(self, user_preferences_string, poi_list):
        user_vector = model.encode([user_preferences_string])
        results = []
        
        # 🚀 STEP 1: PRE-FETCH WEATHER (Parallel)
        # This makes the loop below instant
        coords = [(p['lat'], p['lon']) for p in poi_list]
        friction_engine.warm_up_cache(coords)
        
        # STEP 2: Process Rankings
        for poi in poi_list:
            # 1. Similarity
            poi_desc = poi.get('description') or poi.get('name')
            poi_vector = model.encode([poi_desc])
            sim_score = cosine_similarity(user_vector, poi_vector)[0][0]
            
            # 2. Friction (Now instant due to cache)
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
            
        return sorted(results, key=lambda x: x['final_score'], reverse=True)

    def generate_xai(self, sim, mu):
        return f"Interest Match: {int(sim*100)}%"