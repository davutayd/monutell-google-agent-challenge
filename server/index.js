import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import pg from 'pg';
import { SupervisorAgent } from '../agent/supervisor.js';
import { identifyMonumentFromImage } from '../agent/tools/visionTool.js';
import { monuments } from '../agent/mockData.js';
import { findNearbyMonuments } from '../agent/tools/monumentTool.js';

dotenv.config();

const { Pool } = pg;

// Only create pools if valid connection strings are provided
const isValidUrl = (url) => url && url.startsWith('postgres');

const readPool = isValidUrl(process.env.POSTGRES_URL)
  ? new Pool({ connectionString: process.env.POSTGRES_URL, ssl: { rejectUnauthorized: false } })
  : null;

const writePool = isValidUrl(process.env.AGENT_POSTGRES_URL)
  ? new Pool({ connectionString: process.env.AGENT_POSTGRES_URL, ssl: { rejectUnauthorized: false } })
  : null;

// Create submissions table if not exists
const initDb = async () => {
  if (!writePool) {
    console.warn('⚠️  AGENT_POSTGRES_URL not set — submissions DB disabled (demo mode)');
    return;
  }
  try {
    await writePool.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        type TEXT,
        status TEXT DEFAULT 'pending',
        target_monument_id INT,
        image_url TEXT,
        confidence FLOAT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Submissions table initialized');
  } catch (err) {
    console.error('Failed to initialize submissions table:', err.message);
  }
};
initDb();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const supervisor = new SupervisorAgent();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/api/monuments', async (req, res) => {
  try {
    if (readPool) {
      const result = await readPool.query('SELECT * FROM monuments');
      res.json({ status: 'success', monuments: result.rows });
    } else {
      // Fallback to mock data if DB isn't configured
      res.json({ status: 'success', monuments });
    }
  } catch (error) {
    console.error('Monuments API Error:', error.message);
    // Fallback to mock data on DB error too
    res.json({ status: 'success', monuments });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const steps = await supervisor.processMessage(message, context);
    res.json({ steps });
  } catch (error) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/vision', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const result = await identifyMonumentFromImage({ image_path: req.file.path });
    res.json(result);
  } catch (error) {
    console.error('Vision API Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/ambient', async (req, res) => {
  try {
    const { lat, lng, radius_km, seen_ids } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location required' });
    }

    const result = await findNearbyMonuments({ lat: parseFloat(lat), lng: parseFloat(lng), radius_km: radius_km || 0.5 });
    
    if (result.status === 'success') {
      const unseen = result.monuments.filter(m => !(seen_ids || []).includes(m.id));
      res.json({ status: 'success', ambient_monuments: unseen });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/ambient', async (req, res) => {
  try {
    const { lat, lng, radius_km, seen_ids } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location required' });
    }

    const seenIdsArray = seen_ids ? seen_ids.split(',') : [];
    const result = await findNearbyMonuments({ lat: parseFloat(lat), lng: parseFloat(lng), radius_km: parseFloat(radius_km) || 0.5 });
    
    if (result.status === 'success') {
      const unseen = result.monuments.filter(m => !seenIdsArray.includes(m.id));
      res.json({ status: 'success', ambient_monuments: unseen });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Admin endpoints
const checkAdmin = (req, res, next) => {
  const pwd = req.headers['x-admin-password'];
  if (pwd === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

app.get('/api/admin/submissions', checkAdmin, async (req, res) => {
  if (!writePool) return res.status(503).json({ error: 'Agent DB not configured', submissions: [] });
  try {
    const result = await writePool.query('SELECT * FROM submissions ORDER BY created_at DESC');
    res.json({ submissions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.patch('/api/admin/submissions/:id', checkAdmin, async (req, res) => {
  if (!writePool) return res.status(503).json({ error: 'Agent DB not configured' });
  try {
    const { id } = req.params;
    const { status } = req.body;
    await writePool.query('UPDATE submissions SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.post('/api/submit-photo', upload.single('image'), async (req, res) => {
  if (!writePool) {
    // No DB configured — acknowledge receipt but don't persist
    return res.json({ success: true, submission_id: null, note: 'Agent DB not configured, photo not persisted' });
  }
  try {
    const { monument_id, confidence } = req.body;
    let imageUrl = '';
    if (req.file) {
       imageUrl = '/uploads/' + req.file.filename;
    }
    
    const result = await writePool.query(
      'INSERT INTO submissions (type, target_monument_id, image_url, confidence) VALUES ($1, $2, $3, $4) RETURNING id',
      ['photo_upload', monument_id, imageUrl, confidence]
    );
    res.json({ success: true, submission_id: result.rows[0].id });
  } catch (err) {
    console.error('Submit photo error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`MonuTell API server running on port ${port}`);
});
