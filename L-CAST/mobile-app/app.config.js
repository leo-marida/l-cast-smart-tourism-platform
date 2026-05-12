import 'dotenv/config'; 

export default {
  expo: {
    name: "L-CAST",
    slug: "l-cast",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",  
    userInterfaceStyle: "light",
    splash: {                   
      image: "./assets/splash.png",
      resizeMode: "contain",
    },

    extra: {
      eas: {
        projectId: "81c161e0-e505-49cc-8d75-604cb26b4c2f"
      }
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.lcast.app",
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY
      }
    },
    android: {
      package: "com.lcast.app",
      usesCleartextTraffic: true,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY
        }
      }
    },
    web: {                       
      favicon: "./assets/favicon.png",
    }
  }
};