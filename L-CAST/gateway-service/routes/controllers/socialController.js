// Post a new story
exports.postStory = async (req, res) => {
    try {
        const userId = req.user.id; // From your auth middleware
        const imageUrl = req.file.path; // Assuming you use Multer for uploads

        const newStory = await db.query(
            "INSERT INTO stories (user_id, image_url) VALUES ($1, $2) RETURNING *",
            [userId, imageUrl]
        );

        res.status(201).json(newStory.rows[0]);
    } catch (err) {
        res.status(500).json({ error: "Failed to post story" });
    }
};

// Get all active stories (last 24 hours)
exports.getStories = async (req, res) => {
    try {
        const stories = await db.query(`
            SELECT stories.*, users.username 
            FROM stories 
            JOIN users ON stories.user_id = users.id 
            WHERE stories.created_at > NOW() - INTERVAL '24 hours'
            ORDER BY stories.created_at DESC
        `);
        res.json(stories.rows);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch stories" });
    }
};