import os
import requests
import random
import logging

logger = logging.getLogger(__name__)

class FrictionEngine:
    def __init__(self):
        # ✅ SECURE: Read from Docker Environment
        self.weather_key = os.getenv("OPENWEATHER_API_KEY")
        
        # Debug Log
        if self.weather_key:
            logger.info("Weather API Key loaded successfully.")
        else:
            logger.error("CRITICAL: OPENWEATHER_API_KEY is missing from environment!")

    def calculate_final_mu(self, lat, lon, region_name):
        factors = []
        mu = 1.0 # Start at 100%

        # 1. REAL WEATHER FETCH
        if self.weather_key:
            try:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_key}&units=metric"
                resp = requests.get(url, timeout=3).json()
                
                if 'main' not in resp:
                    logger.warning(f"Weather API Error: {resp}")
                    # PENALTY for API Error (Uncertainty is dangerous)
                    mu -= 0.30 
                    factors.append({"icon": "⚠️", "label": "Weather Unavailable (-30%)"})
                else:
                    temp = resp['main']['temp']
                    condition = resp['weather'][0]['main'] 
                    
                    # Condition Logic
                    if 'Rain' in condition or 'Drizzle' in condition:
                        mu -= 0.25
                        factors.append({"icon": "🌧️", "label": "Rain (-25%)"})
                    elif 'Snow' in condition:
                        mu -= 0.40
                        factors.append({"icon": "❄️", "label": "Snow (-40%)"})
                    elif 'Thunderstorm' in condition:
                        mu -= 0.50
                        factors.append({"icon": "⛈️", "label": "Storm (-50%)"})
                    elif 'Clear' in condition:
                        factors.append({"icon": "☀️", "label": "Clear Sky"})
                    elif 'Clouds' in condition:
                        factors.append({"icon": "☁️", "label": "Cloudy"})
                    
                    # Temperature Logic (Just informational, no penalty unless extreme)
                    factors.append({"icon": "🌡️", "label": f"{int(temp)}°C"})

            except Exception as e:
                logger.error(f"Weather Network Error: {e}")
                # PENALTY for Network/Offline (Uncertainty)
                mu -= 0.30
                factors.append({"icon": "⚠️", "label": "Weather Offline (-30%)"})
        else:
            # Fallback if key is missing
            mu -= 0.30
            factors.append({"icon": "❌", "label": "Sys Config Error (-30%)"})

        # 2. SIMULATED TRAFFIC (Deterministic Demo Logic)
        traffic_seed = (int(lat * 1000) % 10) / 10.0 
        
        if traffic_seed > 0.7:
            mu -= 0.20
            factors.append({"icon": "🚗", "label": "High Traffic (-20%)"})
        else:
            # Explicitly state normal traffic so the user sees positive info too
            factors.append({"icon": "✅", "label": "Traffic Normal"})

        # 3. Final Scoring
        # Ensure it doesn't drop below 0.1 or exceed 1.0
        mu = max(0.1, min(1.0, mu))
        
        return round(mu, 2), factors