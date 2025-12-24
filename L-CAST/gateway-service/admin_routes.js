const redis = require('redis');
const client = redis.createClient({ url: 'redis://cache:6379' });
client.connect();

const ADMIN_TOKEN = "competition-secret-2025";

app.post('/admin/simulate-crisis', (req, res) => {
    const token = req.headers['x-admin-token'];
    
    // Security Rigor: Only authorized sessions can trigger a crisis
    if (token !== ADMIN_TOKEN) {
        return res.status(403).json({ error: "Access Denied" });
    }

    // ... (rest of your crisis logic)
});