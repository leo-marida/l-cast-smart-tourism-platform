import os
import requests
import random
import logging

logger = logging.getLogger(__name__)

class FrictionEngine:
    def __init__(self):
        # Reads from the docker .env automatically
        self.weather_key = os.getenv("OPENWEATHER_API_KEY")

    def calculate_final_mu(self, lat, lon, region_name):
        factors = []
        mu = 1.0 # Start at 100%

        # 1. REAL WEATHER FETCH
        if self.weather_key:
            try:
                # 3-second timeout prevents hanging
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_key}&units=metric"
                resp = requests.get(url, timeout=3).json()
                
                if 'main' not in resp:
                    # FIX: Penalize if API returns error (e.g. invalid key)
                    mu -= 0.15 
                    factors.append({"icon": "⚠️", "label": "Weather Unavailable"})
                else:
                    temp = resp['main']['temp']
                    condition = resp['weather'][0]['main'] 
                    
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
                    
                    factors.append({"icon": "🌡️", "label": f"{int(temp)}°C"})

            except Exception as e:
                # FIX: Penalize if Internet/Network is down. 
                # "Offline" means we cannot guarantee safety.
                logger.error(f"Weather Network Error: {e}")
                mu -= 0.20 
                factors.append({"icon": "⚠️", "label": "Offline (Retrying)"})
        else:
            # FIX: Penalize if Key is missing
            mu -= 0.20
            factors.append({"icon": "❌", "label": "System Config Error"})

        # 2. SIMULATED TRAFFIC
        traffic_seed = (int(lat * 1000) % 10) / 10.0 
        if traffic_seed > 0.7:
            mu -= 0.20
            factors.append({"icon": "🚗", "label": "High Traffic (-20%)"})
        else:
            factors.append({"icon": "🛣️", "label": "Traffic Normal"})

        # 3. Final Scoring
        mu = max(0.1, min(1.0, mu))
        return round(mu, 2), factors