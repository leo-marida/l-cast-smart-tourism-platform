import os
import requests
from dotenv import load_dotenv
import redis

load_dotenv()

class FrictionEngine:
    def __init__(self):
        self.weather_key = os.getenv("OPENWEATHER_API_KEY")
        self.news_key = os.getenv("NEWS_API_KEY")
        self.google_key = os.getenv("GOOGLE_MAPS_API_KEY")

    def get_real_time_weather(self, lat, lon):
        """Fetches real weather from OpenWeatherMap"""
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_key}"
        try:
            resp = requests.get(url, timeout=5).json()
            # Weather Penalty Logic
            condition = resp.get('weather', [{}])[0].get('main', 'Clear')
            if condition in ['Thunderstorm', 'Snow', 'Extreme']:
                return 0.6, f"Extreme Weather: {condition}"
            return 1.0, "Clear"
        except Exception:
            return 1.0, "Weather Data Offline (Graceful Degradation)"

    def get_safety_news_score(self, region_name):
        """Scans local news for keywords like 'protest', 'closure', 'strike'"""
        url = f"https://newsapi.org/v2/everything?q={region_name}+Lebanon+security&apiKey={self.news_key}"
        try:
            resp = requests.get(url, timeout=5).json()
            articles = resp.get('totalResults', 0)
            # If more than 5 recent safety articles, apply friction
            if articles > 5:
                return 0.5, "High Social Volatility detected in news"
            return 1.0, "No immediate safety alerts"
        except Exception:
            return 1.0, "News Service Offline"

    def calculate_final_mu(self, lat, lon, region_name):
        """Aggregates all real-world friction points"""
        w_score, w_msg = self.get_real_time_weather(lat, lon)
        s_score, s_msg = self.get_safety_news_score(region_name)
        
        # Weighted friction calculation
        final_mu = min(w_score, s_score) 
        reasons = [msg for msg in [w_msg, s_msg] if "Clear" not in msg and "No immediate" not in msg]
        
        return round(final_mu, 2), reasons
    
    
    def apply_social_correction(self, base_mu, poi_id, check_in_count):
        """
        Self-healing logic: If locals/trusted users check in, 
        reduce the penalty of the Friction Index.
        """
        if base_mu < 1.0 and check_in_count >= 3:
            correction = 0.2  # Boost safety score because people are actually there
            new_mu = min(1.0, base_mu + correction)
            return new_mu, "Community Verified: Real-time safety confirmed by users."
        return base_mu, None
    
    
        # Connect to Redis
    cache = redis.Redis(host='cache', port=6379, db=0)

    def get_real_time_friction(self, region_name, lat, lon):
        # 1. Check if an admin has injected a crisis manually (The Demo Logic)
        manual_event = cache.get(f"crisis:{region_name}")
        if manual_event:
            return 0.25, f"CRISIS DETECTED: {manual_event.decode('utf-8')}"

        # 2. Otherwise, use real API data (from previous steps)
        return self.get_api_data(lat, lon)