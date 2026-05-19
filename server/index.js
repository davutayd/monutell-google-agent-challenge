import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import pg from "pg";
import crypto from "crypto";
import { readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { SupervisorAgent, agentEvents } from "../agent/supervisor.js";
import { identifyMonumentFromImage } from "../agent/tools/visionTool.js";
import { monuments } from "../agent/mockData.js";
import { findNearbyMonuments } from "../agent/tools/monumentTool.js";

dotenv.config();

const { Pool } = pg;
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

const isValidUrl = (url) => url && url.startsWith("postgres");
const sanitizeDbUrl = (url) => url?.replace(/[&?]channel_binding=[^&]*/g, "") ?? url;

const readPool = isValidUrl(process.env.POSTGRES_URL)
  ? new Pool({
      connectionString: sanitizeDbUrl(process.env.POSTGRES_URL),
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 5,
    })
  : null;

const writePool = isValidUrl(process.env.AGENT_POSTGRES_URL)
  ? new Pool({
      connectionString: sanitizeDbUrl(process.env.AGENT_POSTGRES_URL),
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      max: 3,
    })
  : null;

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });
const supervisor = new SupervisorAgent();

const normalizePrivateKey = (key) => key?.replace(/\\n/g, "\n");

const loadServiceAccount = () => {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (rawJson) {
    return JSON.parse(rawJson.startsWith("'") && rawJson.endsWith("'") ? rawJson.slice(1, -1) : rawJson);
  }

  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      return JSON.parse(
        readFileSync(resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS), "utf8"),
      );
    } catch (error) {
      console.warn("Could not read GOOGLE_APPLICATION_CREDENTIALS:", error.message);
    }
  }

  const localCredentialPaths = [
    resolve(projectRoot, "firebase-service-account.json"),
    resolve(projectRoot, "google-key.json"),
    resolve(projectRoot, "..", "..", "..", "MonuTell", "monutell-web", "google-key.json"),
  ];

  for (const filePath of localCredentialPaths) {
    try {
      return JSON.parse(readFileSync(filePath, "utf8"));
    } catch {}
  }

  return null;
};

const encodePathSegment = (value) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );

const createSignedGcsUrl = ({ bucketName, objectKey, expiresSeconds = 900 }) => {
  const serviceAccount = loadServiceAccount();
  if (!serviceAccount?.client_email || !serviceAccount?.private_key) {
    const error = new Error("Missing Firebase service account credentials for signed audio URLs");
    error.statusCode = 503;
    throw error;
  }

  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
  const timeStamp = `${dateStamp}T${now.toISOString().slice(11, 19).replace(/:/g, "")}Z`;
  const credentialScope = `${dateStamp}/auto/storage/goog4_request`;
  const credential = `${serviceAccount.client_email}/${credentialScope}`;
  const canonicalUri = `/${bucketName}/${objectKey.split("/").map(encodePathSegment).join("/")}`;
  const host = "storage.googleapis.com";
  const canonicalQueryString = [
    ["X-Goog-Algorithm", "GOOG4-RSA-SHA256"],
    ["X-Goog-Credential", credential],
    ["X-Goog-Date", timeStamp],
    ["X-Goog-Expires", String(expiresSeconds)],
    ["X-Goog-SignedHeaders", "host"],
  ]
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  const canonicalHeaders = `host:${host}\n`;
  const signedHeaders = "host";
  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const hashedCanonicalRequest = crypto
    .createHash("sha256")
    .update(canonicalRequest)
    .digest("hex");
  const stringToSign = [
    "GOOG4-RSA-SHA256",
    timeStamp,
    credentialScope,
    hashedCanonicalRequest,
  ].join("\n");
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(stringToSign)
    .sign(normalizePrivateKey(serviceAccount.private_key), "hex");

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Goog-Signature=${signature}`;
};

const getAudioUrlForLanguage = (monument, language = "en") => {
  if (language.startsWith("tr")) return monument.audio_tr || monument.audio_en;
  if (language.startsWith("hu")) return monument.audio_hu || monument.audio_en;
  return monument.audio_en || monument.audio_tr || monument.audio_hu;
};

const signAudioUrlIfNeeded = (rawUrl) => {
  const parsed = new URL(rawUrl);
  if (parsed.hostname !== "storage.googleapis.com") return rawUrl;

  const parts = parsed.pathname.split("/").filter(Boolean);
  const sourceBucket = parts.shift();
  const objectKey = decodeURIComponent(parts.join("/"));
  const bucketName =
    sourceBucket === "monutell-assets" || sourceBucket === "monutell-secure-audio"
      ? "monutell-secure-audio"
      : sourceBucket;

  return createSignedGcsUrl({ bucketName, objectKey });
};

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/api/monuments", async (req, res) => {
  /**
   * DB schema (real columns):
   *   id, name_en, name_tr, name_hu, category, address,
   *   latitude, longitude, story_en, story_tr, story_hu,
   *   image_url, audio_en, audio_tr, audio_hu, is_audited, place_id
   *
   * mockData schema (camelCase):
   *   id, name, category, description, location{lat,lng}, latitude, longitude,
   *   imageUrl, audioUrl
   */
  const normalizeMonument = (m) => ({
    id:          m.id,
    // DB uses name_en/name_tr/name_hu; mockData uses name
    name:        m.name_en ?? m.name ?? null,
    name_en:     m.name_en ?? m.name ?? null,
    name_tr:     m.name_tr ?? m.name ?? null,
    name_hu:     m.name_hu ?? m.name ?? null,
    // DB uses story_en etc; mockData uses description
    description: m.story_en ?? m.description ?? null,
    story_en:    m.story_en ?? m.description ?? null,
    story_tr:    m.story_tr ?? m.description ?? null,
    story_hu:    m.story_hu ?? m.description ?? null,
    category:    m.category ?? null,
    address:     m.address ?? null,
    latitude:    parseFloat(m.latitude  ?? m.location?.lat  ?? 0),
    longitude:   parseFloat(m.longitude ?? m.location?.lng  ?? 0),
    // DB uses image_url; mockData uses imageUrl
    imageUrl:    m.image_url ?? m.imageUrl ?? null,
    audio_en:    m.audio_en ?? m.audioUrl ?? null,
    audio_tr:    m.audio_tr ?? m.audioUrl ?? null,
    audio_hu:    m.audio_hu ?? m.audioUrl ?? null,
    is_audited:  m.is_audited ?? null,
    place_id:    m.place_id ?? null,
  });

  if (!readPool) {
    console.log("[/api/monuments] readPool is null — POSTGRES_URL not set, using mockData");
    return res.json({ status: "success", source: "mock", monuments: monuments.map(normalizeMonument) });
  }

  try {
    const result = await readPool.query("SELECT * FROM monuments ORDER BY name_en");
    console.log(`[/api/monuments] DB OK — returned ${result.rows.length} rows`);
    res.json({ status: "success", source: "db", monuments: result.rows.map(normalizeMonument) });
  } catch (error) {
    console.error("[/api/monuments] DB query failed:", error.message);
    console.warn("[/api/monuments] Falling back to mockData");
    res.json({ status: "success", source: "mock", monuments: monuments.map(normalizeMonument) });
  }
});

app.post("/api/audio-access", async (req, res) => {
  try {
    const { monumentId, language = "en" } = req.body || {};
    if (!monumentId) {
      return res.status(400).json({ error: "Missing monumentId" });
    }

    let monument = null;
    if (readPool) {
      const result = await readPool.query(
        "SELECT id, audio_tr, audio_en, audio_hu FROM monuments WHERE id = $1",
        [monumentId],
      );
      monument = result.rows[0] || null;
    } else {
      monument = monuments.find((item) => String(item.id) === String(monumentId));
    }

    if (!monument) {
      return res.status(404).json({ error: "Monument not found" });
    }

    const rawUrl = getAudioUrlForLanguage(monument, language);
    if (!rawUrl) {
      return res.status(404).json({ error: "Audio track not found for this monument" });
    }

    const signedUrl = signAudioUrlIfNeeded(rawUrl);
    res.json({
      allowed: true,
      remaining: null,
      replayed: true,
      monumentId,
      signedUrl,
    });
  } catch (error) {
    console.error("Audio Access Error:", error.message);
    res.status(error.statusCode || 500).json({
      error: "AUDIO_ACCESS_FAILED",
      message: error.message,
    });
  }
});

app.post("/api/chat", async (req, res) => {
  const { message, context, language } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  // ── SSE headers ───────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // ── Forward agent step events to the client ───────────────────────────────
  const stepHandler = (data) => {
    res.write(`data: ${JSON.stringify({ type: "step", message: data.message })}\n\n`);
  };
  agentEvents.on("step", stepHandler);

  // Merge top-level language into the context object so supervisor can use it
  const enrichedContext = { ...(context || {}), language: language || context?.language };

  try {
    const steps = await supervisor.processMessage(message, enrichedContext);

    // Build a structured result from steps for the frontend
    const agentMessage = steps
      .filter((s) => s.type === "agent_message")
      .map((s) => s.content)
      .join("\n");

    const monumentResult = steps.find(
      (s) => s.type === "tool_result" && s.name === "find_nearby_monuments",
    );
    const routeResult = steps.find(
      (s) => s.type === "tool_result" && s.name === "optimize_tour_route",
    );

    agentEvents.off("step", stepHandler);
    res.write(
      `data: ${JSON.stringify({
        type: "result",
        response: agentMessage,
        monuments: monumentResult?.result?.monuments ?? null,
        route: routeResult?.result ?? null,
        agent_steps: steps,
      })}\n\n`,
    );
    res.end();
  } catch (error) {
    console.error("Chat API Error:", error);
    agentEvents.off("step", stepHandler);
    res.write(
      `data: ${JSON.stringify({ type: "error", message: error.message })}\n\n`,
    );
    res.end();
  }
});

app.post("/api/vision", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }

    const result = await identifyMonumentFromImage({
      image_path: req.file.path,
    });
    res.json(result);
  } catch (error) {
    console.error("Vision API Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/ambient", async (req, res) => {
  try {
    const { lat, lng, radius_km, seen_ids } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Location required" });
    }

    const result = await findNearbyMonuments({
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius_km: radius_km || 0.5,
    });

    if (result.status === "success") {
      const unseen = result.monuments.filter(
        (m) => !(seen_ids || []).includes(m.id),
      );
      res.json({ status: "success", ambient_monuments: unseen });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/ambient", async (req, res) => {
  try {
    const { lat, lng, radius_km, seen_ids } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Location required" });
    }

    const userLat    = parseFloat(lat);
    const userLng    = parseFloat(lng);
    const radiusKm   = parseFloat(radius_km) || 0.5;
    const seenIds    = seen_ids ? seen_ids.split(",").filter(Boolean) : [];

    let nearby = [];

    if (readPool) {
      // Haversine distance in SQL — returns only monuments within the radius
      const result = await readPool.query(
        `SELECT *,
          (6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )) AS distance
         FROM monuments
         WHERE (6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          )) <= $3
         ORDER BY distance ASC
         LIMIT 20`,
        [userLat, userLng, radiusKm]
      );

      nearby = result.rows.map((m) => ({
        id:        String(m.id),
        name:      m.name_en ?? null,
        name_en:   m.name_en ?? null,
        name_tr:   m.name_tr ?? null,
        name_hu:   m.name_hu ?? null,
        category:  m.category ?? null,
        imageUrl:  m.image_url ?? null,
        latitude:  parseFloat(m.latitude),
        longitude: parseFloat(m.longitude),
        distance:  parseFloat(m.distance),
        audio_en:  m.audio_en ?? null,
        audio_tr:  m.audio_tr ?? null,
        audio_hu:  m.audio_hu ?? null,
      }));
    } else {
      // Fallback to mockData via findNearbyMonuments
      const result = await findNearbyMonuments({ lat: userLat, lng: userLng, radius_km: radiusKm });
      if (result.status === "success") {
        nearby = result.monuments.map((m) => ({
          ...m,
          id:       String(m.id),
          name:     m.name_en ?? m.name ?? null,
          imageUrl: m.imageUrl ?? null,
        }));
      }
    }

    const unseen = nearby.filter((m) => !seenIds.includes(String(m.id)));
    res.json({ status: "success", ambient_monuments: unseen });
  } catch (error) {
    console.error("[/api/ambient] Error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin Login
app.post("/api/admin/login", (req, res) => {
  const { password } = req.body;
  if (password === process.env.ADMIN_PASSWORD) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

// Admin endpoints
const checkAdmin = (req, res, next) => {
  const pwd = req.headers["x-admin-password"];
  if (pwd === process.env.ADMIN_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
};

app.get("/api/admin/submissions", checkAdmin, async (req, res) => {
  if (!writePool)
    return res
      .status(503)
      .json({ error: "Agent DB not configured", submissions: [] });
  try {
    const result = await writePool.query(
      "SELECT * FROM submissions ORDER BY created_at DESC",
    );
    res.json({ submissions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB Error" });
  }
});

app.patch("/api/admin/submissions/:id", checkAdmin, async (req, res) => {
  if (!writePool)
    return res.status(503).json({ error: "Agent DB not configured" });
  try {
    const { id } = req.params;
    const { status } = req.body;
    await writePool.query("UPDATE submissions SET status = $1 WHERE id = $2", [
      status,
      id,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB Error" });
  }
});

app.post("/api/submit-photo", upload.single("image"), async (req, res) => {
  if (!writePool) {
    // No DB configured — acknowledge receipt but don't persist
    return res.json({
      success: true,
      submission_id: null,
      note: "Agent DB not configured, photo not persisted",
    });
  }
  try {
    const { monument_id, confidence } = req.body;
    let imageUrl = "";
    if (req.file) {
      imageUrl = "/uploads/" + req.file.filename;
    }

    const result = await writePool.query(
      "INSERT INTO submissions (type, target_monument_id, image_url, confidence) VALUES ($1, $2, $3, $4) RETURNING id",
      ["photo_upload", monument_id, imageUrl, confidence],
    );
    res.json({ success: true, submission_id: result.rows[0].id });
  } catch (err) {
    console.error("Submit photo error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(port, async () => {
  console.log(`MonuTell API server running on port ${port}`);

  // ── Startup DB connectivity check ──────────────────────────────────────────
  if (readPool) {
    try {
      const r = await readPool.query("SELECT COUNT(*) AS c FROM monuments");
      console.log(`✅ [DB] Connected — ${r.rows[0].c} monuments from Neon PostgreSQL`);
    } catch (err) {
      console.error("❌ [DB] Connection FAILED at startup:", err.message);
      console.warn("⚠️  [DB] API will fall back to mockData (10 mock monuments)");
    }
  } else {
    console.warn("⚠️  [DB] POSTGRES_URL not set — using mockData (10 mock monuments)");
  }
});
