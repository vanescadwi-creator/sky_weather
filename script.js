/* ===== CONFIG ===== */
const apiKey = "67747cc945ba37b5ab1c9ecf212e0db5"; // kamu sudah berikan
const cityInput = document.getElementById("cityInput");
const cityNameEl = document.getElementById("cityName");
const currentCondEl = document.getElementById("currentCond");
const tempEl = document.getElementById("temp");
const humidEl = document.getElementById("humid");
const windEl = document.getElementById("wind");
const sunriseEl = document.getElementById("sunrise");
const sunsetEl = document.getElementById("sunset");
const weeklyForecastEl = document.getElementById("weeklyForecast");
const hourlyDetails = document.getElementById("hourlyDetails");
const hourlyList = document.getElementById("hourlyList");
const hourlyTitle = document.getElementById("hourlyTitle");
const monthlyChartEl = document.getElementById("monthlyChart");
const themeSelect = document.getElementById("themeSelect");

let lastForecastData = null;
let notificationPermission = false;
let monthlyChart = null;

/* ==== THEME HANDLING ==== */
const savedTheme = localStorage.getItem('siteTheme') || 'auto';
function applyTheme(mode){
  document.body.classList.remove('theme-dark','theme-light');
  if(mode === 'dark') document.body.classList.add('theme-dark');
  else if(mode === 'light') document.body.classList.add('theme-light');
}
function autoTheme(){ const h = new Date().getHours(); applyTheme((h>=18||h<6)?'dark':'light'); }

if(savedTheme === 'auto') autoTheme(); else applyTheme(savedTheme);
if(themeSelect){ themeSelect.value = savedTheme; themeSelect.addEventListener('change', (e)=>{ const v=e.target.value; localStorage.setItem('siteTheme', v); if(v==='auto') autoTheme(); else applyTheme(v); }); }

/* ==== NAV ACTIVE SETUP (mark active by pathname) ==== */
document.querySelectorAll('.nav-item').forEach(a=>{
  try{
    const href = a.getAttribute('href');
    const page = href.split('/').pop();
    const current = location.pathname.split('/').pop() || 'index.html';
    if(page === current) a.classList.add('nav-item--active');
    else a.classList.remove('nav-item--active');
  }catch(e){}
});

/* ==== Notifications permission (for actionable) ==== */
if('Notification' in window) {
  Notification.requestPermission().then(p=>{
    notificationPermission = p === 'granted';
  });
}

/* ==== Helper: safe fetch ===== */
async function safeFetch(url){
  try{
    const res = await fetch(url);
    if(!res.ok) return null;
    return await res.json();
  }catch(e){
    console.error("fetch error", e);
    return null;
  }
}

/* ==== Geocoding -> forecast fetch (unified) ==== */
async function fetchForecastByCity(city){
  // geocode
  const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`;
  const places = await safeFetch(geoUrl);
  if(!places || !places.length) return null;
  const {lat, lon, name, country} = places[0];

  // forecast 5-day/3h
  const fcUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  const forecast = await safeFetch(fcUrl);
  if(!forecast || !forecast.list) return null;
  forecast.place = {name, country, lat, lon};
  return forecast;
}

/* ==== Current weather by coord ==== */
async function fetchCurrentByCoord(lat, lon){
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
  return await safeFetch(url);
}

/* ==== MAIN: updateTodayWeather(city) ==== */
async function updateTodayWeather(city){
  if(!city || city.trim().length < 2) { alert("Masukkan nama kota yang valid (minimal 2 huruf)."); return; }

  // fetch forecast (includes lat/lon)
  const forecast = await fetchForecastByCity(city);
  if(!forecast){ alert("Kota tidak ditemukan atau data tidak tersedia."); return; }
  lastForecastData = forecast; // cache

  // get current
  const {lat,lon,name,country} = forecast.place;
  const now = await fetchCurrentByCoord(lat, lon);
  if(!now){ alert("Gagal ambil data current."); return; }

  // update UI
  cityNameEl.textContent = `${name}, ${country || ''}`;
  tempEl.textContent = Math.round(now.main.temp) + "°C";
  currentCondEl.textContent = capitalize(now.weather[0].description || now.weather[0].main);
  humidEl.textContent = now.main.humidity + "%";
  windEl.textContent = now.wind.speed + " m/s";
  sunriseEl.textContent = new Date(now.sys.sunrise*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  sunsetEl.textContent = new Date(now.sys.sunset*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

  // background & animations
  applyWeatherBackground(now.weather[0].main);

  // actionable notifications
  sendActionableNotifications(now);

  // render weekly cards & hooks
  renderWeeklyForecast(forecast);

  // update monthly chart
  updateMonthlyChartIfNeeded(forecast);

  // save to history (simple)
  saveHistory(name);
}

/* ==== Render 7-day horizontal cards (use forecast.list mid-day points) ==== */
function renderWeeklyForecast(forecast){
  weeklyForecastEl.innerHTML = "";

  const daily = forecast.list
    .filter(i => i.dt_txt.includes("12:00:00"))
    .slice(0, 7);

  daily.forEach(d => {
    const dateStr = d.dt_txt.split(" ")[0];
    const day = new Date(d.dt_txt).toLocaleDateString("id-ID", { weekday: "short" });
    const temp = Math.round(d.main.temp);
    const cond = d.weather[0].main;
    const icon = d.weather[0].icon;

    // --- CARD ---
    const card = document.createElement("div");
    card.className = "forecast-day";
    card.dataset.date = dateStr;

    card.innerHTML = `
      <div style="font-weight:600">${day}</div>
      <img src="https://openweathermap.org/img/wn/${icon}@2x.png" style="width:48px">
      <div style="font-weight:700">${temp}°C</div>
      <div class="mini">${cond}</div>

      <div class="hourly-container"></div>
    `;

    card.addEventListener("click", () => toggleHourlyInsideCard(card, dateStr));
    weeklyForecastEl.appendChild(card);
  });
}
function toggleHourlyInsideCard(card, dateStr){
  const container = card.querySelector(".hourly-container");

  // Kalau sudah terbuka → tutup
  if(card.classList.contains("open")){
    card.classList.remove("open");
    container.style.maxHeight = "0px";
    container.innerHTML = "";
    return;
  }

  // Tutup card lain
  document.querySelectorAll(".forecast-day.open").forEach(c => {
    c.classList.remove("open");
    c.querySelector(".hourly-container").style.maxHeight = "0px";
    c.querySelector(".hourly-container").innerHTML = "";
  });

  // Build hourly list
  const hourly = lastForecastData.list.filter(i => i.dt_txt.startsWith(dateStr));
  container.innerHTML = "";

  hourly.forEach(h => {
    const time = new Date(h.dt * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const row = document.createElement("div");
    row.className = "hourly-row";
    row.innerHTML = `
      <span>${time}</span>
      <span>${Math.round(h.main.temp)}°C</span>
      <span>${h.weather[0].main}</span>
      <span>${h.wind.speed} m/s</span>
    `;
    container.appendChild(row);
  });

  // Expand
  card.classList.add("open");
  container.style.maxHeight = container.scrollHeight + "px";
}


/* ==== Monthly chart helper (safe create/destroy) ==== */
function updateMonthlyChartIfNeeded(forecast){
  if(!monthlyChartEl) return;
  if(!forecast || !forecast.list) return;

  // try midday samples
  let daily = forecast.list.filter(i => i.dt_txt.includes("12:00:00")).slice(0,7);
  if(daily.length === 0){
    const mapDates = new Map();
    for(const item of forecast.list){ const d = item.dt_txt.split(' ')[0]; if(!mapDates.has(d)) mapDates.set(d, item); if(mapDates.size>=7) break; }
    daily = Array.from(mapDates.values()).slice(0,7);
  }

  const labels = daily.map(d => new Date(d.dt_txt).toLocaleDateString('id-ID',{weekday:'short'}));
  const temps = daily.map(d => Math.round(d.main.temp));

  if(monthlyChart && typeof monthlyChart.destroy === 'function') monthlyChart.destroy();

  monthlyChart = new Chart(monthlyChartEl.getContext('2d'), {
    type: 'line',
    data: { labels, datasets: [{ label:'Temp (°C)', data: temps, borderColor:'#4fd1c5', backgroundColor:'rgba(79,209,197,0.12)', tension:0.25, fill:true }] },
    options: { responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:false}} }
  });
}

/* ==== Background based on condition + time of day ==== */
function applyWeatherBackground(mainCondition){
  const c = (mainCondition||'Clear').toLowerCase();
  let cls = 'bg-clear';
  if(c.includes('rain')||c.includes('drizzle')||c.includes('thunder')) cls = 'bg-rain';
  else if(c.includes('cloud')||c.includes('overcast')||c.includes('mist')) cls = 'bg-clouds';
  // time of day
  const hour = new Date().getHours();
  let tod = 'afternoon';
  if(hour >=5 && hour < 12) tod='morning';
  else if(hour >=12 && hour < 18) tod='afternoon';
  else tod='night';

  // remove old bg classes then add
  document.body.classList.remove('bg-clear','bg-clouds','bg-rain','morning','afternoon','night');
  document.body.classList.add(cls, tod);
}

/* ==== Actionable notifications (simple logic) ==== */
function sendActionableNotifications(now){
  if(!notificationPermission) requestNotificationPermission();
  if(!notificationPermission) return;

  // rain -> "Bawa payung"
  const main = now.weather[0].main.toLowerCase();
  if(main.includes('rain') || main.includes('drizzle') || main.includes('thunder')){
    showNotification(`Hujan di ${now.name}`, { body: 'Bawa payung atau jas hujan.', tag:'rain-alert' });
  }

  // heat -> temp threshold
  if(now.main.temp >= 34){
    showNotification(`Suhu panas ${Math.round(now.main.temp)}°C`, { body: 'Pertimbangkan minum lebih, hindari terik siang.', tag:'heat-alert' });
  }

  // strong wind
  if(now.wind && now.wind.speed >= 12){
    showNotification(`Angin kencang ${now.wind.speed} m/s`, { body: 'Waspada saat berkendara atau aktivitas luar.', tag:'wind-alert' });
  }
}
// ==== Load last searched city on page load ====
document.addEventListener("DOMContentLoaded", () => {
  const lastCity = localStorage.getItem("lastSearchedCity");
  if(lastCity){
    cityInput.value = lastCity;
    updateTodayWeather(lastCity);
  }
});

// ==== Update updateTodayWeather supaya simpan ke localStorage ====
async function updateTodayWeather(city){
  if(!city || city.trim().length < 2) { alert("Masukkan nama kota yang valid."); return; }

  // simpan ke localStorage agar tetap muncul di reload/halaman lain
  localStorage.setItem("lastSearchedCity", city);

  const forecast = await fetchForecastByCity(city);
  if(!forecast){ alert("Kota tidak ditemukan atau data tidak tersedia."); return; }
  lastForecastData = forecast;

  const {lat, lon, name, country} = forecast.place;
  const now = await fetchCurrentByCoord(lat, lon);
  if(!now){ alert("Gagal ambil data current."); return; }

  cityNameEl.textContent = `${name}, ${country || ''}`;
  tempEl.textContent = Math.round(now.main.temp) + "°C";
  currentCondEl.textContent = capitalize(now.weather[0].description || now.weather[0].main);
  humidEl.textContent = now.main.humidity + "%";
  windEl.textContent = now.wind.speed + " m/s";
  sunriseEl.textContent = new Date(now.sys.sunrise*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  sunsetEl.textContent = new Date(now.sys.sunset*1000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

  applyWeatherBackground(now.weather[0].main);
  sendActionableNotifications(now);
  renderWeeklyForecast(forecast);
  updateMonthlyChartIfNeeded(forecast);
  saveHistory(name);
}

function requestNotificationPermission(){
  if('Notification' in window){
    Notification.requestPermission().then(p => { notificationPermission = (p === 'granted'); });
  }
}
function showNotification(title, options){
  if(notificationPermission && 'Notification' in window){
    try{
      new Notification(title, options);
    }catch(e){ console.warn("notif failed", e); }
  }
}

/* ==== Utility ==== */
function capitalize(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

// === SAVE CITY BENAR (favorites) ===
function saveCity(cityName){
  if(!cityName) return;
  const key = 'favorites';
  const arr = JSON.parse(localStorage.getItem(key) || '[]');

  if(!arr.includes(cityName)) arr.unshift(cityName);
  localStorage.setItem(key, JSON.stringify(arr.slice(0, 20)));

  alert(`${cityName} berhasil disimpan!`);

  // cek apakah loadFavorites ada → jika ada, panggil
  if(typeof window.loadFavorites === 'function') window.loadFavorites();
}

/* ==== Search/Enter key handler ==== */
cityInput.addEventListener('keypress', (e)=>{
  if(e.key === 'Enter'){
    updateTodayWeather(cityInput.value.trim());
    cityInput.blur();
  }
});

// Ambil elemen tombol
const toStatsBtn = document.getElementById('toStats');
const saveCityBtn = document.getElementById('saveCity');

// Tombol SAVE
saveCityBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if(city) saveCity(city);
  else alert("Masukkan nama kota terlebih dahulu!");
});


// Tombol VIEW STATISTICS
toStatsBtn.addEventListener('click', () => {
  const city = cityInput.value.trim();
  if(!city){
    alert("Masukkan nama kota terlebih dahulu!");
    return;
  }

  // Pindah ke halaman statistik
  window.location.href = 'statistik.html';
});

