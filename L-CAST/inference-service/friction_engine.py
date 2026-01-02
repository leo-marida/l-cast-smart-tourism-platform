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
        self.CACHE_DURATION = 600 # Cache for 10 Minutes

        if not self.weather_key:
            logger.warning("⚠️ OPENWEATHER_API_KEY is missing! Live data will not work.")

    def get_weather_key(self, lat, lon):
        # Round to 1 decimal place (~11km) to group nearby queries
        return (round(lat, 1), round(lon, 1))

    def fetch_single(self, lat, lon):
        """ Fetches REAL data from OpenWeatherMap. """
        key = self.get_weather_key(lat, lon)
        if key in self.cache:
            if time.time() - self.cache[key]['time'] < self.CACHE_DURATION:
                return

        if not self.weather_key: return

        try:
            url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={self.weather_key}&units=metric"
            resp = requests.get(url, timeout=3)
            if resp.status_code == 200:
                self.cache[key] = {'data': resp.json(), 'time': time.time()}
            else:
                logger.error(f"Weather API Error: {resp.status_code}")
        except Exception as e:
            logger.error(f"Weather Connection Failed: {e}")

    def warm_up_cache(self, coord_list):
        if not self.weather_key: return
        unique_coords = set()
        to_fetch = []

        for lat, lon in coord_list:
            key = self.get_weather_key(lat, lon)
            if key not in self.cache or (time.time() - self.cache[key]['time'] > self.CACHE_DURATION):
                if key not in unique_coords:
                    unique_coords.add(key)
                    to_fetch.append((lat, lon))

        if to_fetch:
            with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
                executor.map(lambda p: self.fetch_single(p[0], p[1]), to_fetch)

    def calculate_final_mu(self, lat, lon, region_name):
        """
        Calculates Safety Score (mu) with realistic penalties so it is rarely 100%.
        """
        factors = []
        # START AT 98% (Nothing is perfect)
        mu = 0.98 

        key = self.get_weather_key(lat, lon)
        weather_data = None
        if key in self.cache:
            weather_data = self.cache[key]['data']
        
        # Defaults
        temp = 20
        main_weather = 'Clear'
        
        if weather_data:
            main_weather = weather_data.get('weather', [{}])[0].get('main', 'Clear')
            description = weather_data.get('weather', [{}])[0].get('description', 'Clear')
            temp = weather_data.get('main', {}).get('temp', 20)
            wind_speed = weather_data.get('wind', {}).get('speed', 0)

            # --- 1. WEATHER (Left Badge) ---
            if main_weather == 'Thunderstorm':
                mu -= 0.50
                factors.append({"icon": "⛈️", "label": "Storm"})
            elif main_weather == 'Snow':
                mu -= 0.40
                factors.append({"icon": "❄️", "label": "Snow"})
            elif main_weather == 'Rain' or main_weather == 'Drizzle':
                mu -= 0.25 # Increased penalty
                factors.append({"icon": "🌧️", "label": "Rain"})
            elif main_weather in ['Fog', 'Mist', 'Haze']:
                mu -= 0.15
                factors.append({"icon": "🌫️", "label": "Foggy"})
            elif main_weather == 'Clouds':
                mu -= 0.05 # Clouds now have a small penalty (gloomy)
                factors.append({"icon": "☁️", "label": "Cloudy"})
            else:
                # Clear sky has no penalty
                factors.append({"icon": "☀️", "label": "Clear Sky"})

            # --- 2. TEMPERATURE (Middle Badge) ---
            if temp < 5:
                mu -= 0.10
                factors.append({"icon": "🥶", "label": f"Cold {int(temp)}°C"})
            elif temp > 35:
                mu -= 0.10
                factors.append({"icon": "🥵", "label": f"Hot {int(temp)}°C"})
            else:
                factors.append({"icon": "🌡️", "label": f"{int(temp)}°C"})

            # --- 3. ROAD/TRAFFIC (Right Badge) ---
            # Deterministic Math: Uses Lat/Lon to simulate traffic without Google Maps
            # This ensures the same location always returns the same traffic status
            traffic_seed = int((lat + lon) * 1000)
            
            if main_weather == 'Snow':
                # Weather overrides traffic
                factors.append({"icon": "⛓️", "label": "Icy Roads"})
            elif main_weather == 'Rain' or main_weather == 'Thunderstorm':
                # Weather overrides traffic
                factors.append({"icon": "💧", "label": "Wet Roads"})
            elif main_weather == 'Fog' or main_weather == 'Mist':
                factors.append({"icon": "⚠️", "label": "Caution"})
            else:
                # If weather is nice, we calculate traffic friction
                # 30% chance of Heavy Traffic
                if traffic_seed % 3 == 0: 
                    mu -= 0.15
                    factors.append({"icon": "🚗", "label": "Heavy Traffic"})
                elif traffic_seed % 3 == 1:
                    mu -= 0.05
                    factors.append({"icon": "⚠️", "label": "Busy Roads"})
                else:
                    # Roads are clear, small bonus to offset the base penalty
                    mu += 0.01 
                    factors.append({"icon": "✅", "label": "Roads Clear"})

        else:
            factors.append({"icon": "📡", "label": "Data Offline"})

        # Final Clamp: Ensure strictly between 10% and 99%
        mu = max(0.1, min(0.99, mu))
        
        return round(mu, 2), factors