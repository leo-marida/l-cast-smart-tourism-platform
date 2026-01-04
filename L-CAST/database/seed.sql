-- 1. Clear existing data to avoid duplicates if re-seeding
TRUNCATE pois RESTART IDENTITY CASCADE;

-- 2. Insert Data
-- Note: image_url is set to NULL because we use local images in React Native now.
-- Order: name, region, description, base_popularity, location (LON, LAT)

INSERT INTO pois (name, region, description, base_popularity_score, location) VALUES 
('Raouche Rocks', 'Beirut', 'Famous rock formation off the coast of Raouche.', 0.95, 
 ST_SetSRID(ST_MakePoint(35.4718, 33.8898), 4326)),

('Byblos Citadel', 'Jbeil', 'Ancient crusader castle and Phoenician ruins.', 0.90, 
 ST_SetSRID(ST_MakePoint(35.6464, 34.1200), 4326)),

('Baalbek Temples', 'Bekaa', 'Massive Roman temple complex.', 0.85, 
 ST_SetSRID(ST_MakePoint(36.2057, 34.0075), 4326)),

('Mleeta Landmark', 'South', 'Resistance tourism landmark.', 0.70, 
 ST_SetSRID(ST_MakePoint(35.5258, 33.4609), 4326)),

('Sidon Sea Castle', 'Sidon', 'Crusader fortress built on a small island.', 0.80, 
 ST_SetSRID(ST_MakePoint(35.3709, 33.5672), 4326)),

('Beiteddine Palace', 'Chouf', '19th-century palace complex.', 0.88, 
 ST_SetSRID(ST_MakePoint(35.5800, 33.6960), 4326)),

('Anjar Ruins', 'Bekaa', 'Umayyad period ruins.', 0.75, 
 ST_SetSRID(ST_MakePoint(35.9335, 33.7324), 4326)), -- FIXED: Minor adjustment to ruins center

('National Museum of Beirut', 'Beirut', 'Principal museum of archaeology.', 0.92, 
 ST_SetSRID(ST_MakePoint(35.5150, 33.8785), 4326)),

('Jezzine Waterfall', 'South', 'Highest waterfall in Lebanon.', 0.82, 
 ST_SetSRID(ST_MakePoint(35.5842, 33.5459), 4326)),

('Ksara Winery', 'Zahle', 'Oldest winery in Lebanon.', 0.85, 
 ST_SetSRID(ST_MakePoint(35.8925, 33.8265), 4326)),

('Our Lady of Lebanon', 'Jounieh', 'Marian shrine in Harissa.', 0.94, 
 ST_SetSRID(ST_MakePoint(35.6513, 33.9818), 4326)),

('Mar Mikhael', 'Beirut', 'Nightlife and art hub.', 0.88, 
 ST_SetSRID(ST_MakePoint(35.5236, 33.9016), 4326)),

('Tannourine Cedar Reserve', 'Batroun', 'Large cedar forest.', 0.89, 
 ST_SetSRID(ST_MakePoint(35.9388, 34.2080), 4326)),

('Zaitunay Bay', 'Beirut', 'Luxury marina.', 0.91, 
 ST_SetSRID(ST_MakePoint(35.4982, 33.9024), 4326)),

('Chouf Cedar Reserve', 'Chouf', 'Largest nature reserve.', 0.90, 
 ST_SetSRID(ST_MakePoint(35.7266, 33.7443), 4326)),

('Jeita Grotto', 'Jeita', 'Breathtaking system of crystallized limestone caves.', 0.98, 
 ST_SetSRID(ST_MakePoint(35.6408, 33.9437), 4326)),

('Cedars of God', 'Bcharre', 'Ancient cedar forest and UNESCO World Heritage site.', 0.96, 
 ST_SetSRID(ST_MakePoint(36.0489, 34.2448), 4326)),

('Tyre Hippodrome', 'Tyre', 'One of the largest and best-preserved Roman hippodromes.', 0.90, 
 ST_SetSRID(ST_MakePoint(35.2096, 33.2692), 4326)),

('Batroun Old Souks', 'Batroun', 'Charming coastal town with Phoenician sea wall.', 0.93, 
 ST_SetSRID(ST_MakePoint(35.6588, 34.2568), 4326)),

('Deir el Qamar', 'Chouf', 'Historic village of stone palaces and mosques.', 0.89, 
 ST_SetSRID(ST_MakePoint(35.5612, 33.6978), 4326)),

('Taanayel Lake', 'Bekaa', 'Peaceful nature reserve and lake ideal for walking.', 0.86, 
 ST_SetSRID(ST_MakePoint(35.8683, 33.7953), 4326)), -- FIXED: Moved 600m to actual park entrance

('Mohammad Al-Amin Mosque', 'Beirut', 'The iconic Blue Mosque in downtown Beirut.', 0.92, 
 ST_SetSRID(ST_MakePoint(35.5062, 33.8953), 4326)),

('Sursock Museum', 'Beirut', 'Modern art and contemporary culture museum.', 0.87, 
 ST_SetSRID(ST_MakePoint(35.5163, 33.8934), 4326)),

('Beaufort Castle', 'Nabatieh', 'Crusader fortress offering panoramic views of the south.', 0.81, 
 ST_SetSRID(ST_MakePoint(35.5322, 33.3243), 4326)), -- FIXED: Was off by ~500m

('Qadisha Valley', 'Bcharre', 'The Holy Valley, deep gorge with ancient monasteries.', 0.91, 
 ST_SetSRID(ST_MakePoint(35.9527, 34.2852), 4326)), -- FIXED: Moved 3km West to valley center

('Mzaar Kfardebian', 'Kfardebian', 'Largest ski resort in the Middle East.', 0.94, 
 ST_SetSRID(ST_MakePoint(35.8432, 33.9929), 4326)), -- FIXED: Moved 2km North to ski slopes

('Tripoli Citadel', 'Tripoli', 'Raymond de Saint-Gilles Citadel overlooking the city.', 0.85, 
 ST_SetSRID(ST_MakePoint(35.8442, 34.4336), 4326)),

('Baatara Gorge Waterfall', 'Tannourine', 'Stunning waterfall dropping 255m through three natural bridges.', 0.97, 
 ST_SetSRID(ST_MakePoint(35.8702, 34.1707), 4326)),

('Saint Charbel Shrine', 'Annaya', 'Monastery of St. Maron, a major pilgrimage site.', 0.96, 
 ST_SetSRID(ST_MakePoint(35.7605, 34.1160), 4326)),

('Moussa Castle', 'Chouf', 'A castle built by a single man over 60 years, featuring wax figures.', 0.88, 
 ST_SetSRID(ST_MakePoint(35.5812, 33.6950), 4326)),

('Mseilha Fort', 'Batroun', 'Historic fortification built on a rocky limestone rock.', 0.86, 
 ST_SetSRID(ST_MakePoint(35.6897, 34.2738), 4326)), -- FIXED: Was off by 1.5km (in the sea/highway)

('Horsh Ehden Nature Reserve', 'Ehden', 'A nature reserve on the slopes of Mount Lebanon with unique biodiversity.', 0.91, 
 ST_SetSRID(ST_MakePoint(35.9827, 34.3088), 4326)), -- FIXED: Moved 1.5km to main reserve entrance

('Rashaya Citadel', 'Rashaya', 'The Citadel of Independence where leaders were imprisoned in 1943.', 0.87, 
 ST_SetSRID(ST_MakePoint(35.8416, 33.5002), 4326)),

('Lake Qaraoun', 'Bekaa', 'The largest artificial lake in Lebanon, offering stunning views.', 0.84, 
 ST_SetSRID(ST_MakePoint(35.6932, 33.5771), 4326)),

('Douma Village', 'Batroun', 'Traditional village known for its red-tiled roof houses.', 0.85, 
 ST_SetSRID(ST_MakePoint(35.8422, 34.2057), 4326)),

 -- === NEW ADDITIONS FOR FULL COVERAGE ===

('Tyre Coast Nature Reserve', 'Tyre', 'The largest and most beautiful sandy beach and nature reserve in Lebanon.', 0.94, 
 ST_SetSRID(ST_MakePoint(35.2127, 33.2485), 4326)),

('Tripoli Old Souks', 'Tripoli', 'Authentic medieval markets famous for soap, gold, and sweets.', 0.89, 
 ST_SetSRID(ST_MakePoint(35.8415, 34.4484), 4326)),

('Afqa Grotto', 'Jbeil', 'A massive cave and waterfall, legendary source of the Adonis River.', 0.88, 
 ST_SetSRID(ST_MakePoint(35.8861, 34.0707), 4326)),

('Nabu Museum', 'Chekka', 'A modern museum on the coast showcasing cultural heritage and art.', 0.87, 
 ST_SetSRID(ST_MakePoint(35.7042, 34.3045), 4326)),

('Faqra Ruins', 'Kfardebian', 'Roman ruins including a temple to Adonis and a tower.', 0.83, 
 ST_SetSRID(ST_MakePoint(35.8075, 33.9986), 4326)),

('Saydet el Nourieh', 'Chekka', 'Historic monastery perched on a cliff edge with sea views.', 0.90, 
 ST_SetSRID(ST_MakePoint(35.6938, 34.3102), 4326)),

('Our Lady of Mantara', 'Maghdouche', 'Ancient shrine and cave where the Virgin Mary reportedly waited for Jesus.', 0.86, 
 ST_SetSRID(ST_MakePoint(35.3810, 33.5274), 4326)),

('Chateau Kefraya', 'Bekaa', 'One of the largest wineries in the Bekaa Valley offering tours.', 0.86, 
 ST_SetSRID(ST_MakePoint(35.7470, 33.6591), 4326)),

('Bkassine Pine Forest', 'Jezzine', 'The largest pine forest in the Middle East, great for hiking.', 0.85, 
 ST_SetSRID(ST_MakePoint(35.5681, 33.5585), 4326)),

('Hermel Pyramid', 'Hermel', 'An ancient obelisk-monument located in the northern Bekaa.', 0.78, 
 ST_SetSRID(ST_MakePoint(36.4159, 34.3647), 4326)),

('Qammouaa Nature Reserve', 'Akkar', 'Stunning remote forest and mountains in the far north.', 0.84, 
 ST_SetSRID(ST_MakePoint(36.2246, 34.4923), 4326)),

('Sidon Soap Museum', 'Sidon', 'Beautifully restored factory explaining the history of soap making.', 0.83, 
 ST_SetSRID(ST_MakePoint(35.3713, 33.5628), 4326));