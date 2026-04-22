// peta.js
document.addEventListener("DOMContentLoaded", async () => {
  // batas global (tidak oversize, tetap dalam kotak peta)
  const southWest = L.latLng(-90, -180);
  const northEast = L.latLng(90, 180);
  const bounds = L.latLngBounds(southWest, northEast);

  // inisialisasi map
  const map = L.map("map", {
    maxBounds: bounds,
    maxBoundsViscosity: 0.8,
    minZoom: 2,
    maxZoom: 12
  }).setView([0, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // fetch daftar kota
  const cities = await fetch("cities.json").then(res => res.json());

  const apiKey = "67747cc945ba37b5ab1c9ecf212e0db5";

  // legend
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function() {
    const div = L.DomUtil.create("div", "map-legend");
    div.innerHTML = `
      <div><span class="legend-box" style="background:#facc15"></span> Cerah</div>
      <div><span class="legend-box" style="background:#6b7280"></span> Berawan</div>
      <div><span class="legend-box" style="background:#3b82f6"></span> Hujan</div>
    `;
    return div;
  };
  legend.addTo(map);

  // tampilkan marker cuaca
  for (let i = 0; i < cities.length && i < 1000; i++) {
    const c = cities[i];
    try {
      const weather = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${c.name}&appid=${apiKey}&units=metric`)
        .then(res => res.json());

      if(weather.cod !== 200) continue;

      const cond = (weather.weather[0].main || "").toLowerCase();
      const color = cond.includes("rain") ? "#3b82f6" : cond.includes("cloud") ? "#6b7280" : "#facc15";

      L.circle([c.coord.lat, c.coord.lon], {
        color,
        fillColor: color,
        fillOpacity: 0.5,
        radius: 30000
      })
      .bindPopup(`<b>${c.name}</b><br>${weather.weather[0].main} - ${Math.round(weather.main.temp)}°C`)
      .addTo(map);
    } catch(e) { console.log(c.name, e) }
  }
});
