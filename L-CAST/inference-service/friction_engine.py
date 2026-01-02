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
        
        # known demo locations to pre-fetch
        self.DEMO_LOCATIONS = [
            (33.8902, 35.4735), (34.1206, 35.6482), (34.0059, 36.2086), # Raouche, Byblos, Baalbek
            (33.5204, 35.5401), (33.5672, 35.3695), (33.6953, 35.5807), # Mleeta, Sidon, Beiteddine
            (33.7262, 35.9270), (33.8785, 35.5149), (33.5433, 35.5822), # Anjar, Museum, Jezzine
            (33.8233, 35.8900), (33.9818, 35.6517), (34.2084, 35.9262), # Ksara, Harissa, Tannourine
            (33.9023, 35.4984), (33.6933, 35.6963), (33.9450, 35.6418), # Zaitunay, Chouf, Jeita
            (34.2435, 36.0494), (33.2706, 35.2033), (34.2497, 35.6644), # Cedars, Tyre, Batroun
            (33.7000, 35.5619), (33.7950, 35.8742), (33.8947, 35.5056), # Deir, Taanayel, Mosque
            (33.8933, 35.5133), (33.3283, 35.5298), (34.2500, 35.9900), # Sursock, Beaufort, Qadisha
            (33.9915, 35.8333), (34.4333, 35.8436), (34.1734, 35.8704), # Mzaar, Tripoli, Baatara
            (34.1166, 35.6953), (33.6983, 35.5819), (34.2736, 35.6736), # Charbel, Moussa, Mseilha
            (34.3120, 35.9910), (33.5015, 35.8445), (33.5686, 35.6919), # Ehden, Rashaya, Qaraoun
            (34.2033, 35.8423) # Douma
        ]
        
        if not self.weather_key:
            logger.warning("⚠️ No API Key - Using Simulation Mode")
        else:
            logger.info("🚀 Friction Engine Initialized. Background Warmup Started...")
            # Fire and forget warmup in background
            executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
            executor.submit(self.warm_up_cache, self.DEMO_LOCATIONS)

    def get_weather_key(self, lat, lon):
        return (round(lat, 1), round(lon, 1))

    def fetch_single(self, lat, lon):
        key = self.get_weather_key(lat, lon)
        if key in self.cache and (time.time() - self.cache[key]['time'] < self.CACHE_DURATION):
            return

        if not self.weather_key: return

        try:
            # 1.5s Timeout to prevent Gateway Timeout
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_key}&units=metric"
            resp = requests.get(url, timeout=1.5) 
            if resp.status_code == 200:
                self.cache[key] = {'data': resp.json(), 'time': time.time(), 'source': 'api'}
        except Exception:
            pass # Fail silently, calculate_final_mu will fallback to simulation

    def warm_up_cache(self, coord_list):
        if not self.weather_key: return
        unique_coords = set()
        to_fetch = []
        for lat, lon in coord_list:
            key = self.get_weather_key(lat, lon)
            if key not in self.cache: # Only fetch if empty
                if key not in unique_coords:
                    unique_coords.add(key)
                    to_fetch.append((lat, lon))

        if to_fetch:
            logger.info(f"🌍 Pre-fetching weather for {len(to_fetch)} locations...")
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
                executor.map(lambda p: self.fetch_single(p[0], p[1]), to_fetch)
            logger.info("✅ Weather Cache Warmup Complete.")

    def calculate_final_mu(self, lat, lon, region_name):
        # ... (KEEP THE SAME HYBRID LOGIC FROM PREVIOUS RESPONSE) ...
        # ... (DO NOT CHANGE THE LOGIC BELOW, JUST PASTE IT HERE) ...
        
        factors = []
        mu = 0.98 
        key = self.get_weather_key(lat, lon)
        weather_data = self.cache.get(key, {}).get('data')

        # --- MATH SIMULATION DEFAULTS (BACKUP) ---
        traffic_seed = int((lat + lon) * 1000)
        sim_temp = 18 + (traffic_seed % 10)
        sim_cond = 'Clear'
        if 'Bekaa' in region_name or 'Zahle' in region_name: sim_cond = 'Rain'
        elif 'Bcharre' in region_name or 'Faraya' in region_name: sim_cond = 'Snow'; sim_temp = -2
        elif traffic_seed % 5 == 0: sim_cond = 'Clouds'

        # --- USE REAL DATA IF AVAILABLE ---
        if weather_data:
            main_weather = weather_data.get('weather', [{}])[0].get('main', 'Clear')
            temp = weather_data.get('main', {}).get('temp', 20)
        else:
            main_weather = sim_cond
            temp = sim_temp

        # --- SCORING LOGIC ---
        if main_weather == 'Thunderstorm':
            mu -= 0.50; factors.append({"icon": "⛈️", "label": "Storm"})
        elif main_weather == 'Snow':
            mu -= 0.40; factors.append({"icon": "❄️", "label": "Snow"})
        elif main_weather == 'Rain' or main_weather == 'Drizzle':
            mu -= 0.25; factors.append({"icon": "🌧️", "label": "Rain"})
        elif main_weather in ['Fog', 'Mist']:
            mu -= 0.15; factors.append({"icon": "🌫️", "label": "Foggy"})
        elif main_weather == 'Clouds':
            mu -= 0.05; factors.append({"icon": "☁️", "label": "Cloudy"})
        else:
            factors.append({"icon": "☀️", "label": "Clear Sky"})

        if temp < 5:
            mu -= 0.10; factors.append({"icon": "🥶", "label": f"Cold {int(temp)}°C"})
        elif temp > 35:
            mu -= 0.10; factors.append({"icon": "🥵", "label": f"Hot {int(temp)}°C"})
        else:
            factors.append({"icon": "🌡️", "label": f"{int(temp)}°C"})

        if main_weather == 'Snow':
            factors.append({"icon": "⛓️", "label": "Icy Roads"})
        elif main_weather == 'Rain':
            factors.append({"icon": "💧", "label": "Wet Roads"})
        else:
            if traffic_seed % 3 == 0: 
                mu -= 0.15; factors.append({"icon": "🚗", "label": "Heavy Traffic"})
            elif traffic_seed % 3 == 1:
                mu -= 0.05; factors.append({"icon": "⚠️", "label": "Busy Roads"})
            else:
                mu += 0.01; factors.append({"icon": "✅", "label": "Roads Clear"})

        mu = max(0.1, min(0.99, mu))
        return round(mu, 2), factors