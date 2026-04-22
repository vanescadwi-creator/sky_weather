document.addEventListener("DOMContentLoaded", () => {
  const cityStatsInput = document.getElementById("cityInput");
  const loadBtn = null;

  const tempCtx = document.getElementById("tempChart")?.getContext("2d");
  const humCtx = document.getElementById("humChart")?.getContext("2d");
  const rainCtx = document.getElementById("rainChart")?.getContext("2d");

  let tempChart, humChart, rainChart;

  async function loadStats(city){
    if(!city) return;

    // FIX #1 → gunakan fungsi yang BENAR
    const f = await fetchForecastByCity(city);
    if(!f) { alert("Gagal memuat forecast."); return; }

    const daily = f.list
      .filter(i => i.dt_txt.includes("12:00:00"))
      .slice(0,7);

    if(daily.length === 0) {
      alert("Data prakiraan tidak tersedia.");
      return;
    }

    const labels = daily.map(d =>
      new Date(d.dt_txt).toLocaleDateString('id-ID',{weekday:'short'})
    );

    const temps = daily.map(d => Math.round(d.main.temp));
    const hums = daily.map(d => d.main.humidity);
    const rains = daily.map(d =>
      (d.rain && d.rain["3h"]) ? d.rain["3h"] : 0
    );

    // kondisi umum
    const conds = daily.map(d => d.weather[0].main);
    const mostCommon =
      conds.sort((a,b) =>
        conds.filter(v=>v===a).length - conds.filter(v=>v===b).length
      ).pop();

    const conditionBox = document.getElementById("conditionStats");
    if(conditionBox) conditionBox.textContent =
      `Kondisi Umum Minggu Ini: ${mostCommon}`;

    // destroy existing chart
    tempChart?.destroy();
    humChart?.destroy();
    rainChart?.destroy();

    // Buat grafik
    tempChart = new Chart(tempCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label:'Suhu (°C)',
          data:temps,
          borderColor:'#60a5fa',
          backgroundColor:'rgba(96,165,250,0.2)',
          tension:0.3
        }]
      },
      options:{ responsive:true, plugins:{legend:{display:false}} }
    });

    humChart = new Chart(humCtx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label:'Kelembapan (%)',
          data:hums,
          borderColor:'#facc15',
          backgroundColor:'rgba(250,204,21,0.2)',
          tension:0.3
        }]
      },
      options:{ responsive:true, plugins:{legend:{display:false}} }
    });

    rainChart = new Chart(rainCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label:'Curah Hujan (mm)',
          data:rains,
          backgroundColor:'#60a5fa'
        }]
      },
      options:{ responsive:true, plugins:{legend:{display:false}} }
    });

    // save city
    localStorage.setItem("selectedCity", city);
  }

  cityStatsInput.addEventListener("keypress", (e) => {
    if(e.key === "Enter") {
      const city = cityStatsInput.value.trim();
      if(city) loadStats(city);
    }
  });

  // auto load
  const last = localStorage.getItem("selectedCity");
  if(last) {
    cityStatsInput.value = last;
    loadStats(last);
  }
});
