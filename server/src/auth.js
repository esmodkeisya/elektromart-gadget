const jwt = require("jsonwebtoken");
const { prisma } = require("./prisma");

const SECRET = process.env.JWT_SECRET || "elektromart-local-dev-secret-change-me";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

function signToken(userId) {
  return jwt.sign({ sub: userId }, SECRET, { expiresIn: EXPIRES_IN });
}

function extractToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone || null,
    user_metadata: user.user_metadata || {},
    created_at: user.created_at,
  };
}

async function loadContext(req, token) {
  let payload;
  try {
    payload = jwt.verify(token, SECRET);
  } catch {
    return false;
  }
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return false;
  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  req.user = publicUser(user);
  req.profile = profile;
  return true;
}

async function requireUser(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ error: "Sesi tidak ditemukan. Silakan login." });
    const ok = await loadContext(req, token);
    if (!ok) return res.status(401).json({ error: "Sesi tidak valid. Silakan login ulang." });
    next();
  } catch (err) {
    res.status(401).json({ error: err.message || "Autentikasi gagal." });
  }
}

// Endpoint publik: tetap memuat req.user & req.profile bila ada token valid.
async function optionalUser(req, res, next) {
  try {
    const token = extractToken(req);
    if (token) await loadContext(req, token);
    next();
  } catch {
    next();
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.profile?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ error: "Akses ditolak." });
    }
    next();
  };
}

module.exports = { signToken, requireUser, requireRole, optionalUser, publicUser, extractToken, SECRET };
