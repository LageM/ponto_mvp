const timeNow = document.getElementById("timeNow");
const dateNow = document.getElementById("dateNow");
const locStatus = document.getElementById("locStatus");
const btnPunch = document.getElementById("btnPunch");
const nextType = document.getElementById("nextType");
const historyList = document.getElementById("historyList");
const hint = document.getElementById("hint");
const netBadge = document.getElementById("netBadge");

const TYPES = ["ENTRADA", "INTERVALO", "RETORNO", "SAÍDA"];

function pad(n) { return String(n).padStart(2, "0"); }

function nowBR() {
  const d = new Date();
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  const dd = pad(d.getDate());
  const mo = pad(d.getMonth() + 1);
  const yy = d.getFullYear();
  return { d, time: `${hh}:${mm}:${ss}`, date: `${dd}/${mo}/${yy}` };
}

function setOnlineBadge() {
  const online = navigator.onLine;
  netBadge.textContent = online ? "Online" : "Offline";
  netBadge.style.background = online ? "#e8f7ee" : "#fff3cd";
  netBadge.style.color = online ? "#157347" : "#8a6d3b";
  netBadge.style.borderColor = online ? "#c7eed7" : "#ffeeba";
}

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

function render(state) {
  nextType.textContent = TYPES[state.nextIndex];
  historyList.innerHTML = "";

  if (state.history.length === 0) {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `<div><strong>Sem marcações</strong><br><small>Toque em “BATER PONTO” para simular.</small></div>`;
    historyList.appendChild(li);
    return;
  }

  state.history.slice(-5).reverse().forEach(h => {
    const li = document.createElement("li");
    li.className = "item";
    li.innerHTML = `<div><strong>${h.tipo}</strong><br><small>${h.local}</small></div><div><strong>${h.hora}</strong></div>`;
    historyList.appendChild(li);
  });
}

function fakeLocation() {
  // Fase 1: simulando "local OK"
  // Depois a gente troca para navigator.geolocation.getCurrentPosition(...)
  locStatus.textContent = "📍 Localização: confirmada (mock)";
}

function tick() {
  const { time, date } = nowBR();
  timeNow.textContent = time;
  dateNow.textContent = date;
}

let state = resetIfNewDay(loadState());
saveState(state);
render(state);
tick();
setOnlineBadge();
fakeLocation();

setInterval(tick, 500);
window.addEventListener("online", setOnlineBadge);
window.addEventListener("offline", setOnlineBadge);

btnPunch.addEventListener("click", () => {
  if (!navigator.onLine) {
    hint.textContent = "Sem internet (simulado): tente novamente quando estiver online.";
    return;
  }

  hint.textContent = "Registrando…";
  btnPunch.disabled = true;

  setTimeout(() => {
    const { time } = nowBR();
    const tipo = TYPES[state.nextIndex];
    const local = "UBS Cajazeiras";

    state.history.push({ tipo, hora: time, local });
    state.nextIndex = (state.nextIndex + 1) % TYPES.length;

    saveState(state);
    render(state);

    hint.textContent = `✅ ${tipo} registrada às ${time} (mock)`;
    btnPunch.disabled = false;
  }, 600);
});
