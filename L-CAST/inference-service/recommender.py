import numpy as np
import os
import shutil
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from friction_engine import FrictionEngine

def load_model_safe():
    try:
        return SentenceTransformer('all-MiniLM-L6-v2')
    except:
        # Fallback if download fails
        return SentenceTransformer('all-MiniLM-L6-v2')

model = load_model_safe()
friction_engine = FrictionEngine()

class LCastRecommender:
    def recommend(self, user_preferences_string, poi_list):
        if not poi_list: return []

        try:
            user_vector = model.encode([user_preferences_string])
            results = []
            
            # Parallel Warmup
            coords = [(p['lat'], p['lon']) for p in poi_list]
            friction_engine.warm_up_cache(coords)
            
            for poi in poi_list:
                # 1. Similarity
                text = poi.get('description') or poi.get('name', '')
                poi_vector = model.encode([text])
                sim = cosine_similarity(user_vector, poi_vector)[0][0]
                
                # 2. Friction
                mu, factors = friction_engine.calculate_final_mu(poi['lat'], poi['lon'], poi.get('region', 'Unknown'))
                
                final_score = sim * mu
                
                # 3. PRESERVE ORIGINAL DATA (Images/Distance)
                enriched = poi.copy()
                enriched.update({
                    "final_score": float(final_score),
                    "friction_index": float(mu),
                    "safety_factors": factors
                })
                
                results.append(enriched)
                
            return sorted(results, key=lambda x: x['final_score'], reverse=True)
        
        except Exception as e:
            print(f"AI Logic Error: {e}")
            return poi_list # Return original data if crash