import os
import requests
import logging
import time
import concurrent.futures # <--- KEEPING PARALLEL SPEED

logger = logging.getLogger(__name__)

class FrictionEngine:
    def __init__(self):
        self.weather_key = os.getenv("OPENWEATHER_API_KEY")
        self.cache = {}
        self.CACHE_DURATION = 600 # 10 Minutes

        if self.weather_key:
            logger.info("Weather API Key loaded.")
        else:
            logger.error("OPENWEATHER_API_KEY missing.")

    def get_weather_key(self, lat, lon):
        # Group by ~11km radius to reduce API calls
        return (round(lat, 1), round(lon, 1))

    def fetch_single(self, lat, lon):
        """Helper to fetch one location, used by the ThreadPool"""
        key = self.get_weather_key(lat, lon)
        
        # Skip if valid cache exists
        if key in self.cache:
            if time.time() - self.cache[key]['time'] < self.CACHE_DURATION:
                return

        if self.weather_key:
            try:
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_key}&units=metric"
                resp = requests.get(url, timeout=3).json()
                if 'main' in resp:
                    self.cache[key] = {'data': resp, 'time': time.time()}
            except Exception as e:
                logger.error(f"Weather Fetch Fail: {e}")

    def warm_up_cache(self, coord_list):
        """
        🚀 TURBO MODE: Fetches weather for ALL locations in parallel.
        """
        unique_coords = []
        seen_keys = set()

        # Only fetch what is missing from cache
        for lat, lon in coord_list:
            key = self.get_weather_key(lat, lon)
            if key not in seen_keys:
                unique_coords.append((lat, lon))
                seen_keys.add(key)

        # Fire 10 parallel requests at once
        if unique_coords:
            with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                executor.map(lambda p: self.fetch_single(p[0], p[1]), unique_coords)

    def calculate_final_mu(self, lat, lon, region_name):
        factors = []
        mu = 1.0 

        # 1. READ FROM CACHE (Instant because we warmed it up)
        key = self.get_weather_key(lat, lon)
        weather_data = None
        
        if key in self.cache:
            weather_data = self.cache[key]['data']
        else:
            # Fallback: Try to fetch synchronously if missed
            self.fetch_single(lat, lon)
            if key in self.cache:
                weather_data = self.cache[key]['data']

        if weather_data:
            temp = weather_data['main']['temp']
            condition = weather_data['weather'][0]['main']
            
            # --- PENALTY LOGIC ---
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
                mu -= 0.05
                factors.append({"icon": "☁️", "label": "Cloudy (-5%)"})
            elif 'Clear' in condition:
                factors.append({"icon": "☀️", "label": "Clear Sky"})
            else:
                 factors.append({"icon": "🌥️", "label": condition})

            if temp < 10:
                mu -= 0.05
                factors.append({"icon": "🌡️", "label": f"Cold {int(temp)}°C (-5%)"})
            else:
                factors.append({"icon": "🌡️", "label": f"{int(temp)}°C"})
        else:
            mu -= 0.10
            factors.append({"icon": "⚠️", "label": "Weather Offline"})

        # 2. SIMULATED TRAFFIC
        traffic_seed = (int(lat * 10000) % 100) / 100.0 
        if traffic_seed > 0.8:
            mu -= 0.20
            factors.append({"icon": "🚗", "label": "High Traffic (-20%)"})
        else:
            factors.append({"icon": "✅", "label": "Traffic Normal"})

        mu = max(0.1, min(1.0, mu))
        return round(mu, 2), factors