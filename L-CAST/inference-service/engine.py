import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Load a lightweight, pre-trained model for converting text to numbers (Vectors)
# We use 'all-MiniLM-L6-v2' because it is fast and efficient for standard CPUs.
print("Loading AI Model... (This happens once on startup)")
model = SentenceTransformer('all-MiniLM-L6-v2')

def compute_similarity(user_interest_text, poi_descriptions):
    """
    Stage 2: Content-Based Filtering
    Converts user text and POI descriptions into Vector Embeddings
    and calculates Cosine Similarity.
    """
    # 1. Vectorize User Interests
    user_embedding = model.encode([user_interest_text]) # Shape: (1, 384)

    # 2. Vectorize POI Descriptions
    poi_embeddings = model.encode(poi_descriptions) # Shape: (N, 384)

    # 3. Calculate Cosine Similarity
    # Result is a list of scores between 0 (no match) and 1 (perfect match)
    scores = cosine_similarity(user_embedding, poi_embeddings)[0]
    return scores

def calculate_friction(weather_condition, road_status):
    """
    The Core Innovation: Contextual Penalty Matrix
    Returns a multiplier (mu). 1.0 = Perfect, 0.0 = Impossible.
    """
    mu = 1.0
    
    # Weather Penalties
    if weather_condition.lower() in ['rain', 'stormy', 'snow']:
        mu -= 0.3
    elif weather_condition.lower() == 'foggy':
        mu -= 0.1

    # Road Penalties
    if road_status.lower() == 'blocked':
        mu = 0.0 # Hard constraint (suppress)
    elif road_status.lower() == 'traffic':
        mu -= 0.2
    elif road_status.lower() == 'construction':
        mu -= 0.15

    return max(0.0, mu) # Ensure score never goes below 0