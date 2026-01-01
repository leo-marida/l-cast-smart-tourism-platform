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
        # Clear cache and retry
        cache_dir = os.path.expanduser('~/.cache/huggingface')
        if os.path.exists(cache_dir):
            shutil.rmtree(cache_dir)
        return SentenceTransformer(model_name)

# Global instances
model = load_robust_model()
friction_engine = FrictionEngine()

class LCastRecommender:
    def recommend(self, user_preferences_string, poi_list):
        if not poi_list: return []

        try:
            user_vector = model.encode([user_preferences_string])
            results = []
            
            # 🚀 PARALLEL PRE-FETCH
            coords = [(p['lat'], p['lon']) for p in poi_list]
            friction_engine.warm_up_cache(coords)
            
            for poi in poi_list:
                # 1. Similarity
                text_content = poi.get('description') or poi.get('name', '')
                poi_vector = model.encode([text_content])
                sim_score = cosine_similarity(user_vector, poi_vector)[0][0]
                
                # 2. Friction
                mu, factors = friction_engine.calculate_final_mu(poi['lat'], poi['lon'], poi.get('region', 'Unknown'))
                
                final_score = sim_score * mu
                
                # ✅ CRITICAL: Preserve Original Data (Images/Distance/ID)
                enriched_poi = poi.copy()
                enriched_poi.update({
                    "final_score": float(final_score),
                    "match_rate": float(sim_score),
                    "friction_index": float(mu),
                    "safety_factors": factors, 
                    "xai_explanation": f"Interest Match: {int(sim_score*100)}%"
                })
                
                results.append(enriched_poi)
                
            return sorted(results, key=lambda x: x['final_score'], reverse=True)

        except Exception as e:
            print(f"❌ Recommender Crash: {e}")
            # If python logic fails, return the original list so the app doesn't break
            return poi_list