-- 1. Clear existing data to avoid duplicates if re-seeding
TRUNCATE pois RESTART IDENTITY CASCADE;

-- 2. Insert Data
-- Note: image_url is set to NULL because we use local images in React Native now.
-- Order: name, region, description, base_popularity, location

INSERT INTO pois (name, region, description, base_popularity_score, location) VALUES 
('Raouche Rocks', 'Beirut', 'Famous rock formation off the coast of Raouche.', 0.95, ST_SetSRID(ST_MakePoint(35.4735, 33.8902), 4326)),

('Byblos Citadel', 'Jbeil', 'Ancient crusader castle and Phoenician ruins.', 0.90, ST_SetSRID(ST_MakePoint(35.6482, 34.1206), 4326)),

('Baalbek Temples', 'Bekaa', 'Massive Roman temple complex.', 0.85, ST_SetSRID(ST_MakePoint(36.2086, 34.0059), 4326)),

('Mleeta Landmark', 'South', 'Resistance tourism landmark.', 0.70, ST_SetSRID(ST_MakePoint(35.5401, 33.5204), 4326)),

('Sidon Sea Castle', 'Sidon', 'Crusader fortress built on a small island.', 0.80, ST_SetSRID(ST_MakePoint(35.3695, 33.5672), 4326)),

('Beiteddine Palace', 'Chouf', '19th-century palace complex.', 0.88, ST_SetSRID(ST_MakePoint(35.5807, 33.6953), 4326)),

('Anjar Ruins', 'Bekaa', 'Umayyad period ruins.', 0.75, ST_SetSRID(ST_MakePoint(35.9270, 33.7262), 4326)),

('National Museum of Beirut', 'Beirut', 'Principal museum of archaeology.', 0.92, ST_SetSRID(ST_MakePoint(35.5149, 33.8785), 4326)),

('Jezzine Waterfall', 'South', 'Highest waterfall in Lebanon.', 0.82, ST_SetSRID(ST_MakePoint(35.5822, 33.5433), 4326)),

('Ksara Winery', 'Zahle', 'Oldest winery in Lebanon.', 0.85, ST_SetSRID(ST_MakePoint(35.8900, 33.8233), 4326)),

('Our Lady of Lebanon', 'Jounieh', 'Marian shrine in Harissa.', 0.94, ST_SetSRID(ST_MakePoint(35.6517, 33.9818), 4326)),

('Pigeon Rocks', 'Beirut', 'Iconic natural arch.', 0.93, ST_SetSRID(ST_MakePoint(35.4735, 33.8902), 4326)),

('Mar Mikhael', 'Beirut', 'Nightlife and art hub.', 0.88, ST_SetSRID(ST_MakePoint(35.5266, 33.8994), 4326)),

('Tannourine Cedar Reserve', 'Batroun', 'Large cedar forest.', 0.89, ST_SetSRID(ST_MakePoint(35.9262, 34.2084), 4326)),

('Zaitunay Bay', 'Beirut', 'Luxury marina.', 0.91, ST_SetSRID(ST_MakePoint(35.4984, 33.9023), 4326)),

('Chouf Cedar Reserve', 'Chouf', 'Largest nature reserve.', 0.90, ST_SetSRID(ST_MakePoint(35.6963, 33.6933), 4326)),

('Jeita Grotto', 'Jeita', 'Breathtaking system of crystallized limestone caves.', 0.98, ST_SetSRID(ST_MakePoint(35.6418, 33.9450), 4326)),

('Cedars of God', 'Bcharre', 'Ancient cedar forest and UNESCO World Heritage site.', 0.96, ST_SetSRID(ST_MakePoint(36.0494, 34.2435), 4326)),

('Tyre Hippodrome', 'Tyre', 'One of the largest and best-preserved Roman hippodromes.', 0.90, ST_SetSRID(ST_MakePoint(35.2033, 33.2706), 4326)),

('Batroun Old Souks', 'Batroun', 'Charming coastal town with Phoenician sea wall.', 0.93, ST_SetSRID(ST_MakePoint(35.6644, 34.2497), 4326)),

('Deir el Qamar', 'Chouf', 'Historic village of stone palaces and mosques.', 0.89, ST_SetSRID(ST_MakePoint(35.5619, 33.7000), 4326)),

('Taanayel Lake', 'Bekaa', 'Peaceful nature reserve and lake ideal for walking.', 0.86, ST_SetSRID(ST_MakePoint(35.8742, 33.7950), 4326)),

('Mohammad Al-Amin Mosque', 'Beirut', 'The iconic Blue Mosque in downtown Beirut.', 0.92, ST_SetSRID(ST_MakePoint(35.5056, 33.8947), 4326)),

('Sursock Museum', 'Beirut', 'Modern art and contemporary culture museum.', 0.87, ST_SetSRID(ST_MakePoint(35.5133, 33.8933), 4326)),

('Beaufort Castle', 'Nabatieh', 'Crusader fortress offering panoramic views of the south.', 0.81, ST_SetSRID(ST_MakePoint(35.5298, 33.3283), 4326)),

('Qadisha Valley', 'Bcharre', 'The Holy Valley, deep gorge with ancient monasteries.', 0.91, ST_SetSRID(ST_MakePoint(35.9900, 34.2500), 4326)),

('Mzaar Kfardebian', 'Kfardebian', 'Largest ski resort in the Middle East.', 0.94, ST_SetSRID(ST_MakePoint(35.8333, 33.9915), 4326)),

('Tripoli Citadel', 'Tripoli', 'Raymond de Saint-Gilles Citadel overlooking the city.', 0.85, ST_SetSRID(ST_MakePoint(35.8436, 34.4333), 4326)),

('Baatara Gorge Waterfall', 'Tannourine', 'Stunning waterfall dropping 255m through three natural bridges.', 0.97, ST_SetSRID(ST_MakePoint(35.8704, 34.1734), 4326)),

('Saint Charbel Shrine', 'Annaya', 'Monastery of St. Maron, a major pilgrimage site.', 0.96, ST_SetSRID(ST_MakePoint(35.6953, 34.1166), 4326)),

('Moussa Castle', 'Chouf', 'A castle built by a single man over 60 years, featuring wax figures.', 0.88, ST_SetSRID(ST_MakePoint(35.5819, 33.6983), 4326)),

('Mseilha Fort', 'Batroun', 'Historic fortification built on a rocky limestone rock.', 0.86, ST_SetSRID(ST_MakePoint(35.6736, 34.2736), 4326)),

('Horsh Ehden Nature Reserve', 'Ehden', 'A nature reserve on the slopes of Mount Lebanon with unique biodiversity.', 0.91, ST_SetSRID(ST_MakePoint(35.9910, 34.3120), 4326)),

('Rashaya Citadel', 'Rashaya', 'The Citadel of Independence where leaders were imprisoned in 1943.', 0.87, ST_SetSRID(ST_MakePoint(35.8445, 33.5015), 4326)),

('Lake Qaraoun', 'Bekaa', 'The largest artificial lake in Lebanon, offering stunning views.', 0.84, ST_SetSRID(ST_MakePoint(35.6919, 33.5686), 4326)),

('Douma Village', 'Batroun', 'Traditional village known for its red-tiled roof houses.', 0.85, ST_SetSRID(ST_MakePoint(35.8423, 34.2033), 4326));