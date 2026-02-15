const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// 🔥 PATH ABSOLUTE (ANTI ERROR PANEL)
const DATA_DIR = path.join(__dirname, "data");
const USERS_DB = path.join(DATA_DIR, "users.json");
const WINNER_DB = path.join(DATA_DIR, "winner.json");
const BANNER_DB = path.join(DATA_DIR, "banner.json");
const STATUS_DB = path.join(DATA_DIR, "status.json");

// =====================
// PASTIKAN FOLDER DATA ADA
// =====================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// pastikan users.json ada
if (!fs.existsSync(USERS_DB)) {
  fs.writeFileSync(USERS_DB, JSON.stringify([], null, 2));
}

// pastikan winner.json ada
if (!fs.existsSync(WINNER_DB)) {
  fs.writeFileSync(WINNER_DB, JSON.stringify({}, null, 2));
}

// pastikan status.json ada
if (!fs.existsSync(STATUS_DB)) {
  fs.writeFileSync(
    STATUS_DB,
    JSON.stringify({ registrationClosed: false }, null, 2)
  );
}

// middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// utils
function generateVIPCode() {
  const part1 = Math.random().toString(36).substring(2,5).toUpperCase();
  const part2 = Math.random().toString(36).substring(2,5).toUpperCase();
  return `${part1}-${Math.floor(10 + Math.random() * 90)}${part2[0]}-VIP`;
}

// routes
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.post("/register", (req, res) => {
  const { name, deviceId } = req.body;
  
  // CEK STATUS PENDAFTARAN
const status = JSON.parse(fs.readFileSync(STATUS_DB, "utf8"));
if (status.registrationClosed) {
  return res.json({ error: "Pendaftaran sedang ditutup" });
}
  
  if (!name || !deviceId) {
    return res.json({ error: "Data tidak lengkap" });
  }

  let users = [];
  try {
    users = JSON.parse(fs.readFileSync(USERS_DB, "utf8"));
  } catch {
    users = [];
  }

  // ❌ Cegah 1 HP daftar lebih dari sekali
  if (users.some(u => u.deviceId === deviceId)) {
    return res.json({ error: "Perangkat ini sudah terdaftar" });
  }

  // ❌ Cegah nama dobel
  if (users.some(u => u.name.toLowerCase() === name.toLowerCase())) {
    return res.json({ error: "Nama sudah digunakan" });
  }

  // ✅ FORMAT KODE: XVI-67Y-VIP
  const code = generateVIPCode();

  const newUser = {
    name,
    code,
    deviceId,
    time: Date.now()
  };

  users.push(newUser);
  fs.writeFileSync(USERS_DB, JSON.stringify(users, null, 2));

  res.json(newUser);
});

// =====================
// ADMIN - GET ALL USERS
// =====================
app.get("/admin/users", (_, res) => {
  let users = [];
  try {
    users = JSON.parse(fs.readFileSync(USERS_DB, "utf8"));
  } catch {
    users = [];
  }
  res.json(users);
});

// admin pages
app.get("/admin", (_, res) => {
  res.redirect("/admin/login.html");
});

app.get("/admin/dashboard", (_, res) => {
  res.redirect("/admin/dashboard.html");
});

// admin login (simple)
app.post("/admin/login", (req, res) => {
  const { name, password } = req.body;

  if (name === "admin" && password === "admin123") {
    return res.json({ success: true });
  }

  res.json({ success: false, error: "Login gagal" });
});

// pick winner
app.post("/admin/pick", (_, res) => {

  // 🔒 CEK APAKAH SUDAH ADA PEMENANG
  try {
    const existingWinner = JSON.parse(fs.readFileSync(WINNER_DB, "utf8"));
    if (existingWinner && existingWinner.code) {
      return res.json({ error: "Pemenang sudah dipilih" });
    }
  } catch {}

  let users = [];
  try {
    users = JSON.parse(fs.readFileSync(USERS_DB, "utf8"));
  } catch {
    users = [];
  }

  if (users.length === 0)
    return res.json({ error: "Belum ada peserta" });

  const winner = users[Math.floor(Math.random() * users.length)];

  // ✅ Simpan winner
  fs.writeFileSync(WINNER_DB, JSON.stringify(winner, null, 2));

  // 🔒 AUTO LOCK PENDAFTARAN
  const status = JSON.parse(fs.readFileSync(STATUS_DB, "utf8"));
  status.registrationClosed = true;
  fs.writeFileSync(STATUS_DB, JSON.stringify(status, null, 2));

  res.json(winner);
});

// =====================
// ADMIN RESET SYSTEM
// =====================
app.post("/admin/reset", (_, res) => {
  try {
    // Kosongkan users
    fs.writeFileSync(USERS_DB, JSON.stringify([], null, 2));

    // Kosongkan winner
    fs.writeFileSync(WINNER_DB, JSON.stringify({}, null, 2));

    // Buka kembali pendaftaran
    fs.writeFileSync(
      STATUS_DB,
      JSON.stringify({ registrationClosed: false }, null, 2)
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal reset sistem" });
  }
});


// =====================
// GET WINNER (UNTUK USER)
// =====================
app.get("/winner", (_, res) => {
  if (!fs.existsSync(WINNER_DB)) {
    return res.json({ winner: null });
  }

  try {
    const winner = JSON.parse(fs.readFileSync(WINNER_DB, "utf8"));
    res.json({ winner });
  } catch {
    res.json({ winner: null });
  }
});

// =====================
// GET STATUS
// =====================
app.get("/status", (_, res) => {
  const status = JSON.parse(fs.readFileSync(STATUS_DB, "utf8"));
  res.json(status);
});

// =====================
// ADMIN TOGGLE STATUS
// =====================
app.post("/admin/toggle-registration", (_, res) => {
  const status = JSON.parse(fs.readFileSync(STATUS_DB, "utf8"));
  status.registrationClosed = !status.registrationClosed;

  fs.writeFileSync(STATUS_DB, JSON.stringify(status, null, 2));
  res.json(status);
});

// =====================
// GET BANNER
// =====================
app.get("/banner", (_, res) => {
  try {
    const banner = JSON.parse(fs.readFileSync(BANNER_DB, "utf8"));
    res.json(banner);
  } catch {
    res.json({ image: "", active: false });
  }
});

// =====================
// UPDATE BANNER (ADMIN)
// =====================
app.post("/admin/banner", (req, res) => {
  const { image, active } = req.body;

  const newBanner = {
    image: image || "",
    active: !!active
  };

  fs.writeFileSync(BANNER_DB, JSON.stringify(newBanner, null, 2));
  res.json(newBanner);
});

app.listen(PORT, () => {
  console.log("🚀 Server running on port " + PORT);
});