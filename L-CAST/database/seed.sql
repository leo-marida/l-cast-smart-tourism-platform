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

-- 3. Insert Data with EXACT Google Maps Coordinates
INSERT INTO pois (name, region, description, base_popularity_score, image_url, location) VALUES 
('Raouche Rocks', 'Beirut', 'Famous rock formation off the coast of Raouche.', 0.95, 'https://commons.wikimedia.org/wiki/Special:FilePath/Pigeon_Rocks_of_Beirut,_Rock_of_Raouche,_Beirut,_Lebanon.jpg?width=800', ST_SetSRID(ST_MakePoint(35.47395, 33.89043), 4326)),
('Byblos Citadel', 'Jbeil', 'Ancient crusader castle and Phoenician ruins.', 0.90, 'https://commons.wikimedia.org/wiki/Special:FilePath/Byblos_Castle,_Byblos,_Lebanon.jpg?width=800', ST_SetSRID(ST_MakePoint(35.64808, 34.12053), 4326)),
('Baalbek Temples', 'Bekaa', 'Massive Roman temple complex.', 0.85, 'https://commons.wikimedia.org/wiki/Special:FilePath/Temple_of_Bacchus.jpg?width=800', ST_SetSRID(ST_MakePoint(36.21045, 34.00676), 4326)),
('Mleeta Landmark', 'South', 'Resistance tourism landmark.', 0.70, 'https://commons.wikimedia.org/wiki/Special:FilePath/Mleeta,_South_Lebanon.jpg?width=800', ST_SetSRID(ST_MakePoint(35.53925, 33.51866), 4326)),
('Sidon Sea Castle', 'Sidon', 'Crusader fortress built on a small island.', 0.80, 'https://commons.wikimedia.org/wiki/Special:FilePath/Sidon_Sea_Castle.jpg?width=800', ST_SetSRID(ST_MakePoint(35.37077, 33.56788), 4326)),
('Beiteddine Palace', 'Chouf', '19th-century palace complex.', 0.88, 'https://commons.wikimedia.org/wiki/Special:FilePath/Lebanon_banner_Beiteddine_Palace.jpg?width=800', ST_SetSRID(ST_MakePoint(35.58066, 33.69539), 4326)),
('Anjar Ruins', 'Bekaa', 'Umayyad period ruins.', 0.75, 'https://commons.wikimedia.org/wiki/Special:FilePath/Anjar.jpg?width=800', ST_SetSRID(ST_MakePoint(35.92695, 33.72622), 4326)),
('National Museum of Beirut', 'Beirut', 'Principal museum of archaeology.', 0.92, 'https://commons.wikimedia.org/wiki/Special:FilePath/National_Museum_of_Beirut.jpg?width=800', ST_SetSRID(ST_MakePoint(35.51493, 33.87851), 4326)),
('Jezzine Waterfall', 'South', 'Highest waterfall in Lebanon.', 0.82, 'https://commons.wikimedia.org/wiki/Special:FilePath/Lebanon_-_Jezine_Waterfalls.waterfall.jpg?width=800', ST_SetSRID(ST_MakePoint(35.58220, 33.54330), 4326)),
('Ksara Winery', 'Zahle', 'Oldest winery in Lebanon.', 0.85, 'https://commons.wikimedia.org/wiki/Special:FilePath/Chateau-Ksara-Observatoire-Winery-Lebanon-Wine.jpg?width=800', ST_SetSRID(ST_MakePoint(35.89000, 33.82330), 4326)),
('Our Lady of Lebanon', 'Jounieh', 'Marian shrine in Harissa.', 0.94, 'https://commons.wikimedia.org/wiki/Special:FilePath/Harissa_-_Lady_of_Lebanon_(4011272632).jpg?width=800', ST_SetSRID(ST_MakePoint(35.65171, 33.98188), 4326)),
('Pigeon Rocks', 'Beirut', 'Iconic natural arch.', 0.93, 'https://commons.wikimedia.org/wiki/Special:FilePath/Pigeon_Rocks_of_Beirut,_Rock_of_Raouche,_Beirut,_Lebanon.jpg?width=800', ST_SetSRID(ST_MakePoint(35.47400, 33.89000), 4326)),
('Mar Mikhael', 'Beirut', 'Nightlife and art hub.', 0.88, 'https://commons.wikimedia.org/wiki/Special:FilePath/Mar_Mikhael_Stairs.jpg?width=800', ST_SetSRID(ST_MakePoint(35.52660, 33.89940), 4326)),
('Tannourine Cedar Reserve', 'Batroun', 'Large cedar forest.', 0.89, 'https://commons.wikimedia.org/wiki/Special:FilePath/Cedars_in_Tannourine.jpg?width=800', ST_SetSRID(ST_MakePoint(35.92620, 34.20840), 4326)),
('Zaitunay Bay', 'Beirut', 'Luxury marina.', 0.91, 'https://commons.wikimedia.org/wiki/Special:FilePath/Zaitunay_Bay,_Downtown_Beirut,_Lebanon.jpg?width=800', ST_SetSRID(ST_MakePoint(35.49750, 33.90150), 4326)),
('Chouf Cedar Reserve', 'Chouf', 'Largest nature reserve.', 0.90, 'https://commons.wikimedia.org/wiki/Special:FilePath/Barouk_Cedars.jpg?width=800', ST_SetSRID(ST_MakePoint(35.69630, 33.69330), 4326));

INSERT INTO pois (name, region, description, base_popularity_score, image_url, location) VALUES 
('Jeita Grotto', 'Jeita', 'Breathtaking system of crystallized limestone caves.', 0.98, 'https://commons.wikimedia.org/wiki/Special:FilePath/Upper_Jeita_Grotto.jpg?width=800', ST_SetSRID(ST_MakePoint(35.64150, 33.94330), 4326)),
('Cedars of God', 'Bcharre', 'Ancient cedar forest and UNESCO World Heritage site.', 0.96, 'https://commons.wikimedia.org/wiki/Special:FilePath/Cedars_of_God.jpg?width=800', ST_SetSRID(ST_MakePoint(36.04940, 34.24350), 4326)),
('Tyre Hippodrome', 'Tyre', 'One of the largest and best-preserved Roman hippodromes.', 0.90, 'https://commons.wikimedia.org/wiki/Special:FilePath/Roman_Hippodrome,_Tyre,_Lebanon.jpg?width=800', ST_SetSRID(ST_MakePoint(35.20330, 33.27060), 4326)),
('Batroun Old Souks', 'Batroun', 'Charming coastal town with Phoenician sea wall.', 0.93, 'https://commons.wikimedia.org/wiki/Special:FilePath/Batroun_Phoenician_Wall.jpg?width=800', ST_SetSRID(ST_MakePoint(35.66440, 34.24970), 4326)),
('Deir el Qamar', 'Chouf', 'Historic village of stone palaces and mosques.', 0.89, 'https://commons.wikimedia.org/wiki/Special:FilePath/Deir_El-Qamar.jpg?width=800', ST_SetSRID(ST_MakePoint(35.56190, 33.70000), 4326)),
('Taanayel Lake', 'Bekaa', 'Peaceful nature reserve and lake ideal for walking.', 0.86, 'https://commons.wikimedia.org/wiki/Special:FilePath/Taanayel_Lake.jpg?width=800', ST_SetSRID(ST_MakePoint(35.87420, 33.79500), 4326)),
('Mohammad Al-Amin Mosque', 'Beirut', 'The iconic Blue Mosque in downtown Beirut.', 0.92, 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Mohammad_Al-Amin_Mosque_3.jpg?width=800', ST_SetSRID(ST_MakePoint(35.50560, 33.89470), 4326)),
('Sursock Museum', 'Beirut', 'Modern art and contemporary culture museum.', 0.87, 'https://commons.wikimedia.org/wiki/Special:FilePath/Sursock_Museum,_Beirut,_2017.jpg?width=800', ST_SetSRID(ST_MakePoint(35.51330, 33.89330), 4326)),
('Beaufort Castle', 'Nabatieh', 'Crusader fortress offering panoramic views of the south.', 0.81, 'https://commons.wikimedia.org/wiki/Special:FilePath/The_ruins_of_Beaufort_Castle_in_2022..jpg?width=800', ST_SetSRID(ST_MakePoint(35.52980, 33.32830), 4326)),
('Qadisha Valley', 'Bcharre', 'The Holy Valley, deep gorge with ancient monasteries.', 0.91, 'https://commons.wikimedia.org/wiki/Special:FilePath/View_of_the_Kadisha_Valley,_Lebanon.jpg?width=800', ST_SetSRID(ST_MakePoint(35.99000, 34.25000), 4326)),
('Mzaar Kfardebian', 'Kfardebian', 'Largest ski resort in the Middle East.', 0.94, 'https://commons.wikimedia.org/wiki/Special:FilePath/Faqra_Roman_ruins_-_panoramio.jpg?width=800', ST_SetSRID(ST_MakePoint(35.83330, 33.99150), 4326)),
('Tripoli Citadel', 'Tripoli', 'Raymond de Saint-Gilles Citadel overlooking the city.', 0.85, 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Citadel_of_Raymond_de_Saint-Gilles,_skyline_of_Tripoli,_Lebanon.jpg?width=800', ST_SetSRID(ST_MakePoint(35.84360, 34.43330), 4326)),
('Baatara Gorge Waterfall', 'Tannourine', 'Stunning waterfall dropping 255m through three natural bridges.', 0.97, 'https://commons.wikimedia.org/wiki/Special:FilePath/Baatara_waterfall,_Lebanon_44162.jpg?width=800', ST_SetSRID(ST_MakePoint(35.87040, 34.17340), 4326)),
('Saint Charbel Shrine', 'Annaya', 'Monastery of St. Maron, a major pilgrimage site.', 0.96, 'https://commons.wikimedia.org/wiki/Special:FilePath/Statue_of_St._Charbel.jpg?width=800', ST_SetSRID(ST_MakePoint(35.69530, 34.11660), 4326)),
('Moussa Castle', 'Chouf', 'A castle built by a single man over 60 years, featuring wax figures.', 0.88, 'https://commons.wikimedia.org/wiki/Special:FilePath/MoussaCastle1.jpg?width=800', ST_SetSRID(ST_MakePoint(35.58190, 33.69830), 4326)),
('Mseilha Fort', 'Batroun', 'Historic fortification built on a rocky limestone rock.', 0.86, 'https://commons.wikimedia.org/wiki/Special:FilePath/Mseilha_fort,_Lebanon.jpg?width=800', ST_SetSRID(ST_MakePoint(35.67360, 34.27360), 4326)),
('Horsh Ehden Nature Reserve', 'Ehden', 'A nature reserve on the slopes of Mount Lebanon with unique biodiversity.', 0.91, 'https://commons.wikimedia.org/wiki/Special:FilePath/Horsh_Ehden_(2001)_01.jpg?width=800', ST_SetSRID(ST_MakePoint(35.99100, 34.31200), 4326)),
('Rashaya Citadel', 'Rashaya', 'The Citadel of Independence where leaders were imprisoned in 1943.', 0.87, 'https://commons.wikimedia.org/wiki/Special:FilePath/Rashaya_Citadel.jpg?width=800', ST_SetSRID(ST_MakePoint(35.84450, 33.50150), 4326)),
('Lake Qaraoun', 'Bekaa', 'The largest artificial lake in Lebanon, offering stunning views.', 0.84, 'https://commons.wikimedia.org/wiki/Special:FilePath/Qaraoun_Lake_1.jpg?width=800', ST_SetSRID(ST_MakePoint(35.69190, 33.56860), 4326)),
('Douma Village', 'Batroun', 'Traditional village known for its red-tiled roof houses.', 0.85, 'https://commons.wikimedia.org/wiki/Special:FilePath/Douma,_centre_du_village.JPG?width=800', ST_SetSRID(ST_MakePoint(35.84230, 34.20330), 4326));