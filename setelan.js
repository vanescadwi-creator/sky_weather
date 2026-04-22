document.addEventListener("DOMContentLoaded", () => {
  // ===== Elements =====
  const themeSelect = document.getElementById("themeSelect");
  const animToggle = document.getElementById("animToggle");
  const unitSelect = document.getElementById("unitSelect");
  const langSelect = document.getElementById("langSelect");
  const notifToggle = document.getElementById("notifToggle");
  const cardStyle = document.getElementById("cardStyle");
  const resetSaved = document.getElementById("resetSaved");

  // ===== THEME =====
  function applyTheme(mode){
    document.body.classList.remove("theme-dark","theme-light");
    if(mode === "dark") document.body.classList.add("theme-dark");
    else if(mode === "light") document.body.classList.add("theme-light");
  }

  function autoTheme(){
    const hour = new Date().getHours();
    applyTheme((hour >= 18 || hour < 6) ? "dark" : "light");
  }

  const savedTheme = localStorage.getItem("siteTheme") || "auto";
  if(savedTheme === "auto") autoTheme();
  else applyTheme(savedTheme);

  if(themeSelect){
    themeSelect.value = savedTheme;
    themeSelect.addEventListener("change", e => {
      const v = e.target.value;
      localStorage.setItem("siteTheme", v);
      if(v === "auto") autoTheme();
      else applyTheme(v);
    });
  }

  // ===== NOTIFICATIONS =====
  const notifSaved = localStorage.getItem("notifEnabled");
  if(notifToggle){
    notifToggle.checked = notifSaved === null ? false : (notifSaved === "true");
    notifToggle.addEventListener("change", e => {
      localStorage.setItem("notifEnabled", e.target.checked);
    });
  }

  // ===== RESET SAVED LOCATIONS =====
  if(resetSaved){
    resetSaved.addEventListener("click", () => {
      if(confirm("Yakin ingin menghapus semua saved locations?")){
        localStorage.removeItem("favorites");
        alert("Saved locations berhasil dihapus!");
        window.dispatchEvent(new Event('savedChanged')); // beri signal ke saved page
      }
    });
  }
});
