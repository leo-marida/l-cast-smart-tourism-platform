-- 1. Reset
DROP TABLE IF EXISTS pois CASCADE;

-- 2. Create Table
CREATE TABLE pois (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    region VARCHAR(255),
    description TEXT,
    base_popularity_score FLOAT,
    friction_index FLOAT DEFAULT 1.0,
    image_url TEXT,
    location GEOGRAPHY(POINT, 4326)
);

-- 3. Insert Data with URL-ENCODED Images (Fixes Mobile Display)
INSERT INTO pois (name, region, description, base_popularity_score, image_url, location) VALUES 
('Raouche Rocks', 'Beirut', 'Famous rock formation off the coast of Raouche.', 0.95, 'https://commons.wikimedia.org/wiki/Special:FilePath/Pigeon_Rocks_of_Beirut%2C_Rock_of_Raouche%2C_Beirut%2C_Lebanon.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.4735, 33.8902), 4326)),

('Byblos Citadel', 'Jbeil', 'Ancient crusader castle and Phoenician ruins.', 0.90, 'https://commons.wikimedia.org/wiki/Special:FilePath/Byblos_Castle%2C_Byblos%2C_Lebanon.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.6482, 34.1206), 4326)),

('Baalbek Temples', 'Bekaa', 'Massive Roman temple complex.', 0.85, 'https://commons.wikimedia.org/wiki/Special:FilePath/Temple_of_Bacchus.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(36.2086, 34.0059), 4326)),

('Mleeta Landmark', 'South', 'Resistance tourism landmark.', 0.70, 'https://commons.wikimedia.org/wiki/Special:FilePath/Mleeta%2C_South_Lebanon.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.5401, 33.5204), 4326)),

('Sidon Sea Castle', 'Sidon', 'Crusader fortress built on a small island.', 0.80, 'https://commons.wikimedia.org/wiki/Special:FilePath/Sidon_Sea_Castle.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.3695, 33.5672), 4326)),

('Beiteddine Palace', 'Chouf', '19th-century palace complex.', 0.88, 'https://commons.wikimedia.org/wiki/Special:FilePath/Lebanon_banner_Beiteddine_Palace.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.5807, 33.6953), 4326)),

('Anjar Ruins', 'Bekaa', 'Umayyad period ruins.', 0.75, 'https://commons.wikimedia.org/wiki/Special:FilePath/Anjar.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.9270, 33.7262), 4326)),

('National Museum of Beirut', 'Beirut', 'Principal museum of archaeology.', 0.92, 'https://commons.wikimedia.org/wiki/Special:FilePath/National_Museum_of_Beirut.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.5149, 33.8785), 4326)),

('Jezzine Waterfall', 'South', 'Highest waterfall in Lebanon.', 0.82, 'https://commons.wikimedia.org/wiki/Special:FilePath/Lebanon_-_Jezine_Waterfalls.waterfall.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.5822, 33.5433), 4326)),

('Ksara Winery', 'Zahle', 'Oldest winery in Lebanon.', 0.85, 'https://commons.wikimedia.org/wiki/Special:FilePath/Chateau-Ksara-Observatoire-Winery-Lebanon-Wine.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.8900, 33.8233), 4326)),

('Our Lady of Lebanon', 'Jounieh', 'Marian shrine in Harissa.', 0.94, 'https://commons.wikimedia.org/wiki/Special:FilePath/Harissa_-_Lady_of_Lebanon_(4011272632).jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.6517, 33.9818), 4326)),

('Pigeon Rocks', 'Beirut', 'Iconic natural arch.', 0.93, 'https://commons.wikimedia.org/wiki/Special:FilePath/Pigeon_Rocks_of_Beirut%2C_Rock_of_Raouche%2C_Beirut%2C_Lebanon.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.4735, 33.8902), 4326)),

('Mar Mikhael', 'Beirut', 'Nightlife and art hub.', 0.88, 'https://commons.wikimedia.org/wiki/Special:FilePath/Mar_Mikhael_Stairs.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.5266, 33.8994), 4326)),

('Tannourine Cedar Reserve', 'Batroun', 'Large cedar forest.', 0.89, 'https://commons.wikimedia.org/wiki/Special:FilePath/Cedars_in_Tannourine.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.9262, 34.2084), 4326)),

('Zaitunay Bay', 'Beirut', 'Luxury marina.', 0.91, 'https://commons.wikimedia.org/wiki/Special:FilePath/Zaitunay_Bay%2C_Downtown_Beirut%2C_Lebanon.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.4984, 33.9023), 4326)),

('Chouf Cedar Reserve', 'Chouf', 'Largest nature reserve.', 0.90, 'https://commons.wikimedia.org/wiki/Special:FilePath/Barouk_Cedars.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.6963, 33.6933), 4326));

-- Extra Locations (Encoded)
INSERT INTO pois (name, region, description, base_popularity_score, image_url, location) VALUES 
('Jeita Grotto', 'Jeita', 'Breathtaking system of crystallized limestone caves.', 0.98, 'https://commons.wikimedia.org/wiki/Special:FilePath/Upper_Jeita_Grotto.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.6418, 33.9450), 4326)),

('Cedars of God', 'Bcharre', 'Ancient cedar forest and UNESCO World Heritage site.', 0.96, 'https://commons.wikimedia.org/wiki/Special:FilePath/Cedars_of_God.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(36.0494, 34.2435), 4326)),

('Tyre Hippodrome', 'Tyre', 'One of the largest and best-preserved Roman hippodromes.', 0.90, 'https://commons.wikimedia.org/wiki/Special:FilePath/Roman_Hippodrome%2C_Tyre%2C_Lebanon.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.2033, 33.2706), 4326)),

('Batroun Old Souks', 'Batroun', 'Charming coastal town with Phoenician sea wall.', 0.93, 'https://commons.wikimedia.org/wiki/Special:FilePath/Batroun_Phoenician_Wall.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.6644, 34.2497), 4326)),

('Deir el Qamar', 'Chouf', 'Historic village of stone palaces and mosques.', 0.89, 'https://commons.wikimedia.org/wiki/Special:FilePath/Deir_El-Qamar.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.5619, 33.7000), 4326)),

('Taanayel Lake', 'Bekaa', 'Peaceful nature reserve and lake ideal for walking.', 0.86, 'https://commons.wikimedia.org/wiki/Special:FilePath/Taanayel_Lake.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.8742, 33.7950), 4326)),

('Mohammad Al-Amin Mosque', 'Beirut', 'The iconic Blue Mosque in downtown Beirut.', 0.92, 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Mohammad_Al-Amin_Mosque_3.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.5056, 33.8947), 4326)),

('Sursock Museum', 'Beirut', 'Modern art and contemporary culture museum.', 0.87, 'https://commons.wikimedia.org/wiki/Special:FilePath/Sursock_Museum%2C_Beirut%2C_2017.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.5133, 33.8933), 4326)),

('Beaufort Castle', 'Nabatieh', 'Crusader fortress offering panoramic views of the south.', 0.81, 'https://commons.wikimedia.org/wiki/Special:FilePath/The_ruins_of_Beaufort_Castle_in_2022..jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.5298, 33.3283), 4326)),

('Qadisha Valley', 'Bcharre', 'The Holy Valley, deep gorge with ancient monasteries.', 0.91, 'https://commons.wikimedia.org/wiki/Special:FilePath/View_of_the_Kadisha_Valley%2C_Lebanon.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.9900, 34.2500), 4326)),

('Mzaar Kfardebian', 'Kfardebian', 'Largest ski resort in the Middle East.', 0.94, 'https://commons.wikimedia.org/wiki/Special:FilePath/Faqra_Roman_ruins_-_panoramio.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.8333, 33.9915), 4326)),

('Tripoli Citadel', 'Tripoli', 'Raymond de Saint-Gilles Citadel overlooking the city.', 0.85, 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Citadel_of_Raymond_de_Saint-Gilles%2C_skyline_of_Tripoli%2C_Lebanon.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.8436, 34.4333), 4326)),

('Baatara Gorge Waterfall', 'Tannourine', 'Stunning waterfall dropping 255m through three natural bridges.', 0.97, 'https://commons.wikimedia.org/wiki/Special:FilePath/Baatara_waterfall%2C_Lebanon_44162.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.8704, 34.1734), 4326)),

('Saint Charbel Shrine', 'Annaya', 'Monastery of St. Maron, a major pilgrimage site.', 0.96, 'https://commons.wikimedia.org/wiki/Special:FilePath/Statue_of_St._Charbel.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.6953, 34.1166), 4326)),

('Moussa Castle', 'Chouf', 'A castle built by a single man over 60 years, featuring wax figures.', 0.88, 'https://commons.wikimedia.org/wiki/Special:FilePath/MoussaCastle1.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.5819, 33.6983), 4326)),

('Mseilha Fort', 'Batroun', 'Historic fortification built on a rocky limestone rock.', 0.86, 'https://commons.wikimedia.org/wiki/Special:FilePath/Mseilha_fort%2C_Lebanon.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.6736, 34.2736), 4326)),

('Horsh Ehden Nature Reserve', 'Ehden', 'A nature reserve on the slopes of Mount Lebanon with unique biodiversity.', 0.91, 'https://commons.wikimedia.org/wiki/Special:FilePath/Horsh_Ehden_(2001)_01.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.9910, 34.3120), 4326)),

('Rashaya Citadel', 'Rashaya', 'The Citadel of Independence where leaders were imprisoned in 1943.', 0.87, 'https://commons.wikimedia.org/wiki/Special:FilePath/Rashaya_Citadel.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.8445, 33.5015), 4326)),

('Lake Qaraoun', 'Bekaa', 'The largest artificial lake in Lebanon, offering stunning views.', 0.84, 'https://commons.wikimedia.org/wiki/Special:FilePath/Qaraoun_Lake_1.jpg?width=800', 
 ST_SetSRID(ST_MakePoint(35.6919, 33.5686), 4326)),

('Douma Village', 'Batroun', 'Traditional village known for its red-tiled roof houses.', 0.85, 'https://commons.wikimedia.org/wiki/Special:FilePath/Douma%2C_centre_du_village.JPG?width=800', 
 ST_SetSRID(ST_MakePoint(35.8423, 34.2033), 4326));