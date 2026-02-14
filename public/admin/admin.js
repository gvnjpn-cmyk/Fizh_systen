
/* =====================
   CONFIG
===================== */
const REFRESH_INTERVAL = 5000;
const DEFAULT_THUMBNAIL =
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d";

/* =====================
   LOGIN
===================== */
async function login() {
  const name = document.getElementById("name").value;
  const password = document.getElementById("password").value;
  const msg = document.getElementById("msg");
  const btn = document.getElementById("loginBtn");

  msg.textContent = "";

  if (!name || !password) {
    msg.textContent = "Harap isi nama dan password!";
    return;
  }

  btn.disabled = true;
  btn.innerHTML = "⏳ Memproses...";

  try {
    const res = await fetch("/admin/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, password })
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem("adminLoggedIn", "true");
      window.location.href = "/admin/dashboard";
    } else {
      msg.textContent = data.error || "Login gagal";
      btn.disabled = false;
      btn.innerHTML = "Login";
    }

  } catch {
    msg.textContent = "Server error";
    btn.disabled = false;
    btn.innerHTML = "Login";
  }
}

/* =====================
   LOAD USERS
===================== */
async function loadUsers() {
  try {
    const res = await fetch("/admin/users");
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return [];
  }
}

/* =====================
   DASHBOARD RENDER (ONCE)
===================== */
async function renderDashboard() {
  const dashboard = document.getElementById("dashboard");
  if (!dashboard) return;

  dashboard.innerHTML = "<h2>Loading...</h2>";

  let users = [];
  let winner = null;
  let closed = false;

  try {
    users = await loadUsers();
  } catch {}

  try {
    const winnerRes = await fetch("/winner");
    const winnerData = await winnerRes.json();
    winner = winnerData.winner;
  } catch {}

  try {
    const statusRes = await fetch("/status");
    const status = await statusRes.json();
    closed = status.registrationClosed;
  } catch {}

  dashboard.innerHTML = `
  <div class="dashboard-content">

    <div class="dashboard-header">
      <h2>⚙️ Admin Dashboard</h2>
      <button class="logout-btn" onclick="logout()">Logout</button>
    </div>
     
     <div class="banner-section">
  <h3>📢 Atur Banner</h3>
  <input 
    type="text" 
    id="bannerLink" 
    placeholder="Masukkan link gambar banner..."
    value="${localStorage.getItem("userBanner") || ""}"
    style="width:100%;padding:8px;margin-top:8px"
  />
  <button onclick="saveBanner()" style="margin-top:10px">
    💾 Simpan Banner
  </button>

  ${
    localStorage.getItem("userBanner")
      ? `
        <div style="margin-top:15px">
          <img 
            src="${localStorage.getItem("userBanner")}" 
            style="max-width:100%;border-radius:8px"
          />
        </div>
      `
      : ""
  }
</div>
     
     
    <div class="stats-container">
      <div class="stat-box">
        <div class="icon">👥</div>
        <div class="number" id="totalUsers">${users.length}</div>
        <div class="label">Total Pendaftar</div>
      </div>
    </div>

    <div class="action-buttons">
      <button onclick="pickWinner()">🎉 Pilih Pemenang</button>
      <button onclick="resetSystem()">♻️ Reset Sistem</button>
      <button onclick="toggleRegistration()">
        ${closed ? "🔓 Buka Pendaftaran" : "🔒 Tutup Pendaftaran"}
      </button>
    </div>

    ${
      winner
        ? `
        <div class="winner-box">
          <h3>🏆 Pemenang</h3>
          <p><strong>Nama:</strong> ${winner.name}</p>
          <p><strong>Kode:</strong> ${winner.code}</p>
        </div>
      `
        : ""
    }

    <div class="users-section">
  <h3>📋 Daftar Peserta</h3>

  ${
    users.length === 0
      ? "<p>Belum ada peserta</p>"
      : `
        <div class="table-wrapper">
            <table class="users-table">
          <thead>
            <tr>
              <th>No</th>
              <th>Nama</th>
              <th>Kode</th>
            </tr>
          </thead>
          <tbody>
            ${users
              .map(
                (u, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td>${u.name}</td>
                    <td><span class="code-badge">${u.code}</span></td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
       </div>
        `
  }
</div>

  </div>
  `;
}

/* =====================
   AUTO REFRESH JUMLAH USER (TANPA RE-RENDER)
===================== */
setInterval(async () => {
  const totalEl = document.getElementById("totalUsers");
  if (!totalEl) return;

  const users = await loadUsers();
  totalEl.textContent = users.length;
}, REFRESH_INTERVAL);

setInterval(async () => {
  const winnerSection = document.querySelector(".winner-box");
  if (!winnerSection) return;

  try {
    const res = await fetch("/winner");
    const data = await res.json();

    if (data.winner && !winnerSection.innerHTML.includes(data.winner.code)) {
      renderDashboard();
    }
  } catch {}
}, REFRESH_INTERVAL);

/* =====================
   PICK WINNER (ANIMATED)
===================== */
async function pickWinner() {
  let winnerSection = document.querySelector(".winner-box");

if (!winnerSection) {
  const usersSection = document.querySelector(".users-section");
  if (!usersSection) return;

  winnerSection = document.createElement("div");
  winnerSection.className = "winner-box";
  usersSection.before(winnerSection);
}
  if (!winnerSection) return;

  // Ambil semua user dulu untuk animasi rolling
  const users = await loadUsers();
  if (!users || users.length === 0) {
    winnerSection.innerHTML = "<p>Belum ada peserta</p>";
    return;
  }

  // Tampilkan animasi awal
  winnerSection.innerHTML = `
  <div style="text-align:center;padding:30px 0">
    <h3 style="margin-bottom:15px">🎲 Mengundi Pemenang...</h3>
    <div 
      id="rollingName" 
      style="
        font-size:36px;
        font-weight:bold;
        letter-spacing:1px;
        animation: pulse 0.6s infinite;
      "
    >
      ...
    </div>
  </div>
`;

  let index = 0;

  let speed = 60;
let rolling;

function startRolling() {
  rolling = setInterval(() => {
    const nameEl = document.getElementById("rollingName");
    if (!nameEl) return;

    nameEl.textContent = users[index % users.length].name;
    index++;
  }, speed);
}

startRolling();

// efek melambat
setTimeout(() => {
  clearInterval(rolling);
  speed = 150;
  startRolling();
}, 1500);

setTimeout(() => {
  clearInterval(rolling);
}, 2500);

  // Setelah 3 detik baru ambil winner asli dari backend
  setTimeout(async () => {
    clearInterval(rolling);

    const res = await fetch("/admin/pick", { method: "POST" });
    const data = await res.json();

    if (data.error) {
      winnerSection.innerHTML = `<p>${data.error}</p>`;
      return;
    }

    winnerSection.innerHTML = `
      <h3>🏆 PEMENANG GIVEAWAY</h3>
      <div style="font-size:34px;font-weight:bold;margin:15px 0">
        ${data.name}
      </div>
      <span class="code-badge">${data.code}</span>
      <p style="margin-top:10px">🎉 Giveaway Selesai</p>
    `;

    if (typeof confetti === "function") {
      confetti({
        particleCount: 180,
        spread: 100,
        origin: { y: 0.6 }
      });
    }

  }, 3000);
}
/* =====================
   BANNER
===================== */
function saveBanner() {
  const linkInput = document.getElementById("bannerLink");
  if (!linkInput) return;

  const link = linkInput.value.trim();

  if (!link) {
    alert("Link kosong");
    return;
  }

  localStorage.setItem("userBanner", link);
  alert("Banner disimpan!");
  renderDashboard();
}

/* =====================
   REGISTRATION TOGGLE
===================== */
async function toggleRegistration() {
  await fetch("/admin/toggle-registration", { method: "POST" });
  renderDashboard();
}

/* =====================
   LOGOUT
===================== */
function logout() {
  localStorage.removeItem("adminLoggedIn");
  window.location.href = "/admin/login.html";
}

/*======================
         reset G.A
====================*/
async function resetSystem() {
  const confirmReset = confirm(
    "Yakin ingin mereset sistem?\nSemua data peserta & pemenang akan dihapus!"
  );

  if (!confirmReset) return;

  try {
    const res = await fetch("/admin/reset", {
      method: "POST"
    });

    const data = await res.json();

    if (data.success) {
      alert("✅ Sistem berhasil direset!");
      renderDashboard();
    } else {
      alert("Gagal reset sistem");
    }
  } catch {
    alert("Server error");
  }
}

/* =====================
   INIT
===================== */
document.addEventListener("DOMContentLoaded", () => {

  console.log("Path:", window.location.pathname);

  // Kalau di login page
  if (window.location.pathname.includes("login")) {
    return;
  }

  // Kalau belum login
  if (!localStorage.getItem("adminLoggedIn")) {
    window.location.href = "/admin";
    return;
  }

  // Render dashboard
  renderDashboard();

});