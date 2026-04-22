/* ============================
   SAVE CITY
============================ */
function saveFavorite(city) {
  let favs = JSON.parse(localStorage.getItem("favorites") || "[]");

  if (!favs.includes(city)) {
    favs.push(city);
    localStorage.setItem("favorites", JSON.stringify(favs));
  }
}

/* ============================
   CREATE CARD ELEMENT
============================ */
function createSavedCard(city) {
  const div = document.createElement("div");
  div.className = "saved-card";

  div.innerHTML = `
    <div class="saved-left">${city}</div>
    <div class="saved-right">
      <button class="load-city" data-city="${city}">Load</button>
      <button class="remove-city" data-city="${city}">Remove</button>
    </div>
  `;

  return div;
}

/* ============================
   LOAD FAVORITES TO PAGE
============================ */
function loadFavorites() {
  const list = document.getElementById("savedList");
  if (!list) return;

  const favs = JSON.parse(localStorage.getItem("favorites") || "[]");

  if (favs.length === 0) {
    list.innerHTML = `<p class="muted">Belum ada kota yang disimpan.</p>`;
    return;
  }

  list.innerHTML = "";

  favs.forEach(city => {
    const card = createSavedCard(city);
    list.appendChild(card);
  });

  // ---- BUTTON LOAD ----
  document.querySelectorAll(".load-city").forEach(btn => {
    btn.addEventListener("click", () => {
      const c = btn.dataset.city;
      localStorage.setItem("lastSearchedCity", c);
      window.location.href = "dashboard.html";
    });
  });

  // ---- BUTTON REMOVE ----
  document.querySelectorAll(".remove-city").forEach(btn => {
    btn.addEventListener("click", () => {
      const c = btn.dataset.city;
      removeFavorite(c);
    });
  });
}

/* ============================
   REMOVE CITY
============================ */
function removeFavorite(city) {
  let favs = JSON.parse(localStorage.getItem("favorites") || "[]");
  favs = favs.filter(item => item !== city);

  localStorage.setItem("favorites", JSON.stringify(favs));
  loadFavorites();
}

/* ============================
   ON PAGE LOAD
============================ */
document.addEventListener("DOMContentLoaded", loadFavorites);

window.saveFavorite = saveFavorite;
window.loadFavorites = loadFavorites;
