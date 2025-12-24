import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer
from friction_engine import FrictionEngine

# Load a production-grade pre-trained model
model = SentenceTransformer('all-MiniLM-L6-v2')
friction_engine = FrictionEngine()

class LCastRecommender:
    def recommend(self, user_preferences_string, poi_list):
        """
        poi_list: List of dicts from PostgreSQL {id, name, description, lat, lon, region}
        """
        # 1. Convert user text (e.g., "I love hiking and quiet nature") to vector
        user_vector = model.encode([user_preferences_string])
        
        results = []
        for poi in poi_list:
            # 2. Content-Based Score (CS Rigor)
            poi_vector = model.encode([poi['description']])
            sim_score = cosine_similarity(user_vector, [poi_vector])[0][0]
            
            # 3. Real-time Friction Context (The "Wow" Innovation)
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
        """Explainable AI: Tells the user WHY they see this"""
        base = f"This matches {int(sim*100)}% of your profile."
        if mu < 1.0:
            return base + f" Warning: Visibility reduced due to {', '.join(reasons)}."
        return base + " Area is currently stable and accessible."
    
    def hybrid_score(self, user_prefs, poi, user_id):
        # Branch A: Content-Based (Already coded)
        content_score = self.calculate_cosine_sim(user_prefs, poi['description'])
        
        # Branch B: Collaborative Filtering (Matrix Factorization Logic)
        # In a full app, you'd use a library like 'Surprise'. 
        # Here we simulate the score based on similar user check-ins.
        collab_score = poi.get('base_popularity_score', 0.5) 
        
        # Combine (Weighted Harmonic Mean as per report)
        if content_score + collab_score == 0: return 0
        hybrid = (2 * content_score * collab_score) / (content_score + collab_score)
        
        # Apply Friction
        mu, reasons = friction_engine.calculate_final_mu(poi['lat'], poi['lon'], poi['region'])
        return hybrid * mu, mu, reasons