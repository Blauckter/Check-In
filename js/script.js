// ============================================
// CONFIGURACIÓN INICIAL
// ============================================
const TOTAL_ROOMS = 25; // Total de habitaciones del hotel

let checkins = [];
let sequeda = [];
let checkouts = [];
let editMode = null;
let editSection = null;
let occupancyChart = null;
let roomsChart = null;

const hoy = new Date().toISOString().slice(0, 10);

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  inicializarApp();
  cargarDatos();
  configurarEventos();
  actualizarFecha();
  verificarTema();
});

// ============================================
// FUNCIONES DE INICIALIZACIÓN
// ============================================
function inicializarApp() {
  showToast("👋 Bienvenido al Sistema de Gestión", "success");
}

function actualizarFecha() {
  document.getElementById("fecha-hoy").textContent = formatearFecha(hoy);
}

function verificarTema() {
  const tema = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", tema);
  actualizarIconoTema(tema);
}

// ============================================
// TEMA CLARO/OSCURO
// ============================================
document.getElementById("theme-toggle")?.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("theme", newTheme);
  actualizarIconoTema(newTheme);

  showToast(`Tema ${newTheme === "dark" ? "oscuro" : "claro"} activado`, "info");
});

function actualizarIconoTema(tema) {
  const btn = document.getElementById("theme-toggle");
  btn.textContent = tema === "dark" ? "☀️" : "🌙";
}

// ============================================
// TOGGLE PANELES
// ============================================
document.getElementById("stats-toggle")?.addEventListener("click", () => {
  const panel = document.getElementById("stats-panel");
  const isVisible = panel.style.display !== "none";

  panel.style.display = isVisible ? "none" : "block";

  if (!isVisible) {
    actualizarEstadisticas();
    renderizarGraficos();
  }
});

document.getElementById("history-toggle")?.addEventListener("click", () => {
  const panel = document.getElementById("history-panel");
  panel.style.display = panel.style.display === "none" ? "block" : "none";
});

// ============================================
// CARGAR Y GUARDAR DATOS
// ============================================
function cargarDatos() {
  const data = JSON.parse(localStorage.getItem("registros")) || {};

  if (data[hoy]) {
    checkins = data[hoy].checkins || [];
    sequeda = data[hoy].sequeda || [];
    checkouts = data[hoy].checkouts || [];
  } else {
    checkins = [];
    sequeda = [];
    checkouts = [];
  }

  mostrarRegistros();
  actualizarEstadisticas();
}

function guardarDatos() {
  const data = JSON.parse(localStorage.getItem("registros")) || {};
  data[hoy] = { checkins, sequeda, checkouts };
  localStorage.setItem("registros", JSON.stringify(data));
}

// ============================================
// CONFIGURAR EVENTOS
// ============================================
function configurarEventos() {
  // Selector de sección
  document.getElementById("selector-seccion").addEventListener("change", function () {
    const value = this.value;
    document.querySelectorAll(".seccion-form").forEach(sec => (sec.style.display = "none"));

    if (value === "checkin") document.getElementById("section-checkin").style.display = "block";
    if (value === "sequeda") document.getElementById("section-sequeda").style.display = "block";
    if (value === "checkout") document.getElementById("section-checkout").style.display = "block";
  });

  // Verificar disponibilidad de habitación
  document.getElementById("habitacion")?.addEventListener("input", verificarDisponibilidad);

  // Formulario principal
  document.getElementById("checkin-form").addEventListener("submit", guardarRegistro);

  // Búsqueda
  document.getElementById("search-btn")?.addEventListener("click", buscarRegistros);
  document.getElementById("clear-search")?.addEventListener("click", limpiarBusqueda);
  document.getElementById("search-input")?.addEventListener("keypress", (e) => {
    if (e.key === "Enter") buscarRegistros();
  });

  // Botones de acción
  document.getElementById("btn-print")?.addEventListener("click", () => window.print());
  document.getElementById("btn-download")?.addEventListener("click", descargarTXT);
  document.getElementById("btn-download-pdf")?.addEventListener("click", descargarPDF);
  document.getElementById("btn-image")?.addEventListener("click", copiarComoImagen);

  // Historial
  document.getElementById("load-date")?.addEventListener("click", cargarFechaHistorico);
  document.getElementById("export-all")?.addEventListener("click", exportarTodo);
  document.getElementById("import-data")?.addEventListener("click", () => {
    document.getElementById("file-input").click();
  });
  document.getElementById("file-input")?.addEventListener("change", importarDatos);

  // Selector de fecha
  const dateSelector = document.getElementById("date-selector");
  if (dateSelector) {
    dateSelector.value = hoy;
    dateSelector.max = hoy;
  }
}

// ============================================
// VERIFICAR DISPONIBILIDAD DE HABITACIÓN
// ============================================
function verificarDisponibilidad() {
  const habitacion = this.value.trim();
  const indicator = document.getElementById("room-available");

  if (!habitacion) {
    indicator.textContent = "";
    return;
  }

  const ocupada = checkins.some(c => c.toUpperCase().includes(habitacion.toUpperCase())) ||
    sequeda.some(s => s.toUpperCase() === habitacion.toUpperCase());

  if (ocupada) {
    indicator.textContent = "❌ Ocupada";
    indicator.style.color = "red";
    showToast(`⚠️ La habitación ${habitacion} ya está ocupada`, "warning");
  } else {
    indicator.textContent = "✅ Disponible";
    indicator.style.color = "green";
  }
}

// ============================================
// GUARDAR REGISTRO
// ============================================
function guardarRegistro(e) {
  e.preventDefault();

  const seccionSeleccionada = document.getElementById("selector-seccion").value;

  // Validar que se haya seleccionado una sección
  if (!seccionSeleccionada) {
    showToast("⚠️ Por favor selecciona qué quieres agregar", "warning");
    return;
  }

  const habitacion = document.getElementById("habitacion").value.trim();
  const huesped = document.getElementById("huesped").value.trim();
  const pax = document.getElementById("pax").value;
  const extra = document.getElementById("extra").value.trim();
  const seQuedaHabitacion = document.getElementById("sequeda").value.trim();
  const checkoutHabitacion = document.getElementById("checkout").value.trim();

  // Validaciones según la sección
  if (seccionSeleccionada === "checkin" && (!habitacion || !huesped || !pax)) {
    showToast("⚠️ Completa todos los campos obligatorios de Check-In", "warning");
    return;
  }

  if (seccionSeleccionada === "sequeda" && !seQuedaHabitacion) {
    showToast("⚠️ Ingresa la habitación para Se Queda", "warning");
    return;
  }

  if (seccionSeleccionada === "checkout" && !checkoutHabitacion) {
    showToast("⚠️ Ingresa la habitación para Check-Out", "warning");
    return;
  }

  // Validar habitación no ocupada (solo en check-in nuevo)
  if (editMode === null && seccionSeleccionada === "checkin") {
    const ocupada = checkins.some(c => c.toUpperCase().includes(habitacion.toUpperCase()));
    if (ocupada) {
      showToast(`❌ La habitación ${habitacion} ya está ocupada`, "error");
      return;
    }
  }

  // Editar registro existente
  if (editMode !== null && editSection) {
    if (editSection === "checkin") {
      let checkinText = `${habitacion.toUpperCase()} / ${huesped.toUpperCase()} / ${pax} PAX`;
      if (extra) checkinText += ` / ${extra.toUpperCase()}`;
      checkins[editMode] = checkinText;
      showToast("✅ Check-in actualizado correctamente", "success");
    } else if (editSection === "sequeda") {
      sequeda[editMode] = seQuedaHabitacion.toUpperCase();
      showToast("✅ Registro actualizado correctamente", "success");
    } else if (editSection === "checkout") {
      checkouts[editMode] = checkoutHabitacion.toUpperCase();
      showToast("✅ Check-out actualizado correctamente", "success");
    }
    editMode = null;
    editSection = null;
  } else {
    // Nuevo registro
    if (seccionSeleccionada === "checkin" && habitacion && huesped && pax) {
      let checkinText = `${habitacion.toUpperCase()} / ${huesped.toUpperCase()} / ${pax} PAX`;
      if (extra) checkinText += ` / ${extra.toUpperCase()}`;
      checkins.push(checkinText);
      showToast("✅ Check-in registrado exitosamente", "success");
    }

    if (seccionSeleccionada === "sequeda" && seQuedaHabitacion) {
      sequeda.push(seQuedaHabitacion.toUpperCase());
      showToast("✅ Se Queda registrado exitosamente", "success");
    }

    if (seccionSeleccionada === "checkout" && checkoutHabitacion) {
      checkouts.push(checkoutHabitacion.toUpperCase());
      showToast("✅ Check-out registrado exitosamente", "success");
    }
  }

  guardarDatos();
  mostrarRegistros();
  actualizarEstadisticas();
  document.getElementById("checkin-form").reset();
  document.getElementById("selector-seccion").value = "";
  document.querySelectorAll(".seccion-form").forEach(sec => (sec.style.display = "none"));
}

// ============================================
// MOSTRAR REGISTROS
// ============================================
function mostrarRegistros() {
  const output = document.getElementById("output");
  let html = "";

  if (checkins.length > 0) {
    html += `<h3 class="section-title">✅ Check-In (${checkins.length})</h3><ul>`;
    checkins.forEach((c, i) => {
      html += `<li>
        ${c}
        <button class="btn-edit" onclick="editarRegistro('checkin', ${i})">✏️ Editar</button>
        <button class="btn-delete" onclick="eliminarRegistro('checkin', ${i})">🗑️ Eliminar</button>
      </li>`;
    });
    html += `</ul>`;
  }

  if (sequeda.length > 0) {
    html += `<h3 class="section-title">🏠 Se Queda (${sequeda.length})</h3><ul>`;
    sequeda.forEach((s, i) => {
      html += `<li>
        ${s}
        <button class="btn-edit" onclick="editarRegistro('sequeda', ${i})">✏️ Editar</button>
        <button class="btn-delete" onclick="eliminarRegistro('sequeda', ${i})">🗑️ Eliminar</button>
      </li>`;
    });
    html += `</ul>`;
  }

  if (checkouts.length > 0) {
    html += `<h3 class="section-title">🚪 Check-Out (${checkouts.length})</h3><ul>`;
    checkouts.forEach((c, i) => {
      html += `<li>
        ${c}
        <button class="btn-edit" onclick="editarRegistro('checkout', ${i})">✏️ Editar</button>
        <button class="btn-delete" onclick="eliminarRegistro('checkout', ${i})">🗑️ Eliminar</button>
      </li>`;
    });
    html += `</ul>`;
  }

  output.innerHTML = html || "📭 No hay registros para hoy";
}

// ============================================
// EDITAR REGISTRO
// ============================================
window.editarRegistro = function (section, index) {
  editMode = index;
  editSection = section;

  document.getElementById("selector-seccion").value = section;
  document.querySelectorAll(".seccion-form").forEach(sec => (sec.style.display = "none"));

  if (section === "checkin") {
    document.getElementById("section-checkin").style.display = "block";
    let parts = checkins[index].split(" / ");
    document.getElementById("habitacion").value = parts[0];
    document.getElementById("huesped").value = parts[1];
    document.getElementById("pax").value = parts[2].replace(" PAX", "");
    document.getElementById("extra").value = parts[3] || "";
  }

  if (section === "sequeda") {
    document.getElementById("section-sequeda").style.display = "block";
    document.getElementById("sequeda").value = sequeda[index];
  }

  if (section === "checkout") {
    document.getElementById("section-checkout").style.display = "block";
    document.getElementById("checkout").value = checkouts[index];
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
};

// ============================================
// ELIMINAR REGISTRO
// ============================================
window.eliminarRegistro = function (section, index) {
  if (!confirm("¿Estás seguro de eliminar este registro?")) return;

  if (section === "checkin") checkins.splice(index, 1);
  if (section === "sequeda") sequeda.splice(index, 1);
  if (section === "checkout") checkouts.splice(index, 1);

  guardarDatos();
  mostrarRegistros();
  actualizarEstadisticas();
  showToast("🗑️ Registro eliminado", "info");
};

// ============================================
// ESTADÍSTICAS
// ============================================
function actualizarEstadisticas() {
  const ocupadas = checkins.length + sequeda.length;
  const disponibles = TOTAL_ROOMS - ocupadas;
  const porcentajeOcupacion = ((ocupadas / TOTAL_ROOMS) * 100).toFixed(1);

  const totalPax = checkins.reduce((sum, c) => {
    const match = c.match(/(\d+) PAX/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  document.getElementById("stat-ocupacion").textContent = `${porcentajeOcupacion}%`;
  document.getElementById("stat-checkins").textContent = checkins.length;
  document.getElementById("stat-checkouts").textContent = checkouts.length;
  document.getElementById("stat-huespedes").textContent = totalPax;
}

// ============================================
// GRÁFICOS
// ============================================
function renderizarGraficos() {
  renderizarGraficoOcupacion();
  renderizarGraficoHabitaciones();
}

function renderizarGraficoOcupacion() {
  const ctx = document.getElementById("occupancyChart");
  if (!ctx) return;

  // Obtener datos de los últimos 7 días
  const data = JSON.parse(localStorage.getItem("registros")) || {};
  const labels = [];
  const ocupacion = [];

  for (let i = 6; i >= 0; i--) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - i);
    const fechaStr = fecha.toISOString().slice(0, 10);

    labels.push(formatearFechaCorta(fechaStr));

    if (data[fechaStr]) {
      const ocupadas = (data[fechaStr].checkins?.length || 0) + (data[fechaStr].sequeda?.length || 0);
      ocupacion.push(((ocupadas / TOTAL_ROOMS) * 100).toFixed(1));
    } else {
      ocupacion.push(0);
    }
  }

  if (occupancyChart) occupancyChart.destroy();

  occupancyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Ocupación (%)",
        data: ocupacion,
        borderColor: "#007bff",
        backgroundColor: "rgba(0, 123, 255, 0.1)",
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: {
          callbacks: {
            label: (context) => `Ocupación: ${context.parsed.y}%`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: (value) => value + "%" }
        }
      }
    }
  });
}

function renderizarGraficoHabitaciones() {
  const ctx = document.getElementById("roomsChart");
  if (!ctx) return;

  // Contar habitaciones más solicitadas (últimos 30 días)
  const data = JSON.parse(localStorage.getItem("registros")) || {};
  const habitacionesCount = {};

  Object.values(data).forEach(dia => {
    dia.checkins?.forEach(checkin => {
      const habitacion = checkin.split(" / ")[0];
      habitacionesCount[habitacion] = (habitacionesCount[habitacion] || 0) + 1;
    });
  });

  const sortedRooms = Object.entries(habitacionesCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (roomsChart) roomsChart.destroy();

  roomsChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sortedRooms.map(r => r[0]),
      datasets: [{
        label: "Reservas",
        data: sortedRooms.map(r => r[1]),
        backgroundColor: [
          "#007bff",
          "#28a745",
          "#ffc107",
          "#dc3545",
          "#6c757d"
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 }
        }
      }
    }
  });
}

// ============================================
// BÚSQUEDA
// ============================================
function buscarRegistros() {
  const query = document.getElementById("search-input").value.trim().toLowerCase();

  if (!query) {
    showToast("⚠️ Ingresa un término de búsqueda", "warning");
    return;
  }

  const data = JSON.parse(localStorage.getItem("registros")) || {};
  const resultados = [];

  Object.entries(data).forEach(([fecha, registros]) => {
    registros.checkins?.forEach(c => {
      if (c.toLowerCase().includes(query)) {
        resultados.push({ fecha, tipo: "Check-In", info: c });
      }
    });
    registros.sequeda?.forEach(s => {
      if (s.toLowerCase().includes(query)) {
        resultados.push({ fecha, tipo: "Se Queda", info: s });
      }
    });
    registros.checkouts?.forEach(c => {
      if (c.toLowerCase().includes(query)) {
        resultados.push({ fecha, tipo: "Check-Out", info: c });
      }
    });
  });

  mostrarResultadosBusqueda(resultados);
}

function mostrarResultadosBusqueda(resultados) {
  const container = document.getElementById("search-results");

  if (resultados.length === 0) {
    container.innerHTML = "<p>❌ No se encontraron resultados</p>";
    return;
  }

  let html = `<h4>🔍 Resultados encontrados: ${resultados.length}</h4><ul style="list-style:none; padding:0;">`;

  resultados.forEach(r => {
    html += `<li style="background: var(--bg-tertiary); padding: 10px; margin: 5px 0; border-radius: 6px;">
      <strong>${formatearFecha(r.fecha)}</strong> - ${r.tipo}<br>
      ${r.info}
    </li>`;
  });

  html += "</ul>";
  container.innerHTML = html;
}

function limpiarBusqueda() {
  document.getElementById("search-input").value = "";
  document.getElementById("search-results").innerHTML = "";
}

// ============================================
// HISTORIAL
// ============================================
function cargarFechaHistorico() {
  const fecha = document.getElementById("date-selector").value;

  if (!fecha) {
    showToast("⚠️ Selecciona una fecha", "warning");
    return;
  }

  const data = JSON.parse(localStorage.getItem("registros")) || {};
  const registros = data[fecha];

  const output = document.getElementById("history-output");

  if (!registros) {
    output.innerHTML = `<p>📭 No hay registros para el ${formatearFecha(fecha)}</p>`;
    return;
  }

  let html = `<h3>📅 Registros del ${formatearFecha(fecha)}</h3>`;

  if (registros.checkins?.length > 0) {
    html += `<h4>✅ Check-In (${registros.checkins.length})</h4><ul>`;
    registros.checkins.forEach(c => html += `<li>${c}</li>`);
    html += `</ul>`;
  }

  if (registros.sequeda?.length > 0) {
    html += `<h4>🏠 Se Queda (${registros.sequeda.length})</h4><ul>`;
    registros.sequeda.forEach(s => html += `<li>${s}</li>`);
    html += `</ul>`;
  }

  if (registros.checkouts?.length > 0) {
    html += `<h4>🚪 Check-Out (${registros.checkouts.length})</h4><ul>`;
    registros.checkouts.forEach(c => html += `<li>${c}</li>`);
    html += `</ul>`;
  }

  output.innerHTML = html;
}

// ============================================
// EXPORTAR / IMPORTAR
// ============================================
function exportarTodo() {
  const data = localStorage.getItem("registros");

  if (!data) {
    showToast("❌ No hay datos para exportar", "error");
    return;
  }

  const blob = new Blob([data], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `hotel-backup-${hoy}.json`;
  link.click();

  showToast("✅ Backup descargado correctamente", "success");
}

function importarDatos(e) {
  const file = e.target.files[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      const data = JSON.parse(event.target.result);
      localStorage.setItem("registros", JSON.stringify(data));
      cargarDatos();
      showToast("✅ Datos importados correctamente", "success");
    } catch (error) {
      showToast("❌ Error al importar: archivo inválido", "error");
    }
  };

  reader.readAsText(file);
}

// ============================================
// DESCARGAS
// ============================================
function descargarTXT() {
  const text = document.getElementById("output").innerText;
  const blob = new Blob([`HOTEL CAUCA VIEJO - REPORTE\nFecha: ${formatearFecha(hoy)}\n\n${text}`],
    { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `reporte-${hoy}.txt`;
  link.click();
  showToast("📥 Reporte descargado", "success");
}

function descargarPDF() {
  showToast("📄 Generando PDF...", "info");
  window.print();
}

function copiarComoImagen() {
  const report = document.getElementById("checkin-list");
  const buttons = report.querySelectorAll(".btn-edit, .btn-delete, .form-actions button");

  buttons.forEach(btn => btn.style.display = "none");

  html2canvas(report, { scale: 2 }).then(canvas => {
    buttons.forEach(btn => btn.style.display = "");

    canvas.toBlob(blob => {
      const item = new ClipboardItem({ "image/png": blob });
      navigator.clipboard.write([item])
        .then(() => showToast("✅ Imagen copiada al portapapeles", "success"))
        .catch(() => showToast("❌ Error al copiar la imagen", "error"));
    });
  });
}

// ============================================
// UTILIDADES
// ============================================
function formatearFecha(fecha) {
  const [year, month, day] = fecha.split("-");
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${day} ${meses[parseInt(month) - 1]} ${year}`;
}

function formatearFechaCorta(fecha) {
  const [year, month, day] = fecha.split("-");
  return `${day}/${month}`;
}

function showToast(message, type = "info") {
  if (typeof Toastify === "undefined") {
    alert(message);
    return;
  }

  const colors = {
    success: "#28a745",
    error: "#dc3545",
    warning: "#ffc107",
    info: "#007bff"
  };

  Toastify({
    text: message,
    duration: 3000,
    gravity: "top",
    position: "right",
    style: {
      background: colors[type] || colors.info,
    }
  }).showToast();
}