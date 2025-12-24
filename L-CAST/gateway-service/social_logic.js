const neo4j = require('neo4j-driver');
const driver = neo4j.driver(
  'bolt://graph-db:7687',
  neo4j.auth.basic('neo4j', process.env.NEO4J_PASSWORD)
);

async function getTrustBoost(userId, poiId) {
  const session = driver.session();
  try {
    // Cypher Query: Find if anyone I follow has been to this POI
    const result = await session.run(
      `MATCH (u:User {id: $userId})-[:FOLLOWS]->(f:User)-[:VISITED]->(p:POI {id: $poiId})
       RETURN count(f) AS trustCount`,
      { userId: userId, poiId: poiId }
    );
    const count = result.records[0].get('trustCount').toNumber();
    // Return a boost factor: 1.0 (no boost) to 1.2 (high trust)
    return 1 + (Math.min(count, 5) * 0.04); 
  } finally {
    await session.close();
  }
}

module.exports = { getTrustBoost };