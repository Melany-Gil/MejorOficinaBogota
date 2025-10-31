// ======== ENDPOINT (Apps Script /exec) ========
const ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbwbUdEVjdYDheIXe6j8CtL2aczgFAy8PE9FC1dET_Z7w0-twY0TQbomfD2pyJUcs4RFEQ/exec";

// ======== Utilidad JSONP (evita CORS) ========
function jsonp(url, params, cbName) {
  return new Promise((resolve, reject) => {
    const cb = cbName || `__cb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    params = { ...(params || {}), callback: cb };
    const qs = new URLSearchParams(params).toString();

    const script = document.createElement("script");
    script.src = `${url}?${qs}`;
    script.async = true;

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout"));
    }, 15000);

    function cleanup() {
      clearTimeout(timeout);
      try { delete window[cb]; } catch (_) { window[cb] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[cb] = (data) => { cleanup(); resolve(data); };
    script.onerror = () => { cleanup(); reject(new Error("JSONP error")); };
    document.body.appendChild(script);
  });
}

// ======== Estado inicial (bloqueo por localStorage) ========
document.addEventListener("DOMContentLoaded", () => {
  const domainKey = window.location.hostname + "_votoDecoraciones2025";
  if (localStorage.getItem(domainKey) === "true") {
    const msg = document.getElementById("msg");
    const submitBtn = document.getElementById("submitBtn");
    msg.textContent = "🎥 Ya registraste tu voto. ¡Gracias por participar!";
    msg.className = "msg ok";
    msg.style.display = "block";
    submitBtn.disabled = true;
    submitBtn.style.opacity = "0.5";
    submitBtn.style.cursor = "not-allowed";
  }
});

// ======== Validaciones y UI ========
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedDomainRegex = /@(genteutil\.net|genteutilsa\.com)$/i;

const grid = document.getElementById("grid");
const form = document.getElementById("voteForm");
const submitBtn = document.getElementById("submitBtn");
const msg = document.getElementById("msg");

// Construcción de tarjetas (solo título)
function renderGrid() {
  const frag = document.createDocumentFragment();

  CANDIDATES.forEach(c => {
    const card = document.createElement("label");
    card.className = "card";
    card.setAttribute("aria-label", c.name);

    const radioWrap = document.createElement("div");
    radioWrap.className = "radio-wrap";

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "choice";
    radio.value = c.id;
    radio.className = "radio";
    radio.setAttribute("aria-checked", "false");
    radioWrap.appendChild(radio);

    // Figura (bloque con título centrado)
    const figure = document.createElement("figure");
    figure.classList.add("title-figure");
    figure.innerHTML = `<div class="title-box">${c.name}</div>`;

    // “Voto en blanco”
    if (c.blank) {
      figure.classList.add("blank");
      figure.textContent = "Voto en blanco";
    }

    // Banda lateral (nombre)
    const badge = document.createElement("div");
    badge.className = "badge-name";
    badge.textContent = c.name;

    // Ensamble
    card.appendChild(radioWrap);
    card.appendChild(figure);
    card.appendChild(badge);

    // Selección visual
    card.addEventListener("click", () => {
      document.querySelectorAll(".card").forEach(el => el.classList.remove("selected"));
      card.classList.add("selected");
      document.querySelectorAll('input[name="choice"]').forEach(r =>
        r.setAttribute("aria-checked", r.checked ? "true" : "false")
      );
    });

    frag.appendChild(card);
  });

  grid.appendChild(frag);
}

function showMessage(text, ok = true) {
  msg.textContent = text;
  msg.className = "msg " + (ok ? "ok" : "err");
  msg.style.display = "block";
}

// Envío con JSONP
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.style.display = "none";

  const email = (document.getElementById("email").value || "").trim().toLowerCase();
  const choiceInput = document.querySelector('input[name="choice"]:checked');
  const choice = choiceInput ? choiceInput.value : "";

  if (!email || !emailRegex.test(email) || !choice) {
    showMessage("Datos inválidos. Verifica el correo y selecciona una opción.", false);
    return;
  }
  if (!allowedDomainRegex.test(email)) {
    showMessage("Solo se aceptan correos @genteutil.net o @genteutilsa.com.", false);
    return;
  }

  submitBtn.disabled = true;
  const originalLabel = submitBtn.textContent;
  submitBtn.textContent = "Enviando...";

  try {
    const data = await jsonp(ENDPOINT_URL, { email, choice });

    if (data && data.status === "ok") {
      const domainKey = window.location.hostname + "_votoDecoraciones2025";
      localStorage.setItem(domainKey, "true");
      showMessage("✅ ¡Tu voto ha sido registrado con éxito! Gracias por participar.", true);

      // Bloquea solo el botón; las tarjetas siguen visibles
      submitBtn.disabled = true;
      submitBtn.style.opacity = "0.5";
      submitBtn.style.cursor = "not-allowed";
      return;
    }

    if (data && data.error === "DUPLICATE_EMAIL") {
      showMessage("Este correo ya registró un voto. Solo se permite uno por correo.", false);
    } else if (data && data.error === "INVALID_DOMAIN") {
      showMessage("Solo se aceptan correos @genteutil.net o @genteutilsa.com.", false);
    } else if (data && data.error === "INVALID_INPUT") {
      showMessage("Datos inválidos. Revisa el correo y la opción.", false);
    } else {
      showMessage("No se pudo registrar el voto. Intenta de nuevo más tarde.", false);
    }
  } catch (err) {
    console.error("JSONP error:", err);
    showMessage("Error de red. Intenta nuevamente.", false);
  } finally {
    if (!submitBtn.disabled) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel || "Enviar voto";
    }
  }
});

renderGrid();
