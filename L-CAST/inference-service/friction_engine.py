import os
import requests
import random
import logging

logger = logging.getLogger(__name__)

class FrictionEngine:
    def __init__(self):
        # ⚠️ HARDCODED KEY FOR DEMO STABILITY
        # This eliminates ".env not loading" issues
        self.weather_key = "cc4f4db1c56313c30da17bcbcee95b21" 

    def calculate_final_mu(self, lat, lon, region_name):
        factors = []
        mu = 1.0 # Start at 100%

        # 1. REAL WEATHER FETCH
        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_key}&units=metric"
            resp = requests.get(url, timeout=3).json()
            
            if 'main' not in resp:
                factors.append({"icon": "⚠️", "label": "Weather Unavailable"})
            else:
                temp = resp['main']['temp']
                condition = resp['weather'][0]['main'] 
                
                # Condition Logic
                if 'Rain' in condition:
                    mu -= 0.30
                    factors.append({"icon": "🌧️", "label": "Rain (-30%)"})
                elif 'Snow' in condition:
                    mu -= 0.50
                    factors.append({"icon": "❄️", "label": "Snow (-50%)"})
                elif 'Clear' in condition:
                    factors.append({"icon": "☀️", "label": "Clear Sky"})
                elif 'Clouds' in condition:
                    factors.append({"icon": "☁️", "label": "Cloudy"})
                
                # Temperature Logic
                factors.append({"icon": "🌡️", "label": f"{int(temp)}°C"})

        except Exception as e:
            logger.error(f"Weather Network Error: {e}")
            factors.append({"icon": "⚠️", "label": "Weather Offline"})

        # 2. SIMULATED TRAFFIC (Deterministic Demo Logic)
        # Using latitude as a seed so the traffic state doesn't fli