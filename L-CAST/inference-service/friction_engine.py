import os
import requests
import logging
import time

logger = logging.getLogger(__name__)

class FrictionEngine:
    def __init__(self):
        self.weather_key = os.getenv("OPENWEATHER_API_KEY")
        # Simple memory cache: {(lat_rounded, lon_rounded): {'data': response, 'time': timestamp}}
        self.cache = {}
        self.CACHE_DURATION = 600 # 10 Minutes

        if self.weather_key:
            logger.info("Weather API Key loaded.")
        else:
            logger.error("OPENWEATHER_API_KEY missing.")

    def get_weather(self, lat, lon):
        # Round coordinates to 1 decimal place (approx 10km radius) to group requests
        key = (round(lat, 1), round(lon, 1))
        current_time = time.time()

        # Check Cache
        if key in self.cache:
            entry = self.cache[key]
            if current_time - entry['time'] < self.CACHE_DURATION:
                return entry['data']

        # Fetch New Data
        if self.weather_key:
            try:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_key}&units=metric"
                resp = requests.get(url, timeout=2).json() # Short timeout
                
                if 'main' in resp:
                    self.cache[key] = {'data': resp, 'time': current_time}
                    return resp
            except Exception as e:
                logger.error(f"Weather Fetch Fail: {e}")
        
        return None

    def calculate_final_mu(self, lat, lon, region_name):
        factors = []
        mu = 1.0 # Start at 100%

        # 1. OPTIMIZED WEATHER FETCH
        weather_data = self.get_weather(lat, lon)

        if weather_data:
            temp = weather_data['main']['temp']
            condition = weather_data['weather'][0]['main']
            
            # --- UPDATED PENALTY LOGIC (Make it more sensitive) ---
            if 'Rain' in condition or 'Drizzle' in condition:
                mu -= 0.25
                factors.append({"icon": "🌧️", "label": "Rain (-25%)"})
            elif 'Snow' in condition:
                mu -= 0.40
                factors.append({"icon": "❄️", "label": "Snow (-40%)"})
            elif 'Thunderstorm' in condition:
                mu -= 0.50
                factors.append({"icon": "⛈️", "label": "Storm (-50%)"})
            elif 'Clouds' in condition:
                # Small penalty for clouds so score isn't always 100%
                mu -= 0.05
                factors.append({"icon": "☁️", "label": "Cloudy (-5%)"})
            elif 'Clear' in condition:
                factors.append({"icon": "☀️", "label": "Clear Sky"})
            else:
                 factors.append({"icon": "🌥️", "label": condition})

            # Temp Penalty (If too cold)
            if temp < 10:
                mu -= 0.05
                factors.append({"icon": "🌡️", "label": f"Cold {int(temp)}°C (-5%)"})
            else:
                factors.append({"icon": "🌡️", "label": f"{int(temp)}°C"})
        else:
            # Fallback if API fails (Don't crash, just warn)
            mu -= 0.10
            factors.append({"icon": "⚠️", "label": "Weather Offline"})

        # 2. SIMULATED TRAFFIC
        # Use a deterministic seed based on location so it doesn't flicker
        traffic_seed = (int(lat * 10000) % 100) / 100.0 
        
        if traffic_seed > 0.8: # 20% chance of traffic
            mu -= 0.20
            factors.append({"icon": "🚗", "label": "High Traffic (-20%)"})
        else:
            factors.append({"icon": "✅", "label": "Traffic Normal"})

        # 3. Final Scoring
        mu = max(0.1, min(1.0, mu))
        return round(mu, 2), factors