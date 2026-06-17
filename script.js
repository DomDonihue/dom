/* certificados y accordion se resuelven en iniciarApp(), tras cargar municipio_config.json */
let certificados = [];

function crearAcordeon() {
  const accordion = document.getElementById("certificadosAccordion");
  if (!accordion) return;
  certificados.forEach((certificado, index) => {
    const item = document.createElement("div");
    item.className = "accordion-item";

    item.innerHTML = `
      <button class="accordion-header" type="button">
        <div class="accordion-title-wrap">
          <div class="accordion-badge">📄</div>
          <div>
            <h3 class="accordion-title">${certificado.nombre}</h3>
            <p class="accordion-subtitle">Plazo referencial: ${certificado.plazo}</p>
          </div>
        </div>
        <div class="accordion-arrow">⌄</div>
      </button>

      <div class="accordion-content">
        <div class="accordion-grid">
          <div class="info-box">
            <h4>Descripción</h4>
            <p>${certificado.descripcion}</p>
          </div>

          <div class="info-box">
            <h4>Documentos requeridos</h4>
            <ul>
              ${certificado.documentos.map(doc => `<li>${doc}</li>`).join("")}
            </ul>
          </div>
        </div>

    <div class="accordion-actions">
  ${certificado.formulario ? `
    <a class="btn btn-outline" href="${certificado.formulario}" target="_blank">
      Ver formulario
    </a>
  ` : ""}

  <a class="btn btn-accent" href="https://domenlinea.minvu.cl/" target="_blank">
    Ir a DOM en Línea
  </a>
</div>

</div>
`;

    const header = item.querySelector(".accordion-header");
    header.addEventListener("click", () => {
      item.classList.toggle("active");
    });

    accordion.appendChild(item);
  });
}

/* CONFIGURACIÓN GENERAL */

function obtenerConfigDom(clave, valorPorDefecto) {
  if (window.DOM_CONFIG && Object.prototype.hasOwnProperty.call(window.DOM_CONFIG, clave)) {
    return window.DOM_CONFIG[clave];
  }
  return valorPorDefecto;
}

function obtenerPosicionPdf(clave, valorPorDefecto) {
  const posiciones = obtenerConfigDom("posicionesPdf", {});
  return posiciones && posiciones[clave] ? posiciones[clave] : valorPorDefecto;
}

function asignarValor(id, valor, sobrescribir = true) {
  const elemento = document.getElementById(id);
  if (!elemento || valor === undefined || valor === null || String(valor).trim() === "") return;

  if (sobrescribir || !elemento.value.trim()) {
    elemento.value = String(valor).trim();
  }
}

function extraerNumeroDireccion(texto) {
  if (!texto) return "";
  const coincidencia = String(texto).match(/\b\d{1,6}[A-Za-z]?\b/);
  return coincidencia ? coincidencia[0] : "";
}

function limpiarCalle(calle) {
  if (!calle) return "";
  return String(calle)
    .replace(/\s+/g, " ")
    .trim();
}

function obtenerLocalidadDesdeAddress(address = {}) {
  return (
    address.city ||
    address.town ||
    address.village ||
    address.hamlet ||
    address.municipality ||
    address.county ||
    address.suburb ||
    obtenerConfigDom("localidadPredeterminada", "") ||
    obtenerConfigDom("comunaBusqueda", "")
  );
}

/**
 * Detecta automáticamente si la dirección es urbana o rural
 * basándose en la jerarquía del objeto address de Nominatim.
 * - city / town / suburb / neighbourhood / quarter → urbano
 * - village / hamlet / farm / isolated_dwelling     → rural
 */
function detectarZonaDesdeAddress(address = {}, placeRank = null) {
  const indicadoresUrbano = [
    address.city, address.town, address.suburb,
    address.neighbourhood, address.quarter,
    address.industrial, address.commercial, address.residential,
    address.allotments, address.retail
  ];
  const indicadoresRural = [
    address.village, address.hamlet, address.farm,
    address.farmyard, address.isolated_dwelling, address.locality,
    address.municipality
  ];

  const esUrbano = indicadoresUrbano.some(Boolean);
  const esRural  = !esUrbano && indicadoresRural.some(Boolean);

  if (esUrbano) return "urbano";
  if (esRural)  return "rural";

  /* Fallback: place_rank ≤ 16 = ciudad/pueblo (urbano), > 16 = rural */
  if (placeRank !== null) {
    return placeRank <= 16 ? "urbano" : "rural";
  }
  return "";
}

function autocompletarDireccionFormulario(address = {}, textoBusqueda = "", placeRank = null) {
  const calle = limpiarCalle(
    address.road ||
    address.pedestrian ||
    address.residential ||
    address.footway ||
    address.path ||
    address.neighbourhood ||
    ""
  );

  const numero    = address.house_number || extraerNumeroDireccion(textoBusqueda);
  const localidad = obtenerLocalidadDesdeAddress(address);
  const zonaDetectada = detectarZonaDesdeAddress(address, placeRank);

  asignarValor("calle", calle, true);

  const checkSinNumero = document.getElementById("sinNumero");
  if (checkSinNumero && checkSinNumero.checked) {
    asignarValor("numero", "S/N", true);
  } else {
    asignarValor("numero", numero, true);
  }

  asignarValor("localidad", localidad, true);

  /* Asignar zona automáticamente y mostrar indicador */
  const selectZona = document.getElementById("zona");
  if (selectZona && zonaDetectada) {
    selectZona.value = zonaDetectada;
  }
  mostrarIndicadorZona(zonaDetectada);

  actualizarEstadoFlujo();
}

function hayUbicacionSeleccionada() {
  return Boolean(obtenerValor("latitud") && obtenerValor("longitud"));
}

function actualizarPaso(id, estado) {
  const paso = document.getElementById(id);
  if (!paso) return;

  paso.classList.remove("activo", "completado");
  if (estado) paso.classList.add(estado);
}


function actualizarEstadoFlujo() {
  const hayUbicacion = hayUbicacionSeleccionada();
  const cfgConsent = obtenerConfigDom("consentimiento", {});
  const consentimientoRequerido = cfgConsent.requerido !== false;
  const consentimiento = document.getElementById("consentimientoDatos");
  const hayConsentimiento = !consentimientoRequerido || (consentimiento ? consentimiento.checked : false);
  const estadoUbicacion = document.getElementById("estadoUbicacion");
  const botones = ["btnGuardarDatos", "btnGenerarPdf", "btnImprimirPdf"];

  botones.forEach((id) => {
    const boton = document.getElementById(id);
    if (boton) boton.disabled = !(hayUbicacion && hayConsentimiento);
  });

  if (estadoUbicacion) {
    if (hayUbicacion) {
      estadoUbicacion.textContent = "Ubicación lista. Revise los datos autocompletados y complete los datos personales.";
      estadoUbicacion.classList.remove("pendiente");
      estadoUbicacion.classList.add("listo");
    } else {
      estadoUbicacion.textContent = "Seleccione una ubicación para continuar con el formulario.";
      estadoUbicacion.classList.remove("listo");
      estadoUbicacion.classList.add("pendiente");
    }
  }

  if (hayUbicacion) {
    actualizarPaso("pasoUbicacion", "completado");
    actualizarPaso("pasoFormulario", "activo");
    actualizarPaso("pasoPdf", "");
  } else {
    actualizarPaso("pasoUbicacion", "activo");
    actualizarPaso("pasoFormulario", "");
    actualizarPaso("pasoPdf", "");
  }
}

function irAlFormularioDespuesDeUbicacion() {
  if (!hayUbicacionSeleccionada()) {
    alert("Primero debe buscar una dirección o marcar el punto en el mapa.");
    return;
  }

  const formulario = document.getElementById("solicitudForm");
  if (formulario) {
    formulario.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* MAPA PARA CROQUIS DE UBICACIÓN */

let mapaPredio;
let marcadorPredio;
let drawnItems;          // FeatureGroup para los polígonos dibujados
let drawControl;         // Control de herramientas de dibujo

function iniciarMapaPredio() {
  const contenedorMapa = document.getElementById("mapaPredio");
  if (!contenedorMapa) return;

  const centroMapa = obtenerConfigDom("centroMapa", [-34.233333, -70.966667]);
  const zoomInicial = obtenerConfigDom("zoomInicial", 14);

  mapaPredio = L.map("mapaPredio", { zoomControl: true }).setView(centroMapa, zoomInicial);

  /* ── Capas base ─────────────────────────────────────────────── */

  /* 1. Solo satélite (base) */
  /* Satélite + etiquetas Google (mejor resolución para Chile) */
  L.tileLayer(
    "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    {
      subdomains: ["0", "1", "2", "3"],
      maxNativeZoom: 21,
      maxZoom: 21,
      attribution: "Tiles &copy; Google"
    }
  ).addTo(mapaPredio);

  /* ── Traducciones Leaflet.draw al español ───────────────────── */
  L.drawLocal.draw.toolbar.buttons.polygon   = "Trazar polígono del predio";
  L.drawLocal.draw.toolbar.buttons.rectangle = "Trazar rectángulo del predio";
  L.drawLocal.draw.toolbar.actions.title     = "Cancelar trazado";
  L.drawLocal.draw.toolbar.actions.text      = "Cancelar";
  L.drawLocal.draw.toolbar.finish.title      = "Finalizar trazado";
  L.drawLocal.draw.toolbar.finish.text       = "Finalizar";
  L.drawLocal.draw.toolbar.undo.title        = "Eliminar último punto";
  L.drawLocal.draw.toolbar.undo.text         = "Deshacer";
  L.drawLocal.draw.handlers.polygon.tooltip  = {
    start: "Haga clic para comenzar a trazar el límite",
    cont:  "Haga clic para continuar el trazado",
    end:   "Cierre el polígono en el primer punto"
  };
  L.drawLocal.draw.handlers.rectangle.tooltip = {
    start: "Haga clic y arrastre para trazar el rectángulo"
  };
  L.drawLocal.edit.toolbar.buttons.edit            = "Editar límites trazados";
  L.drawLocal.edit.toolbar.buttons.editDisabled    = "Sin límites para editar";
  L.drawLocal.edit.toolbar.buttons.remove          = "Eliminar límites";
  L.drawLocal.edit.toolbar.buttons.removeDisabled  = "Sin límites para eliminar";
  L.drawLocal.edit.toolbar.actions.save.title      = "Guardar cambios";
  L.drawLocal.edit.toolbar.actions.save.text       = "Guardar";
  L.drawLocal.edit.toolbar.actions.cancel.title    = "Cancelar edición";
  L.drawLocal.edit.toolbar.actions.cancel.text     = "Cancelar";
  L.drawLocal.edit.toolbar.actions.clearAll.title  = "Eliminar todos los trazados";
  L.drawLocal.edit.toolbar.actions.clearAll.text   = "Eliminar todo";
  L.drawLocal.edit.handlers.edit.tooltip           = {
    text:    "Arrastre los vértices para editar el límite",
    subtext: "Haga clic en Cancelar para deshacer"
  };
  L.drawLocal.edit.handlers.remove.tooltip = {
    text: "Haga clic en el trazado para eliminarlo"
  };

  /* ── Capa para polígonos dibujados ──────────────────────────── */
  drawnItems = new L.FeatureGroup();
  mapaPredio.addLayer(drawnItems);

  /* ── Control de dibujo Leaflet.draw ─────────────────────────── */
  drawControl = new L.Control.Draw({
    position: "topleft",
    draw: {
      polygon: {
        allowIntersection: false,
        showArea: true,
        shapeOptions: { color: "#e63946", weight: 2.5, opacity: 0.9, fillColor: "#e63946", fillOpacity: 0.12 }
      },
      rectangle: {
        shapeOptions: { color: "#e63946", weight: 2.5, opacity: 0.9, fillColor: "#e63946", fillOpacity: 0.12 }
      },
      polyline: false,
      circle: false,
      circlemarker: false,
      marker: false
    },
    edit: {
      featureGroup: drawnItems,
      edit: { selectedPathOptions: { dashArray: "6, 6", fillOpacity: 0.2 } },
      remove: true
    }
  });
  mapaPredio.addControl(drawControl);

  /* ── Botón "Mover mapa" (mano) en la barra de herramientas ─── */
  const ControlMover = L.Control.extend({
    options: { position: "topleft" },
    onAdd: function () {
      const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
      div.innerHTML = `<a class="leaflet-mover-btn" id="btnMoverMapa" href="#" title="Mover el mapa" role="button" aria-label="Mover el mapa">✋</a>`;
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.on(div, "click", function (e) {
        L.DomEvent.preventDefault(e);
        /* Cancelar cualquier herramienta de dibujo activa */
        mapaPredio.fire("draw:drawstop");
        mapaPredio.getContainer().style.cursor = "grab";
        document.querySelectorAll(".leaflet-draw-toolbar a").forEach(a => a.classList.remove("leaflet-draw-toolbar-button-enabled"));
        document.getElementById("btnMoverMapa")?.classList.add("mover-activo");
      });
      return div;
    }
  });
  mapaPredio.addControl(new ControlMover());

  /* ── Eventos de dibujo ──────────────────────────────────────── */
  mapaPredio.on(L.Draw.Event.CREATED, async function (e) {
    drawnItems.clearLayers();
    drawnItems.addLayer(e.layer);
    guardarLimitesPropiedad();

    /* Mover el pin automáticamente al centro del polígono dibujado */
    const centro = e.layer.getBounds().getCenter();
    actualizarUbicacionPredio(centro.lat, centro.lng, "Ubicación centrada en el dibujo");
    await completarDireccionPorCoordenadas(centro.lat, centro.lng);
  });

  mapaPredio.on(L.Draw.Event.EDITED, async function () {
    guardarLimitesPropiedad();

    /* Recalcular el pin al nuevo centro si el polígono fue editado */
    if (drawnItems.getLayers().length > 0) {
      const centro = drawnItems.getLayers()[0].getBounds().getCenter();
      actualizarUbicacionPredio(centro.lat, centro.lng, "Ubicación actualizada al editar el dibujo");
      await completarDireccionPorCoordenadas(centro.lat, centro.lng);
    }
  });

  mapaPredio.on(L.Draw.Event.DELETED, function () {
    document.getElementById("limitesPropiedad").value = "";
    actualizarInfoLimites(null);
  });

  /* Al activar polígono o rectángulo: limpiar pin, búsqueda y campos de ubicación anteriores */
  mapaPredio.on(L.Draw.Event.DRAWSTART, function () {
    if (marcadorPredio && mapaPredio) {
      mapaPredio.removeLayer(marcadorPredio);
      marcadorPredio = null;
    }
    const inputBuscar = document.getElementById("buscarDireccion");
    if (inputBuscar) inputBuscar.value = "";
    ["calle","numero","localidad","latitud","longitud","limitesPropiedad"].forEach(function(id) {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    const coordTexto = document.getElementById("coordenadasTexto");
    if (coordTexto) coordTexto.textContent = "Aún no se ha seleccionado una ubicación.";
    actualizarInfoLimites(null);
  });

  /* ── Clic para marcar punto de ubicación ────────────────────── */
  mapaPredio.on("click", async function (event) {
    if (mapaPredio._drawingMode) return;

    /* Si había un polígono dibujado, se borra para dejar solo el pin */
    if (drawnItems && drawnItems.getLayers().length > 0) {
      drawnItems.clearLayers();
      document.getElementById("limitesPropiedad").value = "";
      actualizarInfoLimites(null);
    }

    const lat = event.latlng.lat;
    const lng = event.latlng.lng;
    actualizarUbicacionPredio(lat, lng, "Punto marcado en el mapa");
    await completarDireccionPorCoordenadas(lat, lng);
  });

  setTimeout(() => { mapaPredio.invalidateSize(); }, 300);
}

/* Guarda el GeoJSON del polígono dibujado en el campo oculto */
function guardarLimitesPropiedad() {
  const campo = document.getElementById("limitesPropiedad");
  if (!campo || !drawnItems) return;

  const geojson = drawnItems.toGeoJSON();
  if (!geojson.features || geojson.features.length === 0) {
    campo.value = "";
    actualizarInfoLimites(null);
    return;
  }

  campo.value = JSON.stringify(geojson);
  actualizarInfoLimites(geojson.features[0]);
}

/* Mini-mapa de previsualización de deslindes */
let miniMapa = null;
let miniMapaLayer = null;

function actualizarInfoLimites(feature) {
  const badge      = document.getElementById("limitesBadge");
  const texto      = document.getElementById("limitesTexto");
  const btnLimpiar = document.getElementById("btnLimpiarLimites");
  const wrap       = document.getElementById("limitesMiniMapaWrap");
  const sinDemar   = document.getElementById("limitesSinDemarcar");

  if (!badge) return;

  if (!feature) {
    badge.textContent = "Sin demarcar";
    badge.className   = "limites-badge sin-limites";
    if (wrap)      wrap.style.display    = "none";
    if (sinDemar)  sinDemar.style.display = "block";
    if (texto)     texto.textContent     = "";
    if (btnLimpiar) btnLimpiar.style.display = "none";
    /* Destruir mini-mapa si existe */
    if (miniMapa) { miniMapa.remove(); miniMapa = null; miniMapaLayer = null; }
    return;
  }

  badge.textContent = "Demarcado ✓";
  badge.className   = "limites-badge con-limites";
  if (sinDemar)  sinDemar.style.display  = "none";
  if (wrap)      wrap.style.display      = "block";
  if (btnLimpiar) btnLimpiar.style.display = "inline-block";

  /* Texto resumen */
  if (texto) {
    const coords    = feature.geometry.coordinates[0];
    const nVertices = feature.geometry.type === "Polygon" ? coords.length - 1 : coords.length;
    texto.textContent = `Figura demarcada con ${nVertices} vértice${nVertices !== 1 ? "s" : ""}. Se incluirá en el PDF generado.`;
  }

  /* Crear o reutilizar el mini-mapa */
  setTimeout(() => {
    const contenedor = document.getElementById("limitesMiniMapa");
    if (!contenedor) return;

    if (!miniMapa) {
      miniMapa = L.map("limitesMiniMapa", {
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
        keyboard: false,
        attributionControl: false
      });

      L.tileLayer(
        "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
        { subdomains: ["0","1","2","3"], maxNativeZoom: 21, maxZoom: 21 }
      ).addTo(miniMapa);
    }

    /* Limpiar capa anterior y dibujar el nuevo polígono */
    if (miniMapaLayer) { miniMapa.removeLayer(miniMapaLayer); miniMapaLayer = null; }

    miniMapaLayer = L.geoJSON(feature, {
      style: {
        color: "#e63946",
        weight: 2.5,
        opacity: 1,
        fillColor: "#e63946",
        fillOpacity: 0.15
      }
    }).addTo(miniMapa);

    /* Ajustar zoom al polígono con padding */
    const bounds = miniMapaLayer.getBounds();
    miniMapa.fitBounds(bounds, { padding: [20, 20] });
    miniMapa.invalidateSize();
  }, 150);
}

function decimalADMS(lat, lng) {
  function toDMS(decimal, esLat) {
    const abs     = Math.abs(decimal);
    const grados  = Math.floor(abs);
    const minDec  = (abs - grados) * 60;
    const minutos = Math.floor(minDec);
    const segundos = ((minDec - minutos) * 60).toFixed(1);
    const hemisferio = esLat
      ? (decimal >= 0 ? "N" : "S")
      : (decimal >= 0 ? "E" : "W");
    return `${grados}°${minutos}'${segundos}"${hemisferio}`;
  }
  return `${toDMS(lat, true)} ${toDMS(lng, false)}`;
}

function actualizarUbicacionPredio(lat, lng, texto) {
  const latitudInput = document.getElementById("latitud");
  const longitudInput = document.getElementById("longitud");
  const coordenadasTexto = document.getElementById("coordenadasTexto");

  const latFixed = Number(lat).toFixed(6);
  const lngFixed = Number(lng).toFixed(6);

  latitudInput.value = latFixed;
  longitudInput.value = lngFixed;

  const dms = decimalADMS(Number(lat), Number(lng));
  coordenadasTexto.textContent = `${texto} | ${dms}`;

  if (marcadorPredio) {
    marcadorPredio.setLatLng([lat, lng]);
  } else {
    marcadorPredio = L.marker([lat, lng], { draggable: true }).addTo(mapaPredio);

    marcadorPredio.on("dragend", async function () {
      const posicion = marcadorPredio.getLatLng();
      actualizarUbicacionPredio(posicion.lat, posicion.lng, "Punto ajustado manualmente");
      await completarDireccionPorCoordenadas(posicion.lat, posicion.lng);
    });
  }

  /* Mostrar selector de zona al elegir ubicación */
  const zonaSel = document.getElementById("zonaSelectorInline");
  if (zonaSel) zonaSel.style.display = "flex";
  sincronizarBotonesZona();

  actualizarEstadoFlujo();
}

/* Muestra el indicador de zona detectada automáticamente */
function mostrarIndicadorZona(zona) {
  const panel = document.getElementById("zonaDetectadaPanel");
  const zonaSel = document.getElementById("zonaSelectorInline");
  if (zonaSel) zonaSel.style.display = "none"; // ocultar selector manual

  if (!panel) return;

  if (!zona) {
    panel.style.display = "none";
    return;
  }

  const esUrbano = zona === "urbano";
  panel.style.display = "flex";
  panel.className = "zona-detectada-panel " + (esUrbano ? "zona-urbana" : "zona-rural");
  panel.innerHTML = esUrbano
    ? "<span>🏙</span> <strong>Zona Urbana</strong> — detectado automáticamente"
    : "<span>🌿</span> <strong>Zona Rural</strong> — detectado automáticamente";
}

function sincronizarBotonesZona() {
  const selectZona = document.getElementById("zona");
  const btnU = document.getElementById("zonaInlineUrbano");
  const btnR = document.getElementById("zonaInlineRural");
  if (!btnU || !btnR) return;

  function resaltar(val) {
    btnU.classList.toggle("zona-inline-activa", val === "urbano");
    btnR.classList.toggle("zona-inline-activa", val === "rural");
    if (selectZona) selectZona.value = val;
  }

  /* Reflejar valor actual si ya está definido */
  if (selectZona) resaltar(selectZona.value);

  btnU.onclick = () => resaltar("urbano");
  btnR.onclick = () => resaltar("rural");

  if (selectZona) selectZona.addEventListener("change", () => resaltar(selectZona.value));
}

function construirConsultaDireccion(direccion) {
  const comuna = obtenerConfigDom("comunaBusqueda", "");
  const region = obtenerConfigDom("regionBusqueda", "");
  const pais = obtenerConfigDom("paisBusqueda", "Chile");

  return [direccion, comuna, region, pais]
    .filter(Boolean)
    .join(", ");
}

function construirUrlBusquedaMapa(consulta) {
  const codigoPais = obtenerConfigDom("codigoPais", "cl");
  const viewbox = obtenerConfigDom("viewboxBusqueda", "");
  const bounded = obtenerConfigDom("boundedBusqueda", false);

  const params = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    addressdetails: "1",
    "accept-language": "es",
    q: consulta
  });

  if (codigoPais) params.set("countrycodes", codigoPais);
  if (viewbox) params.set("viewbox", viewbox);
  if (viewbox && bounded) params.set("bounded", "1");

  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

async function completarDireccionPorCoordenadas(lat, lng) {
  const codigoPais = obtenerConfigDom("codigoPais", "cl");

  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(lat),
    lon: String(lng),
    addressdetails: "1",
    extratags: "1",
    zoom: "18",
    "accept-language": "es"
  });

  if (codigoPais) params.set("countrycodes", codigoPais);

  const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`;

  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();

    if (datos && datos.address) {
      autocompletarDireccionFormulario(datos.address, datos.display_name || "", datos.place_rank);
    }
  } catch (error) {
    console.warn("No se pudo autocompletar la dirección desde el mapa.", error);
  }
}

async function buscarDireccionEnMapa() {
  const inputBuscar = document.getElementById("buscarDireccion");
  const direccion = inputBuscar.value.trim();

  if (!direccion) {
    alert("Ingrese una dirección o sector para buscar.");
    return;
  }

  const zoomBusqueda = obtenerConfigDom("zoomBusqueda", 17);

  /* Intento 1: búsqueda con contexto de comuna y región */
  const consulta = construirConsultaDireccion(direccion);
  let resultado = await ejecutarBusquedaNominatim(construirUrlBusquedaMapa(consulta));

  /* Intento 2: si no encuentra, busca solo con el texto libre en Chile */
  if (!resultado) {
    const params = new URLSearchParams({
      format: "jsonv2", limit: "1", addressdetails: "1",
      "accept-language": "es", q: direccion, countrycodes: "cl"
    });
    resultado = await ejecutarBusquedaNominatim(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`
    );
  }

  if (!resultado) {
    alert("No se encontró la dirección. Intente escribirla de otra forma o marque el punto manualmente en el mapa.");
    return;
  }

  const lat = parseFloat(resultado.lat);
  const lng = parseFloat(resultado.lon);
  mapaPredio.setView([lat, lng], zoomBusqueda);
  actualizarUbicacionPredio(lat, lng, "Dirección encontrada");
  autocompletarDireccionFormulario(resultado.address || {}, direccion);
}

async function ejecutarBusquedaNominatim(url) {
  try {
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    return (datos && datos.length > 0) ? datos[0] : null;
  } catch {
    return null;
  }
}

/* GENERAR PDF CIP COMPLETADO */

function obtenerValor(id) {
  const elemento = document.getElementById(id);
  return elemento ? elemento.value.trim() : "";
}
/* VALIDACIÓN Y FORMATO AUTOMÁTICO DE RUT CHILENO */

function limpiarRut(rut) {
  return String(rut || "")
    .replace(/[^0-9kK]/g, "")
    .toUpperCase();
}

function formatearRut(rut) {
  const rutLimpio = limpiarRut(rut);

  if (rutLimpio.length < 2) {
    return rutLimpio;
  }

  const cuerpo = rutLimpio.slice(0, -1);
  const dv = rutLimpio.slice(-1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${cuerpoFormateado}-${dv}`;
}

function calcularDigitoVerificadorRut(cuerpo) {
  let suma = 0;
  let multiplicador = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  const resto = suma % 11;
  const resultado = 11 - resto;

  if (resultado === 11) return "0";
  if (resultado === 10) return "K";
  return String(resultado);
}

function validarRutChileno(rut) {
  const rutLimpio = limpiarRut(rut);

  if (rutLimpio.length < 2) {
    return false;
  }

  const cuerpo = rutLimpio.slice(0, -1);
  const dvIngresado = rutLimpio.slice(-1);

  if (!/^\d+$/.test(cuerpo)) {
    return false;
  }

  const dvCalculado = calcularDigitoVerificadorRut(cuerpo);
  return dvCalculado === dvIngresado;
}

function obtenerMensajeRut() {
  let mensaje = document.getElementById("rutMensaje");
  const inputRut = document.getElementById("rut");

  if (!inputRut) return null;

  if (!mensaje) {
    mensaje = document.createElement("small");
    mensaje.id = "rutMensaje";
    mensaje.style.display = "block";
    mensaje.style.marginTop = "6px";
    mensaje.style.fontWeight = "700";
    inputRut.insertAdjacentElement("afterend", mensaje);
  }

  return mensaje;
}

function mostrarEstadoRut() {
  const inputRut = document.getElementById("rut");
  const mensaje = obtenerMensajeRut();

  if (!inputRut || !mensaje) return true;

  const valor = inputRut.value.trim();

  if (!valor) {
    inputRut.style.borderColor = "";
    inputRut.setCustomValidity("");
    mensaje.textContent = "";
    return false;
  }

  inputRut.value = formatearRut(valor);

  if (validarRutChileno(inputRut.value)) {
    inputRut.style.borderColor = "#16a34a";
    inputRut.setCustomValidity("");
    mensaje.textContent = "RUT válido.";
    mensaje.style.color = "#0f6b45";
    return true;
  }

  inputRut.style.borderColor = "#dc2626";
  inputRut.setCustomValidity("RUT inválido.");
  mensaje.textContent = "RUT inválido. Revise el número o dígito verificador.";
  mensaje.style.color = "#b91c1c";
  return false;
}

/* VALIDACIÓN DE TELÉFONO — solo números, exactamente 9 dígitos */

function obtenerMensajeTelefono() {
  let mensaje = document.getElementById("telefonoMensaje");
  const inputTelefono = document.getElementById("telefono");

  if (!inputTelefono) return null;

  if (!mensaje) {
    mensaje = document.createElement("small");
    mensaje.id = "telefonoMensaje";
    mensaje.style.display = "block";
    mensaje.style.marginTop = "6px";
    mensaje.style.fontWeight = "700";
    inputTelefono.insertAdjacentElement("afterend", mensaje);
  }

  return mensaje;
}

function mostrarEstadoTelefono() {
  const inputTelefono = document.getElementById("telefono");
  const mensaje = obtenerMensajeTelefono();

  if (!inputTelefono || !mensaje) return true;

  const valor = inputTelefono.value.trim();

  if (!valor) {
    inputTelefono.style.borderColor = "";
    inputTelefono.setCustomValidity("");
    mensaje.textContent = "";
    return true;
  }

  if (/^\d{9}$/.test(valor)) {
    inputTelefono.style.borderColor = "#16a34a";
    inputTelefono.setCustomValidity("");
    mensaje.textContent = "Teléfono válido.";
    mensaje.style.color = "#0f6b45";
    return true;
  }

  inputTelefono.style.borderColor = "#dc2626";
  inputTelefono.setCustomValidity("Teléfono inválido.");
  mensaje.textContent = `Ingrese exactamente 9 dígitos (ingresados: ${valor.length}).`;
  mensaje.style.color = "#b91c1c";
  return false;
}

function activarValidacionNombre() {
  const inputNombre = document.getElementById("nombre");
  if (!inputNombre) return;

  inputNombre.addEventListener("input", function () {
    this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]/g, "");
  });
}

function activarValidacionTelefono() {
  const inputTelefono = document.getElementById("telefono");

  if (!inputTelefono) return;

  inputTelefono.setAttribute("maxlength", "9");
  inputTelefono.setAttribute("autocomplete", "off");
  inputTelefono.setAttribute("inputmode", "numeric");

  inputTelefono.addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "");

    const mensaje = obtenerMensajeTelefono();
    if (mensaje) mensaje.textContent = "";
    this.style.borderColor = "";
    this.setCustomValidity("");
  });

  inputTelefono.addEventListener("blur", mostrarEstadoTelefono);
}

/* VALIDACIÓN DE NÚMERO DE DOMICILIO — solo dígitos (salvo S/N) */

function activarValidacionNumero() {
  const inputNumero = document.getElementById("numero");
  const checkSinNumero = document.getElementById("sinNumero");

  if (!inputNumero) return;

  inputNumero.addEventListener("input", function () {
    if (checkSinNumero && checkSinNumero.checked) return;
    this.value = this.value.replace(/\D/g, "");
  });
}

function activarValidacionRut() {
  const inputRut = document.getElementById("rut");

  if (!inputRut) return;

  inputRut.setAttribute("maxlength", "12");
  inputRut.setAttribute("autocomplete", "off");

  inputRut.addEventListener("input", function () {
    this.value = this.value
      .replace(/[^0-9kK.\-]/g, "")
      .toUpperCase();

    const mensaje = obtenerMensajeRut();
    if (mensaje) {
      mensaje.textContent = "";
    }

    this.style.borderColor = "";
    this.setCustomValidity("");
  });

  inputRut.addEventListener("blur", mostrarEstadoRut);
}

function validarFormularioCip() {
  const rutInput = document.getElementById("rut");
  const numeroInput = document.getElementById("numero");
  const checkSinNumero = document.getElementById("sinNumero");
  const rolSiiInput = document.getElementById("rolSii");

  if (rutInput) {
    rutInput.value = formatearRut(rutInput.value);
  }

  if (checkSinNumero && checkSinNumero.checked && numeroInput) {
    numeroInput.value = "S/N";
  }

  const nombre = obtenerValor("nombre");
  const rut = obtenerValor("rut");
  const calle = obtenerValor("calle");
  const numero = obtenerValor("numero");
  const rolSii = obtenerValor("rolSii");
  const latitud = obtenerValor("latitud");
  const longitud = obtenerValor("longitud");
  const sinNumero = checkSinNumero ? checkSinNumero.checked : false;

  if (!nombre || !rut || !calle || (!numero && !sinNumero) || !rolSii) {
    alert("Debe completar nombre, RUT, calle, número y Rol SII. Si el predio no tiene número, marque la opción S.N.");
    return false;
  }

  if (!validarRutChileno(rut)) {
    alert("El RUT ingresado no es válido. Revise el número o el dígito verificador.");
    if (rutInput) {
      mostrarEstadoRut();
      rutInput.focus();
    }
    return false;
  }

  const telefono = obtenerValor("telefono");
  if (telefono && !/^\d{9}$/.test(telefono)) {
    alert("El teléfono debe tener exactamente 9 dígitos numéricos (sin espacios ni guiones).");
    const telefonoInput = document.getElementById("telefono");
    if (telefonoInput) {
      mostrarEstadoTelefono();
      telefonoInput.focus();
    }
    return false;
  }

  if (!latitud || !longitud) {
    alert("Debe seleccionar una ubicación en el mapa.");
    return false;
  }

  return true;
}
async function cargarPdfBaseCip() {
  const rutas = obtenerConfigDom("rutasPdfCip", ["./img/Doc/cip_base.pdf"]);

  for (const ruta of rutas) {
    try {
      const respuesta = await fetch(ruta);

      if (respuesta.ok) {
        return await respuesta.arrayBuffer();
      }
    } catch (error) {
      console.warn(`No se pudo cargar el PDF base en la ruta: ${ruta}`, error);
    }
  }

  throw new Error("No se encontró el PDF base CIP en las rutas configuradas.");
}

async function capturarMapaParaPdf() {
  if (mapaPredio) mapaPredio.invalidateSize();

  const mapa = document.getElementById("mapaPredio");

  const canvas = await html2canvas(mapa, {
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    scale: 2,
    foreignObjectRendering: false
  });

  /* html2canvas no captura el SVG de Leaflet — dibujamos el polígono encima */
  if (drawnItems && drawnItems.getLayers().length > 0) {
    const ctx = canvas.getContext("2d");
    const escala = 2;

    drawnItems.eachLayer(function (layer) {
      const coords = layer.getLatLngs ? layer.getLatLngs()[0] : null;
      if (!coords || coords.length < 2) return;

      ctx.beginPath();
      coords.forEach(function (latlng, i) {
        const pt = mapaPredio.latLngToContainerPoint(latlng);
        if (i === 0) ctx.moveTo(pt.x * escala, pt.y * escala);
        else ctx.lineTo(pt.x * escala, pt.y * escala);
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(230, 57, 70, 0.18)";
      ctx.fill();
      ctx.strokeStyle = "#e63946";
      ctx.lineWidth = 2.5 * escala;
      ctx.stroke();
    });
  }

  return {
    imagen: canvas.toDataURL("image/png"),
    bounds: mapaPredio ? mapaPredio.getBounds() : null
  };
}

function cortarTexto(texto, maximo) {
  if (!texto) return "";
  return texto.length > maximo ? texto.substring(0, maximo) : texto;
}

async function generarPdfCip(imprimir = false) {
  if (!validarFormularioCip()) {
    return;
  }

  actualizarPaso("pasoFormulario", "completado");
  actualizarPaso("pasoPdf", "activo");

  try {
    const { PDFDocument, rgb, StandardFonts } = PDFLib;

    const pdfBytes = await cargarPdfBaseCip();

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pagina = pdfDoc.getPages()[0];

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const negro = rgb(0, 0, 0);

    function escribir(texto, x, y, size = 8, bold = false) {
      if (!texto) return;

      pagina.drawText(String(texto), {
        x,
        y,
        size,
        font: bold ? fontBold : font,
        color: negro
      });
    }

    function escribirConPosicion(texto, posicion) {
      if (!posicion) return;
      escribir(
        cortarTexto(String(texto || "").toUpperCase(), posicion.max || 60),
        posicion.x,
        posicion.y,
        posicion.size || 8,
        posicion.bold || false
      );
    }

    function escribirCampo(clave, texto, posicionDefecto, convertirMayuscula = true) {
      const posicion = obtenerPosicionPdf(clave, posicionDefecto);
      const valor = convertirMayuscula ? String(texto || "").toUpperCase() : String(texto || "");
      escribirConPosicion(valor, posicion);
    }

    const nombre = obtenerValor("nombre");
    const rut = obtenerValor("rut");
    const email = obtenerValor("email");
    const telefono = obtenerValor("telefono");
    const zona = obtenerValor("zona");

    const calle = obtenerValor("calle");
    const numero = obtenerValor("numero");
    const depto = obtenerValor("depto");
    const block = obtenerValor("block");
    const manzana = obtenerValor("manzana");
    const lote = obtenerValor("lote");
    const localidad = obtenerValor("localidad");
    const planoLoteo = obtenerValor("planoLoteo");
    const rolSii = obtenerValor("rolSii");

    const latitud = obtenerValor("latitud");
    const longitud = obtenerValor("longitud");

    const municipalidad = obtenerConfigDom("municipalidad", "");
    const region = obtenerConfigDom("region", "");

    const posMunicipalidadSuperior = obtenerPosicionPdf("municipalidadSuperior", { x: 270, y: 820, size: 9, bold: true, max: 42 });
    const posRegionSuperior = obtenerPosicionPdf("regionSuperior", { x: 212, y: 789, size: 7, bold: false, max: 60 });
    const posMunicipalidadComprobante = obtenerPosicionPdf("municipalidadComprobante", { x: 255, y: 190, size: 9, bold: true, max: 35 });

    /* Datos superiores configurables */
    escribirConPosicion(municipalidad, posMunicipalidadSuperior);
    escribirConPosicion(region, posRegionSuperior);

    /* Marcar urbano / rural */
    if (zona === "urbano") {
      const posMarcaUrbano = obtenerPosicionPdf("marcaUrbano", { x: 209, y: 754, size: 13, bold: true, max: 1 });
      escribir("X", posMarcaUrbano.x, posMarcaUrbano.y, posMarcaUrbano.size || 13, posMarcaUrbano.bold !== false);
    }

    if (zona === "rural") {
      const posMarcaRural = obtenerPosicionPdf("marcaRural", { x: 307, y: 754, size: 13, bold: true, max: 1 });
      escribir("X", posMarcaRural.x, posMarcaRural.y, posMarcaRural.size || 13, posMarcaRural.bold !== false);
    }

    /* 1. Identificación del solicitante */
    escribirCampo("nombre", nombre, { x: 60, y: 667, size: 8, bold: false, max: 55 });
    escribirCampo("rut", rut, { x: 338, y: 667, size: 8, bold: false, max: 20 });
    escribirCampo("email", email, { x: 60, y: 647, size: 8, bold: false, max: 35 }, false);
    escribirCampo("telefono", telefono, { x: 238, y: 647, size: 8, bold: false, max: 18 }, false);

    /* 2. Dirección de la propiedad */
    escribirCampo("calle", calle, { x: 60, y: 611, size: 8, bold: false, max: 55 });
    escribirCampo("numero", numero, { x: 356, y: 611, size: 8, bold: false, max: 12 });
    escribirCampo("depto", depto, { x: 432, y: 611, size: 8, bold: false, max: 12 });
    escribirCampo("block", block, { x: 512, y: 611, size: 8, bold: false, max: 12 });

    escribirCampo("manzana", manzana, { x: 60, y: 585, size: 8, bold: false, max: 12 });
    escribirCampo("lote", lote, { x: 120, y: 585, size: 8, bold: false, max: 12 });
    escribirCampo("localidad", localidad, { x: 180, y: 585, size: 8, bold: false, max: 35 });
    escribirCampo("planoLoteo", planoLoteo, { x: 412, y: 585, size: 8, bold: false, max: 18 });
    escribirCampo("rolSii", rolSii, { x: 512, y: 585, size: 8, bold: false, max: 18 });

    /* 3. Croquis de ubicación */
    const capturaInfo = await capturarMapaParaPdf();
    const imagenMapa  = await pdfDoc.embedPng(capturaInfo.imagen);

    const posMapa = obtenerPosicionPdf("mapa", { x: 55, y: 305, width: 529, height: 259 });
    pagina.drawImage(imagenMapa, {
      x: posMapa.x,
      y: posMapa.y,
      width: posMapa.width,
      height: posMapa.height
    });

    /* Coordenadas GPS sobre el croquis en formato DMS */
    if (latitud && longitud) {
      const textoCoord = decimalADMS(Number(latitud), Number(longitud));
      escribirCampo("coordenadas", textoCoord, { x: 65, y: 312, size: 8, bold: true, max: 80 }, false);
    }

    /* Dibujar polígono de deslindes directamente sobre el PDF ──────── */
    const limitesJson = obtenerValor("limitesPropiedad");
    if (limitesJson && capturaInfo.bounds) {
      try {
        const geojson  = JSON.parse(limitesJson);
        const feature  = geojson.features?.[0];
        const bounds   = capturaInfo.bounds;

        if (feature && bounds) {
          const swLat = bounds.getSouth();
          const neLat = bounds.getNorth();
          const swLng = bounds.getWest();
          const neLng = bounds.getEast();

          /* Proyectar lat/lng → coordenadas PDF dentro del área del mapa */
          function geo2pdf(lat, lng) {
            const xR = (lng - swLng) / (neLng - swLng);
            const yR = (lat - swLat) / (neLat - swLat);
            return {
              x: posMapa.x + xR * posMapa.width,
              y: posMapa.y + yR * posMapa.height
            };
          }

          const anillo = feature.geometry.coordinates[0];
          const rojo   = rgb(0.9, 0.15, 0.2);

          /* Dibujar cada segmento del polígono */
          for (let i = 0; i < anillo.length - 1; i++) {
            const p1 = geo2pdf(anillo[i][1],   anillo[i][0]);
            const p2 = geo2pdf(anillo[i+1][1], anillo[i+1][0]);
            pagina.drawLine({ start: p1, end: p2, thickness: 2, color: rojo, opacity: 0.92 });
          }

          /* Vértices como puntos pequeños */
          for (let i = 0; i < anillo.length - 1; i++) {
            const p = geo2pdf(anillo[i][1], anillo[i][0]);
            pagina.drawCircle({ x: p.x, y: p.y, size: 3, color: rojo, opacity: 0.9 });
          }

        }
      } catch (_) { /* ignorar si el GeoJSON falla */ }
    }

    /* Fecha y hora de generación del formulario */
    const ahoraGen = new Date();
    const fechaGen = ahoraGen.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
    const horaGen  = ahoraGen.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
    const textoFecha = `Generado: ${fechaGen}  ${horaGen} hrs.`;
    const posFecha = obtenerPosicionPdf("fechaGeneracionPdf", { x: 400, y: 730, size: 7.5, bold: true, max: 45 });
    escribir(textoFecha, posFecha.x, posFecha.y, posFecha.size || 7.5, posFecha.bold === true);

    /* Registro de consentimiento en el PDF */
    const cfgConsent = obtenerConfigDom("consentimiento", {});
    if (cfgConsent.registrarEnPdf && document.getElementById("consentimientoDatos")?.checked) {
      const ahora = new Date();
      const fechaHora = ahora.toLocaleDateString("es-CL") + " " + ahora.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
      const datosConsent = Array.isArray(cfgConsent.datosPersonales) && cfgConsent.datosPersonales.length
        ? cfgConsent.datosPersonales.join(", ")
        : "datos personales";
      const textoConsent = `El solicitante autorizó el tratamiento de sus datos (${datosConsent}) el ${fechaHora} hrs.`;
      const posConsent = obtenerPosicionPdf("consentimientoPdf", { x: 55, y: 95, size: 6.5, bold: false, max: 120 });
      escribir(textoConsent, posConsent.x, posConsent.y, posConsent.size || 6.5, posConsent.bold === true);
    }

    /* Aviso de documento de preparación */
    const avisoPrep = cfgConsent.avisoPreparacion;
    if (avisoPrep) {
      const posAviso = obtenerPosicionPdf("avisoPreparacionPdf", { x: 55, y: 75, size: 6, bold: true, max: 145 });
      escribir(avisoPrep, posAviso.x, posAviso.y, posAviso.size || 6, posAviso.bold === true);
    }

    const pdfFinal = await pdfDoc.save();

    const blob = new Blob([pdfFinal], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);

    if (imprimir) {
      const ventana = window.open(url, "_blank");
      if (ventana) {
        ventana.onload = function () {
          ventana.print();
          URL.revokeObjectURL(url);
          setTimeout(limpiarFormulario, 1500);
        };
      }
    } else {
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `formulario_cip_${Date.now()}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      setTimeout(function () {
        URL.revokeObjectURL(url);
        limpiarFormulario();
      }, 1500);
    }

  } catch (error) {
    console.error(error);
    alert("No se pudo generar el PDF. Revise la ruta del PDF base en municipio_config.json y confirme que el archivo exista en img/Doc.");
  }
}

function limpiarFormulario() {
  /* Campos de texto y ocultos */
  const campos = [
    "nombre", "rut", "email", "telefono",
    "calle", "numero", "depto", "block",
    "manzana", "lote", "localidad", "planoLoteo", "rolSii",
    "latitud", "longitud", "limitesPropiedad"
  ];
  campos.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.value = "";
      el.style.borderColor = "";
      el.setCustomValidity("");
    }
  });

  /* Campo de búsqueda del mapa */
  const inputBuscar = document.getElementById("buscarDireccion");
  if (inputBuscar) inputBuscar.value = "";

  /* Mensajes de validación de RUT y teléfono */
  ["rutMensaje", "telefonoMensaje"].forEach(function (id) {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });

  /* Select y checkboxes */
  const zona = document.getElementById("zona");
  if (zona) zona.selectedIndex = 0;

  const sinNum = document.getElementById("sinNumero");
  if (sinNum) sinNum.checked = false;

  const consent = document.getElementById("consentimientoDatos");
  if (consent) consent.checked = false;

  /* Panel de zona detectada */
  const panelZona = document.getElementById("zonaDetectadaPanel");
  if (panelZona) panelZona.style.display = "none";

  /* Textos de estado */
  const coordTexto = document.getElementById("coordenadasTexto");
  if (coordTexto) coordTexto.textContent = "Aún no se ha seleccionado una ubicación.";

  /* Marcador y polígono del mapa */
  if (marcadorPredio && mapaPredio) {
    mapaPredio.removeLayer(marcadorPredio);
    marcadorPredio = null;
  }
  if (drawnItems) drawnItems.clearLayers();

  /* Mini-mapa de deslindes */
  actualizarInfoLimites(null);

  /* Indicadores de paso */
  actualizarPaso("pasoUbicacion", "activo");
  actualizarPaso("pasoFormulario", "");
  actualizarPaso("pasoPdf", "");
  actualizarEstadoFlujo();
}


/* OPCIÓN PREDIO SIN NÚMERO / S.N. */

function activarOpcionSinNumero() {
  const inputNumero = document.getElementById("numero");
  const checkSinNumero = document.getElementById("sinNumero");

  if (!inputNumero || !checkSinNumero) return;

  checkSinNumero.addEventListener("change", function () {
    if (this.checked) {
      inputNumero.value = "S/N";
      inputNumero.readOnly = true;
    } else {
      if (inputNumero.value.trim().toUpperCase() === "S/N") {
        inputNumero.value = "";
      }

      inputNumero.readOnly = false;
      inputNumero.focus();
    }
  });
}

/* ─────────────────────────────────────────────────────────────
   ARRANQUE
   Lee municipio_config.json (único archivo que cada municipio
   debe editar), construye window.DOM_CONFIG y luego inicializa
   toda la aplicación.
   Si el JSON no está disponible (ej. prueba con doble clic),
   el script sigue funcionando con los valores por defecto.
   ➜ Para personalizar: edite solo municipio_config.json
───────────────────────────────────────────────────────────── */
function mapearJsonAConfig(json) {
  const m   = json.municipalidad || {};
  const map = json.mapa          || {};
  const pdf = json.pdf           || {};

  return {
    /* Identificación */
    municipalidad:           m.nombre        || "",
    municipalidadCompleta:   m.nombreCompleto || m.nombre || "",
    region:                  m.region        || "",
    regionCompleta:          m.regionCompleta || m.region || "",
    heroImagen:              m.heroImagen    || "",
    logotipo:                m.logotipo      || "",
    contacto:                m.contacto      || {},

    /* Mapa */
    comunaBusqueda:          map.comunaBusqueda          || "",
    regionBusqueda:          map.regionBusqueda          || "",
    paisBusqueda:            map.paisBusqueda            || "Chile",
    codigoPais:              map.codigoPais              || "cl",
    centroMapa:              map.centroMapa              || [-33.45, -70.67],
    zoomInicial:             map.zoomInicial             || 14,
    zoomBusqueda:            map.zoomBusqueda            || 17,
    viewboxBusqueda:         map.viewboxBusqueda         || "",
    boundedBusqueda:         map.boundedBusqueda         || false,
    localidadPredeterminada: map.localidadPredeterminada || "",
    zonaPredeterminada:      map.zonaPredeterminada      || "",

    /* Hero */
    hero: json.hero || {},

    /* Certificados */
    certificados: Array.isArray(json.certificados) ? json.certificados : [],

    /* Formulario */
    formulario: json.formulario || {},

    /* Consentimiento */
    consentimiento: json.consentimiento || {},

    /* PDF */
    rutasPdfCip:  pdf.rutaBase ? [pdf.rutaBase] : ["./img/Doc/cip_base.pdf"],
    posicionesPdf: pdf.posiciones || {}
  };
}

function inicializarHero() {
  const h = obtenerConfigDom("hero", {});
  if (!h.titulo) return;

  const set = (id, val) => { const el = document.getElementById(id); if (el && val) el.textContent = val; };

  set("heroEyebrow",    h.eyebrow);
  set("heroTitulo",     h.titulo);
  set("heroSubtitulo",  h.subtitulo);
  const desc = document.getElementById("heroDescripcion");
  if (desc && h.descripcion) {
    if (Array.isArray(h.descripcion)) {
      desc.innerHTML = h.descripcion.map(l => `<span>${escaparHtml(l)}</span>`).join("<br>");
    } else {
      desc.textContent = h.descripcion;
    }
  }

  const boton = document.getElementById("heroBoton");
  if (boton) {
    if (h.botonTexto) boton.textContent = h.botonTexto;
    if (h.botonUrl)   boton.href        = h.botonUrl;
  }

  const contenedor = document.getElementById("heroIndicadores");
  if (contenedor && Array.isArray(h.indicadores)) {
    contenedor.innerHTML = h.indicadores.map(ind => `
      <div class="indicator-card">
        <div class="indicator-icon">${escaparHtml(ind.icono || "")}</div>
        <div>
          <strong>${escaparHtml(ind.titulo || "")}</strong>
          <p>${escaparHtml(ind.descripcion || "")}</p>
        </div>
      </div>`).join("");
  }

  const heroImagen = obtenerConfigDom("heroImagen", "");
  if (heroImagen) {
    const seccionHero = document.querySelector(".hero");
    if (seccionHero) {
      seccionHero.style.backgroundImage = [
        "linear-gradient(90deg, rgba(15,60,104,0.85) 0%, rgba(15,60,104,0.7) 40%, rgba(15,60,104,0.4) 70%, rgba(15,60,104,0.2) 100%)",
        `url("${heroImagen}")`
      ].join(", ");
    }
  }
}

function inicializarLogo() {
  const logotipo = obtenerConfigDom("logotipo", "");
  const nombre   = obtenerConfigDom("municipalidadCompleta", "");
  const sitioWeb = obtenerConfigDom("contacto", {}).sitioWeb || "";

  const img    = document.querySelector(".brand-logo-img");
  const enlace = document.querySelector(".brand");

  if (img && logotipo) {
    img.src = logotipo;
    if (nombre) img.alt = nombre;
  }
  if (enlace && sitioWeb) {
    enlace.href = sitioWeb;
  }
}

function iniciarApp() {
  inicializarHero();
  inicializarLogo();
  inicializarFormulario();
  crearAcordeon();

  document.querySelectorAll(".faq-question").forEach((button) => {
    button.addEventListener("click", () => {
      button.parentElement.classList.toggle("active");
    });
  });

  iniciarMapaPredio();
  actualizarEstadoFlujo();
  activarValidacionNombre();
  activarValidacionRut();
  activarValidacionTelefono();
  activarValidacionNumero();
  activarOpcionSinNumero();
  inicializarConsentimiento();

  const btnBuscar = document.getElementById("btnBuscarMapa");
  if (btnBuscar) btnBuscar.addEventListener("click", buscarDireccionEnMapa);

  const inputBuscar = document.getElementById("buscarDireccion");
  if (inputBuscar) {
    inputBuscar.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); buscarDireccionEnMapa(); }
    });
  }

  const btnGuardar = document.getElementById("btnGuardarDatos");
  if (btnGuardar) {
    btnGuardar.addEventListener("click", function () {
      if (!validarFormularioCip()) return;
      actualizarPaso("pasoFormulario", "completado");
      actualizarPaso("pasoPdf", "activo");
      alert("Datos preparados correctamente. Ahora puede descargar o imprimir el formulario PDF.");
    });
  }

  const btnConfirmar = document.getElementById("btnConfirmarUbicacion");
  if (btnConfirmar) btnConfirmar.addEventListener("click", irAlFormularioDespuesDeUbicacion);

  const btnLimpiarLimites = document.getElementById("btnLimpiarLimites");
  if (btnLimpiarLimites) {
    btnLimpiarLimites.addEventListener("click", function () {
      if (drawnItems) drawnItems.clearLayers();
      const campo = document.getElementById("limitesPropiedad");
      if (campo) campo.value = "";
      actualizarInfoLimites(null);
    });
  }

  const btnPdf = document.getElementById("btnGenerarPdf");
  if (btnPdf) btnPdf.addEventListener("click", () => generarPdfCip(false));

  const btnImprimir = document.getElementById("btnImprimirPdf");
  if (btnImprimir) btnImprimir.addEventListener("click", () => generarPdfCip(true));
}

(async function cargarConfiguracion() {
  try {
    const resp = await fetch("./municipio_config.json");
    if (!resp.ok) throw new Error("No se pudo cargar municipio_config.json");
    const json = await resp.json();
    window.DOM_CONFIG = mapearJsonAConfig(json);
    certificados = window.DOM_CONFIG.certificados;
  } catch (e) {
    console.warn("municipio_config.json no encontrado o inválido. Usando valores por defecto.", e);
    window.DOM_CONFIG = window.DOM_CONFIG || {};
    certificados = window.DOM_CONFIG.certificados || [];
  }
  iniciarApp();
})();

function escaparHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inicializarFormulario() {
  const cfg = obtenerConfigDom("formulario", {});
  const campos = cfg.campos || {};

  Object.entries(campos).forEach(([id, campo]) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (campo.placeholder !== undefined && "placeholder" in el) {
      el.placeholder = campo.placeholder;
    }

    if (campo.label) {
      const formGroup = el.closest(".form-group");
      if (!formGroup) return;

      if (el.type === "checkbox") {
        const wrapper = el.parentElement;
        if (wrapper && wrapper.tagName === "LABEL") {
          Array.from(wrapper.childNodes)
            .filter(n => n.nodeType === 3)
            .forEach(n => n.remove());
          wrapper.appendChild(document.createTextNode("\n" + campo.label));
        }
      } else {
        const labelEl = formGroup.querySelector("label:not(.check-sn)");
        if (labelEl) labelEl.textContent = campo.label;
      }
    }
  });

  const h3s = document.querySelectorAll("#solicitudForm h3");
  if (cfg.tituloSolicitante && h3s[0]) h3s[0].textContent = cfg.tituloSolicitante;
  if (cfg.tituloPropiedad && h3s[1]) h3s[1].textContent = cfg.tituloPropiedad;
  if (cfg.ayudaPropiedad) {
    const ayuda = document.querySelector(".aviso-autocompletado");
    if (ayuda) ayuda.textContent = cfg.ayudaPropiedad;
  }
}

function inicializarConsentimiento() {
  const contenedor = document.getElementById("consentimientoContainer");
  if (!contenedor) return;

  const cfg = obtenerConfigDom("consentimiento", {});
  if (!cfg.textoConsentimiento) return;

  const municipalidad = obtenerConfigDom("municipalidadCompleta", "la Municipalidad");

  const listaHtml = Array.isArray(cfg.datosPersonales) && cfg.datosPersonales.length
    ? `<ul class="consent-datos-list">${cfg.datosPersonales.map(d => `<li>${escaparHtml(d)}</li>`).join("")}</ul>`
    : "";

  const texto = cfg.textoConsentimiento
    .replace("{municipalidad}", escaparHtml(municipalidad));

  const linkHref  = escaparHtml(cfg.linkLey    || "#");
  const linkTexto = escaparHtml(cfg.textoLinkLey || "normativa vigente");

  contenedor.innerHTML = `
    <div class="form-group consent-group">
      <label class="consent-label">
        <input type="checkbox" id="consentimientoDatos">
        <span>
          ${texto}
          ${listaHtml}
          <a href="${linkHref}" target="_blank" rel="noopener">${linkTexto}</a>.
        </span>
      </label>
    </div>`;

  document.getElementById("consentimientoDatos")
    .addEventListener("change", actualizarEstadoFlujo);
}
