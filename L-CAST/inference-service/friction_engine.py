import os
import requests
import logging
import time
import concurrent.futures

logger = logging.getLogger(__name__)

class FrictionEngine:
    def __init__(self):
        self.weather_key = os.getenv("OPENWEATHER_API_KEY")
        self.cache = {}
        self.CACHE_DURATION = 600 # Cache for 10 Minutes to respect API limits

        if not self.weather_key:
            logger.warning("⚠️ OPENWEATHER_API_KEY is missing! Live data will not work.")

    def get_weather_key(self, lat, lon):
        # Round to 1 decimal place (~11km) to group nearby queries and save API calls
        return (round(lat, 1), round(lon, 1))

    def fetch_single(self, lat, lon):
        """
        Fetches REAL data from OpenWeatherMap.
        """
        key = self.get_weather_key(lat, lon)
        
        # Check Cache Validity
        if key in self.cache:
            if time.time() - self.cache[key]['time'] < self.CACHE_DURATION:
                return

        if not self.weather_key:
            return

        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_key}&units=metric"
            resp = requests.get(url, timeout=3)
            
            if resp.status_code == 200:
                data = resp.json()
                self.cache[key] = {'data': data, 'time': time.time()}
            else:
                logger.error(f"Weather API Error {resp.status_code}: {resp.text}")
                
        except Exception as e:
            logger.error(f"Weather Connection Failed: {e}")

    def warm_up_cache(self, coord_list):
        """
        Parallel fetching of real weather data for all items in the list.
        """
        if not self.weather_key:
            return

        unique_coords = set()
        to_fetch = []

        for lat, lon in coord_list:
            key = self.get_weather_key(lat, lon)
            if key not in self.cache or (time.time() - self.cache[key]['time'] > self.CACHE_DURATION):
                if key not in unique_coords:
                    unique_coords.add(key)
                    to_fetch.append((lat, lon))

        # Use ThreadPool to hit the API in parallel (faster loading)
        if to_fetch:
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
                executor.map(lambda p: self.fetch_single(p[0], p[1]), to_fetch)

    def calculate_final_mu(self, lat, lon, region_name):
        """
        Calculates Safety Score (mu) based STRICTLY on real API data.
        """
        factors = []
        mu = 1.0 # Default: 100% Safe

        key = self.get_weather_key(lat, lon)
        weather_data = None

        # 1. Try to get data from cache (which we just warmed up)
        if key in self.cache:
            weather_data = self.cache[key]['data']
        
        # 2. If data exists, parse it
        if weather_data:
            # Extract Raw Data
            main_weather = weather_data.get('weather', [{}])[0].get('main', 'Clear') # Rain, Snow, Clear
            description = weather_data.get('weather', [{}])[0].get('description', 'Clear') # "light rain"
            temp = weather_data.get('main', {}).get('temp', 20)
            visibility = weather_data.get('visibility', 10000) # Meters
            wind_speed = weather_data.get('wind', {}).get('speed', 0) # m/s

            # --- A. WEATHER CONDITION LOGIC ---
            if main_weather == 'Thunderstorm':
                mu -= 0.50
                factors.append({"icon": "⛈️", "label": "Storm Warning"})
            elif main_weather == 'Snow':
                mu -= 0.40
                factors.append({"icon": "❄️", "label": "Snow"})
                factors.append({"icon": "⛓️", "label": "Chains Req."})
            elif main_weather == 'Rain' or main_weather == 'Drizzle':
                mu -= 0.20
                factors.append({"icon": "🌧️", "label": description.title()})
                factors.append({"icon": "💧", "label": "Wet Roads"})
            elif main_weather in ['Fog', 'Mist', 'Haze', 'Smoke']:
                mu -= 0.15
                factors.append({"icon": "🌫️", "label": "Low Visibility"})
            elif main_weather == 'Clouds':
                # Clouds are safe, no penalty
                factors.append({"icon": "☁️", "label": "Cloudy"})
            elif main_weather == 'Clear':
                factors.append({"icon": "☀️", "label": "Clear Sky"})
            else:
                factors.append({"icon": "🌥️", "label": main_weather})

            # --- B. TEMPERATURE LOGIC ---
            if temp < 0:
                mu -= 0.15
                factors.append({"icon": "🥶", "label": f"Freezing {int(temp)}°C"})
            elif temp < 10:
                factors.append({"icon": "🧥", "label": f"Cold {int(temp)}°C"})
            elif temp > 35:
                mu -= 0.10
                factors.append({"icon": "🥵", "label": f"Extreme Heat {int(temp)}°C"})
            else:
                factors.append({"icon": "🌡️", "label": f"{int(temp)}°C"})

            # --- C. EXTREME WIND LOGIC ---
            if wind_speed > 15: # roughly 50km/h
                mu -= 0.15
                factors.append({"icon": "💨", "label": "High Winds"})

        else:
            # API Failed or Key Missing
            factors.append({"icon": "📡", "label": "Live Data Offline"})
            # We do NOT penalize if data is missing, we just don't show specific weather details
        
        # 3. Final Clamping
        mu = max(0.1, min(1.0, mu))
        
        return round(mu, 2), factors