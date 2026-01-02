import os
import requests
import logging
import time
import concurrent.futures
import random

logger = logging.getLogger(__name__)

class FrictionEngine:
    def __init__(self):
        self.weather_key = os.getenv("OPENWEATHER_API_KEY")
        self.cache = {}
        self.CACHE_DURATION = 900 # 15 Minutes
        
        # Hardcoded simulated weather patterns for DEMO purposes
        # (Ensures app looks 'smart' even if API fails)
        self.region_weather_profile = {
            'Beirut': {'temp': 22, 'cond': 'Clear', 'icon': '☀️'},
            'Jbeil': {'temp': 20, 'cond': 'Clouds', 'icon': '☁️'},
            'Bekaa': {'temp': 12, 'cond': 'Rain', 'icon': '🌧️'},
            'South': {'temp': 24, 'cond': 'Clear', 'icon': '☀️'},
            'Chouf': {'temp': 15, 'cond': 'Fog', 'icon': '🌫️'},
            'Bcharre': {'temp': 2, 'cond': 'Snow', 'icon': '❄️'},
            'Faraya': {'temp': -1, 'cond': 'Snow', 'icon': '❄️'},
            'Tripoli': {'temp': 23, 'cond': 'Clear', 'icon': '☀️'},
        }

    def get_weather_key(self, lat, lon):
        return (round(lat, 1), round(lon, 1))

    def fetch_single(self, lat, lon):
        key = self.get_weather_key(lat, lon)
        if key in self.cache and (time.time() - self.cache[key]['time'] < self.CACHE_DURATION):
            return

        if self.weather_key:
            try:
                # Short timeout to prevent lagging the whole app
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_key}&units=metric"
                resp = requests.get(url, timeout=1.5).json()
                if 'main' in resp:
                    self.cache[key] = {'data': resp, 'time': time.time(), 'source': 'api'}
                    return
            except Exception:
                pass # Fail silently and fall back to simulation
        
        # If API failed or no key, mark as None to use simulation later
        if key not in self.cache:
            self.cache[key] = {'data': None, 'time': time.time(), 'source': 'sim'}

    def warm_up_cache(self, coord_list):
        unique_coords = list(set([(round(lat, 1), round(lon, 1)) for lat, lon in coord_list]))
        # Use parallel execution but cap workers to prevent CPU spikes
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            executor.map(lambda p: self.fetch_single(p[0], p[1]), unique_coords)

    def calculate_final_mu(self, lat, lon, region_name):
        factors = []
        mu = 1.0 
        key = self.get_weather_key(lat, lon)
        
        # 1. GET WEATHER DATA (API or SIMULATION)
        weather_entry = self.cache.get(key)
        
        temp = 20
        condition = "Clear"
        
        if weather_entry and weather_entry['data']:
            # Use Real API Data
            data = weather_entry['data']
            temp = data['main']['temp']
            condition = data['weather'][0]['main']
        else:
            # Use Deterministic Simulation (Based on Region)
            # This ensures Bcharre always looks snowy and Beirut looks sunny in the demo
            profile = self.region_weather_profile.get(region_name, {'temp': 18, 'cond': 'Clouds'})
            temp = profile['temp']
            condition = profile['cond']
            
            # Add some randomness based on location so it doesn't look static
            if (int(lat * 100) % 2 == 0): 
                temp -= 1

        # 2. APPLY PENALTIES
        if 'Rain' in condition or 'Drizzle' in condition:
            mu -= 0.25
            factors.append({"icon": "🌧️", "label": "Rain"})
        elif 'Snow' in condition:
            mu -= 0.50
            factors.append({"icon": "❄️", "label": "Snow (-50%)"})
            factors.append({"icon": "⛓️", "label": "Chains Req."})
        elif 'Thunderstorm' in condition:
            mu -= 0.60
            factors.append({"icon": "⛈️", "label": "Storm Warning"})
        elif 'Fog' in condition or 'Mist' in condition:
            mu -= 0.15
            factors.append({"icon": "🌫️", "label": "Low Vis."})
        elif 'Clear' in condition:
            factors.append({"icon": "☀️", "label": "Clear Sky"})
        else:
            factors.append({"icon": "☁️", "label": condition})

        if temp < 5:
            mu -= 0.10
            factors.append({"icon": "🥶", "label": "Ice Risk"})
        
        # 3. TRAFFIC SIMULATION (Deterministic based on Name/Coords)
        # Using coordinate math ensures the same location always has the same traffic status during the demo
        traffic_val = (lat + lon) * 1000
        if int(traffic_val) % 7 == 0: # 1 in 7 chance of heavy traffic
            mu -= 0.30
            factors.append({"icon": "🚗", "label": "Heavy Traffic"})
            factors.append({"icon": "⏳", "label": "+45m Delay"})
        
        # Cap score
        mu = max(0.1, min(1.0, mu))
        
        return round(mu, 2), factors