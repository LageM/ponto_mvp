const timeNow = document.getElementById("timeNow");
const dateNow = document.getElementById("dateNow");
const locStatus = document.getElementById("locStatus");
const btnPunch = document.getElementById("btnPunch");
const nextType = document.getElementById("nextType");
const historyList = document.getElementById("historyList");
const hint = document.getElementById("hint");
const netBadge = document.getElementById("netBadge");

const TYPES = ["ENTRADA", "INTERVALO", "RETORNO", "SAÍDA"];

let currentLocation = null;

/* ===================== UTIL ===================== */
function pad(n) {
  return String(n).padStart(2, "0");
}

function nowBR() {
  const d = new Date();
  return {
    d,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`,
    date: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  };
}

/* ===================== ONLINE ===================== */
function setOnlineBadge() {
  const online = navigator.onLine;
  netBadge.textContent = online ? "Online" : "Offline";
  netBadge.style.background = online ? "#e8f7ee" : "#fff3cd";
  netBadge.style.color = online ? "#157347" : "#8a6d3b";
  netBadge.style.borderColor = online ? "#c7eed7" : "#ffeeba";
}

/* ===================== GEOLOCALIZAÇÃO + ENDEREÇO ===================== */
function getLocation() {
  if (!("geolocation" in navigator)) {
    locStatus.textContent = "📍 Localização indisponível";
    return;
  }

  locStatus.textContent = "📍 Obtendo localização…";

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const acc = Math.round(position.coords.accuracy);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();

        const address = data.display_name || "Endereço não identificado";

        currentLocation = {
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
          acc,
          address
        };

        locStatus.textContent = `📍 ${address}`;
      } catch {
        currentLocation = {
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
          acc,
          address: "Endereço não identificado"
        };

        locStatus.textContent = `📍 Localização ativa (±${acc}m)`;
      }
    },
    () => {
      locStatus.textContent = "📍 Localização não autorizada";
      currentLocation = null;
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/* ===================== WEBHOOK ===================== */
function sendToWebhook(payload) {
  fetch("https://lagem.app.n8n.cloud/webhook/ponto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  }).catch(err => {
    console.error("Erro ao enviar para webhook:", err);
  });
}

/* ===================== STATE ===================== */
function loadState() {
  const saved = JSON.parse(localStorage.getItem("ponto_mvp_state") || "{}");
  return {
    nextIndex: Number.isInteger(saved.nextIndex) ? saved.nextIndex : 0,
    history: Array.isArray(saved.history) ? saved.history : [],
    lastDate: saved.lastDate || ""
  };
}

function saveState(state) {
  localStorage.setItem("ponto_mvp_state", JSON.stringify(state));
}

function resetIfNewDay(state) {
  const { date } = nowBR();
  if (state.lastDate && state.lastDate !== date) {
    state.history = [];
    state.nextIndex = 0;
  }
  state.lastDate = date;
  return state;
}

/* ===================== RENDER ===================== */
function render(state) {
  nextType.textContent = TYPES[state.nextIndex];
  historyList.innerHTML = "";

  if (state.history.length === 0) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <strong>Sem marcações</strong><br>
        <small>Toque em “BATER PONTO”.</small>
      </div>`;
    historyList.appendChild(li);
    return;
  }

  state.history.slice(-5).reverse().forEach(h => {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `
      <div>
        <strong>${h.tipo}</strong><br>
        <small>${h.local}</small>
      </div>
      <div>
        <strong>${h.hora}</strong>
      </div>`;
    historyList.appendChild(li);
  });
}

/* ===================== CLOCK ===================== */
function tick() {
  const { time, date } = nowBR();
  timeNow.textContent = time;
  dateNow.textContent = date;
}

/* ===================== INIT ===================== */
let state = resetIfNewDay(loadState());
saveState(state);
render(state);
tick();
setOnlineBadge();
getLocation();

setInterval(tick, 500);
window.addEventListener("online", setOnlineBadge);
window.addEventListener("offline", setOnlineBadge);

/* ===================== ACTION ===================== */
btnPunch.addEventListener("click", () => {
  if (!navigator.onLine) {
    hint.textContent = "⚠️ Sem internet. Tente novamente.";
    return;
  }

  if (!currentLocation) {
    hint.textContent = "⚠️ Ative a localização para registrar o ponto.";
    return;
  }

  hint.textContent = "Registrando…";
  btnPunch.disabled = true;

  setTimeout(() => {
    const { time, date } = nowBR();
    const tipo = TYPES[state.nextIndex];
    const local = currentLocation.address;

    // Salva no histórico local
    state.history.push({ tipo, hora: time, local });
    state.nextIndex = (state.nextIndex + 1) % TYPES.length;
    saveState(state);
    render(state);

    // ENVIO PARA O WEBHOOK
    sendToWebhook({
      data: date,
      hora: time,
      colaborador: "João", // depois vira dinâmico
      tipo,
      endereco: currentLocation.address,
      latitude: currentLocation.lat,
      longitude: currentLocation.lng,
      precisao: currentLocation.acc,
      origem: "Facilita+"
    });

    hint.textContent = `✅ ${tipo} registrada às ${time}`;
    btnPunch.disabled = false;
  }, 600);
});
