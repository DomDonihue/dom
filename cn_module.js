/* ================================================================
   MÓDULO CERTIFICADO DE NÚMERO — DOM DOÑIHUE
   Busca en historico.json y genera el certificado o envía a DOM
================================================================ */
(function () {
  "use strict";

  const DOM_EMAIL = "dom@mdonihue.cl";
  const DIRECTOR  = "Rodrigo Calderón Peralta";
  const CARGO     = "Director de Obras Municipales";
  const MUNICIPIO = "Doñihue";
  const REGION    = "del Libertador General Bernardo O'Higgins";
  const DIRECCION_DOM = "Av. Estación N° 344 — Fono: 72 2 959203";

  let DATOS = null;
  let RESULTADOS = [];

  /* ── UTILIDADES ──────────────────────────────────────── */
  function normalizar(s) {
    if (!s) return "";
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
            .toLowerCase().replace(/\s+/g, " ").trim();
  }

  function normalRol(s) {
    return (s || "").replace(/\s/g, "").toLowerCase();
  }

  function fechaHoy() {
    return new Date().toLocaleDateString("es-CL", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });
  }

  const MESES = ["enero","febrero","marzo","abril","mayo","junio",
                 "julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const UNIDADES = ["","un","dos","tres","cuatro","cinco","seis","siete",
                    "ocho","nueve","diez","once","doce","trece","catorce",
                    "quince","dieciséis","diecisiete","dieciocho","diecinueve",
                    "veinte","veintiún","veintidós","veintitrés","veinticuatro",
                    "veinticinco","veintiséis","veintisiete","veintiocho","veintinueve",
                    "treinta","treinta y uno"];

  function diaEnLetras(d) { return UNIDADES[d] || String(d); }

  const DECENAS = {2:"dos",3:"tres",4:"cuatro",5:"cinco",6:"seis",7:"siete",8:"ocho",9:"nueve"};
  function anioEnLetras(y) {
    const miles = Math.floor(y / 1000);
    const resto = y % 1000;
    const c = Math.floor(resto / 100);
    const dc = resto % 100;
    const centenas = ["","cien","doscientos","trescientos","cuatrocientos","quinientos",
                      "seiscientos","setecientos","ochocientos","novecientos"];
    let s = (miles > 1 ? UNIDADES[miles] + " mil" : "dos mil");
    if (c) s += " " + centenas[c];
    if (dc <= 30) { if (dc) s += " " + UNIDADES[dc]; }
    else {
      const d = Math.floor(dc/10), u = dc%10;
      s += " " + DECENAS[d] + (u ? " y " + UNIDADES[u] : "");
    }
    return s.trim();
  }

  function fechaEnLetras(dateStr) {
    const [d, m, y] = dateStr.split("/").map(Number);
    return `${diaEnLetras(d)} días del mes de ${MESES[m-1]} del año ${anioEnLetras(y)}`;
  }

  function extraerCalleNumero(dir) {
    if (!dir) return { calle: "", numero: "S/N" };
    const match = dir.match(/N[°o]?\s*(\d+)/i);
    const numero = match ? match[1] : "S/N";
    const calle  = dir.replace(/N[°o]?\s*\d+/i, "").replace(/[-,]+$/, "").trim();
    return { calle: calle || dir, numero };
  }

  function genSolicitudN() {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}${String(now.getHours()).padStart(2,"0")}${String(now.getMinutes()).padStart(2,"0")}`;
  }

  /* ── BÚSQUEDA ─────────────────────────────────────────── */
  function buscar(termino) {
    if (!DATOS) return [];
    const t = normalizar(termino);
    if (!t || t.length < 2) return [];

    const tRol = normalRol(termino);
    const resultado = [];

    for (const rec of DATOS.registros) {
      let score = 0;
      const nRol = normalRol(rec.r);
      if (rec.r && (nRol === tRol || nRol.includes(tRol))) {
        score = nRol === tRol ? 100 : 60;
      } else {
        const nNom = normalizar(rec.n);
        const nDir = normalizar(rec.d);
        if (nNom.includes(t)) score = 40;
        else if (nDir.includes(t)) score = 30;
      }
      if (score > 0) resultado.push({ score, rec });
    }

    resultado.sort((a, b) => b.score - a.score);
    return resultado.slice(0, 30).map(x => x.rec);
  }

  /* ── GENERACIÓN CERTIFICADO ───────────────────────────── */
  function generarCertificado(rec, form) {
    const hoy = fechaHoy();
    const { calle, numero } = extraerCalleNumero(rec.d || form.direccion);
    const localidad  = form.localidad  || "Doñihue";
    const manzana    = form.manzana    || "—";
    const lote       = form.lote       || "—";
    const rol        = rec.r           || form.rol || "—";
    const solN       = genSolicitudN();
    const fLetras    = fechaEnLetras(hoy);
    const zona       = form.zona === "rural" ? "RURAL" : "URBANO";
    const checkUrb   = zona === "URBANO" ? "☑" : "☐";
    const checkRur   = zona === "RURAL"  ? "☑" : "☐";
    const nombre     = form.solicitante || "";
    const esVerif    = rec._verificado  ? "✔ Datos verificados en Matriz DOM" : "";

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Certificado de Número — ${MUNICIPIO}</title>
<style>
  @page { size: Letter; margin: 18mm 20mm 18mm 20mm; }
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;color:#000;background:#fff}
  .cn-wrap{width:100%;max-width:700px;margin:0 auto;padding:8px 0}
  .cn-form-label{font-size:7pt;color:#555;text-align:right;display:block}
  .cn-title-area{border:2px solid #000;padding:6px 10px;margin-bottom:6px}
  .cn-title-row{display:flex;align-items:center;gap:10px}
  .cn-escudo img{height:60px}
  .cn-titles{flex:1;text-align:center}
  .cn-titles h1{font-size:11pt;font-weight:bold;letter-spacing:1px;margin-bottom:2px}
  .cn-titles h2{font-size:9pt;margin-bottom:2px}
  .cn-titles .form-code{font-size:7.5pt;color:#444}
  .cn-meta{display:flex;gap:0;border:1px solid #000;margin-bottom:6px}
  .cn-meta-cell{flex:1;border-right:1px solid #000;padding:3px 6px}
  .cn-meta-cell:last-child{border-right:none}
  .cn-meta-cell .lbl{font-size:7pt;color:#555;display:block}
  .cn-meta-cell .val{font-size:9pt;font-weight:bold}
  .cn-zona-row{display:flex;align-items:center;gap:20px;margin-bottom:6px;font-size:9.5pt;font-weight:bold}
  .cn-body-box{border:1px solid #000;padding:8px 10px;margin-bottom:6px;min-height:80px}
  .cn-body-box p{font-size:10pt;line-height:1.7}
  .cn-field{border-bottom:1px solid #000;display:inline-block;min-width:120px;font-weight:bold}
  .cn-field.wide{min-width:200px}
  .cn-field.narrow{min-width:60px}
  .cn-notice{font-size:8.5pt;font-style:italic;margin-top:6px;line-height:1.5;color:#333}
  .cn-vigencia{font-size:9pt;font-weight:bold;text-align:center;border:1px solid #000;padding:4px;margin-bottom:8px}
  .cn-firma-row{display:flex;justify-content:flex-end;margin-top:12px}
  .cn-firma-box{text-align:center;width:240px}
  .cn-firma-line{border-top:1px solid #000;margin-bottom:4px;width:100%}
  .cn-firma-name{font-size:10pt;font-weight:bold}
  .cn-firma-cargo{font-size:8.5pt}
  .cn-footer{font-size:7.5pt;text-align:center;color:#555;margin-top:10px;border-top:1px solid #ccc;padding-top:4px}
  .cn-verif{font-size:7.5pt;color:#1a5a1a;background:#e8f5e9;border:1px solid #a5d6a7;padding:3px 7px;border-radius:3px;display:inline-block;margin-bottom:4px}
  .cn-aviso{font-size:7.5pt;background:#fff8e1;border:1px solid #ffe082;padding:3px 7px;border-radius:3px;margin-bottom:6px}
  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .no-print{display:none!important}
  }
</style>
</head>
<body>
<div class="cn-wrap">

  <div class="no-print" style="background:#1f4e79;color:#fff;padding:10px 14px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;border-radius:6px">
    <div>
      <strong>Certificado de Número — Previsualización</strong>
      ${esVerif ? `<span style="margin-left:10px;background:#2e7d32;padding:2px 8px;border-radius:4px;font-size:12px">${esVerif}</span>` : ""}
    </div>
    <div style="display:flex;gap:8px">
      <button onclick="window.print()" style="background:#fff;color:#1f4e79;border:none;padding:7px 14px;border-radius:5px;font-weight:bold;cursor:pointer">🖨 Imprimir</button>
      <button onclick="window.close()" style="background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.4);padding:7px 14px;border-radius:5px;cursor:pointer">✕ Cerrar</button>
    </div>
  </div>

  ${esVerif ? `<div class="cn-verif no-print">${esVerif}</div>` : ""}
  <div class="cn-aviso no-print">⚠ Este documento es referencial. Para su validez oficial debe ser firmado y timbrado por el Director de Obras Municipales.</div>

  <span class="cn-form-label">FORMULARIO 5.5. (C.N. — 1.4.4./130)</span>

  <div class="cn-title-area">
    <div class="cn-title-row">
      <div class="cn-titles">
        <h1>CERTIFICADO DE NÚMERO</h1>
        <h2>DIRECCIÓN DE OBRAS — I. MUNICIPALIDAD DE ${MUNICIPIO.toUpperCase()}</h2>
        <div class="form-code">REGIÓN ${REGION.toUpperCase()}</div>
      </div>
    </div>
  </div>

  <div class="cn-meta">
    <div class="cn-meta-cell">
      <span class="lbl">CERTIFICADO N°</span>
      <span class="val">________________</span>
    </div>
    <div class="cn-meta-cell">
      <span class="lbl">SOLICITUD N°</span>
      <span class="val">${solN}</span>
    </div>
    <div class="cn-meta-cell">
      <span class="lbl">FECHA</span>
      <span class="val">${hoy}</span>
    </div>
  </div>

  <div class="cn-meta" style="margin-bottom:6px">
    <div class="cn-meta-cell">
      <span class="lbl">PAGO DE DERECHOS N°</span>
      <span class="val">________________</span>
    </div>
    <div class="cn-meta-cell">
      <span class="lbl">GIRO DE INGRESO MUNICIPAL FECHA</span>
      <span class="val">________________</span>
    </div>
    <div class="cn-meta-cell">
      <span class="lbl">TOTAL DERECHOS (Art. 130 N°9 L.G.U.C.)</span>
      <span class="val">$ ________________</span>
    </div>
  </div>

  <div class="cn-zona-row">
    ${checkUrb} URBANO &nbsp;&nbsp; ${checkRur} RURAL
  </div>

  <div class="cn-body-box">
    <p>
      El Director de Obras Municipales que suscribe certifica que al predio ubicado en calle / camino
      <span class="cn-field wide">&nbsp;${calle}&nbsp;</span>,
      correspondiente al lote N°
      <span class="cn-field narrow">&nbsp;${lote}&nbsp;</span>
      de la manzana
      <span class="cn-field narrow">&nbsp;${manzana}&nbsp;</span>,
      localidad o loteo
      <span class="cn-field">&nbsp;${localidad}&nbsp;</span>,
      Rol de Avalúo SII N°
      <span class="cn-field">&nbsp;${rol}&nbsp;</span>,
      le ha sido asignado el número:
    </p>
    <p style="font-size:20pt;font-weight:bold;text-align:center;letter-spacing:4px;margin:10px 0">
      ${numero}
    </p>
    <p class="cn-notice">
      Se extiende el presente certificado a petición de
      <span class="cn-field">&nbsp;${nombre}&nbsp;</span>
      para ser presentado con los fines que estime conveniente.
    </p>
    <p class="cn-notice">
      Emitido en ${MUNICIPIO}, a ${fLetras}. —
    </p>
  </div>

  <div class="cn-vigencia">VIGENCIA DEL CERTIFICADO: DOCE MESES</div>

  <div class="cn-firma-row">
    <div class="cn-firma-box">
      <div class="cn-firma-line"></div>
      <div class="cn-firma-name">${DIRECTOR}</div>
      <div class="cn-firma-cargo">${CARGO}</div>
      <div class="cn-firma-cargo">RCP/msn</div>
    </div>
  </div>

  <div style="font-size:8pt;margin-top:8px;color:#555">C.c. Archivo D.O.M.</div>

  <div class="cn-footer">
    I. Municipalidad de ${MUNICIPIO} — Dirección de Obras Municipales<br>
    ${DIRECCION_DOM}
  </div>

</div>
</body></html>`;

    const win = window.open("", "_blank", "width=820,height=900,scrollbars=yes");
    if (win) {
      win.document.write(html);
      win.document.close();
    } else {
      alert("El navegador bloqueó la ventana emergente. Permita las ventanas emergentes para esta página.");
    }
  }

  /* ── FORMULARIO EMAIL ─────────────────────────────────── */
  function enviarCorreo(form) {
    const asunto = encodeURIComponent(`Solicitud Certificado de Número — ROL ${form.rol || "sin ROL"} — ${form.solicitante}`);
    const cuerpo = encodeURIComponent(
`Estimados profesionales de la DOM,

Se recibió una solicitud de Certificado de Número a través de DOMVecino que NO fue encontrada en la Matriz de registros históricos.

DATOS DEL SOLICITANTE
─────────────────────
Nombre:    ${form.solicitante}
Teléfono:  ${form.telefono || "no indicado"}
Correo:    ${form.email || "no indicado"}

DATOS DEL PREDIO
────────────────
ROL SII:     ${form.rol || "no indicado"}
Dirección:   ${form.direccion}
Manzana:     ${form.manzana || "no indicada"}
Lote:        ${form.lote || "no indicado"}
Localidad:   ${form.localidad || "Doñihue"}
Zona:        ${form.zona || "no indicada"}

Fecha solicitud: ${fechaHoy()}

Por favor proceder con la verificación y emisión del certificado correspondiente.

─────────────────────────────────────────
Mensaje generado automáticamente por DOMVecino
Portal DOM Municipalidad de Doñihue`);

    window.location.href = `mailto:${DOM_EMAIL}?subject=${asunto}&body=${cuerpo}`;
  }

  /* ── RENDERIZADO RESULTADOS ───────────────────────────── */
  function renderResultados(resultados, contenedor) {
    if (!resultados.length) {
      contenedor.innerHTML = `
        <div class="cn-sin-resultado">
          <div class="cn-sin-icono">🔍</div>
          <p><strong>No se encontraron registros en la Matriz DOM</strong></p>
          <p>El predio no tiene antecedentes en nuestra base de datos. La solicitud será derivada a los profesionales de la DOM para su revisión.</p>
        </div>`;
      return;
    }

    const items = resultados.slice(0, 10).map((r, i) => `
      <div class="cn-resultado-item ${i === 0 ? "cn-resultado-primero" : ""}" data-idx="${i}">
        <div class="cn-resultado-meta">
          <span class="cn-chip cn-chip-fecha">${r.f || "s/f"}</span>
          <span class="cn-chip cn-chip-materia">${r.m || "—"}</span>
          ${r.r ? `<span class="cn-chip cn-chip-rol">ROL ${r.r}</span>` : ""}
        </div>
        <div class="cn-resultado-nombre">${r.n}</div>
        <div class="cn-resultado-dir">${r.d || "Dirección no registrada"}</div>
        ${r.rec ? `<div class="cn-resultado-rec">Recepción: ${r.rec}</div>` : ""}
      </div>`).join("");

    contenedor.innerHTML = `
      <div class="cn-resultado-header">
        <span class="cn-verif-badge">✔ ${resultados.length} registro${resultados.length > 1 ? "s" : ""} encontrado${resultados.length > 1 ? "s" : ""} en Matriz DOM</span>
        ${resultados.length > 1 ? "<small>Selecciona el registro que corresponde a tu predio:</small>" : ""}
      </div>
      <div class="cn-lista-resultados">${items}</div>`;

    contenedor.querySelectorAll(".cn-resultado-item").forEach(el => {
      el.addEventListener("click", () => {
        contenedor.querySelectorAll(".cn-resultado-item").forEach(x => x.classList.remove("cn-seleccionado"));
        el.classList.add("cn-seleccionado");
        const idx = parseInt(el.dataset.idx);
        RESULTADOS._seleccionado = { ...resultados[idx], _verificado: true };
        document.getElementById("cn-btn-generar").disabled = false;
      });
    });

    if (resultados.length === 1) {
      contenedor.querySelector(".cn-resultado-item").click();
    }
  }

  /* ── INICIALIZACIÓN ───────────────────────────────────── */
  function init() {
    const seccion = document.getElementById("certificado-numero");
    if (!seccion) return;

    const inputBusqueda  = document.getElementById("cn-busqueda");
    const btnBuscar      = document.getElementById("cn-btn-buscar");
    const contenedorRes  = document.getElementById("cn-resultados");
    const btnGenerar     = document.getElementById("cn-btn-generar");
    const btnCorreo      = document.getElementById("cn-btn-correo");
    const formSolic      = document.getElementById("cn-form-solicitante");
    const statusMsg      = document.getElementById("cn-status");

    function getFormData() {
      return {
        solicitante: (document.getElementById("cn-nombre")?.value || "").trim(),
        telefono:    (document.getElementById("cn-telefono")?.value || "").trim(),
        email:       (document.getElementById("cn-email")?.value || "").trim(),
        rol:         (document.getElementById("cn-rol")?.value || "").trim(),
        direccion:   (document.getElementById("cn-direccion")?.value || "").trim(),
        manzana:     (document.getElementById("cn-manzana")?.value || "").trim(),
        lote:        (document.getElementById("cn-lote")?.value || "").trim(),
        localidad:   (document.getElementById("cn-localidad")?.value || "Doñihue").trim(),
        zona:        (document.getElementById("cn-zona")?.value || "urbano").trim(),
      };
    }

    function setStatus(msg, tipo) {
      if (!statusMsg) return;
      statusMsg.textContent = msg;
      statusMsg.className = "cn-status cn-status-" + tipo;
      statusMsg.style.display = msg ? "block" : "none";
    }

    function hacerBusqueda() {
      const termino = inputBusqueda?.value?.trim();
      if (!termino || termino.length < 2) {
        setStatus("Ingresa al menos 2 caracteres (ROL, nombre o dirección).", "warn");
        return;
      }
      if (!DATOS) {
        setStatus("Cargando base de datos...", "info");
        return;
      }

      btnGenerar.disabled = true;
      if (RESULTADOS) RESULTADOS._seleccionado = null;

      const res = buscar(termino);
      RESULTADOS = res;
      renderResultados(res, contenedorRes);

      if (res.length) {
        setStatus("", "");
        btnCorreo.style.display = "none";
      } else {
        setStatus("No encontrado en Matriz DOM. Puedes derivar la solicitud a los profesionales de la DOM.", "warn");
        btnCorreo.style.display = "inline-flex";
        btnGenerar.disabled = true;
      }
    }

    if (btnBuscar) btnBuscar.addEventListener("click", hacerBusqueda);
    if (inputBusqueda) {
      inputBusqueda.addEventListener("keydown", e => { if (e.key === "Enter") hacerBusqueda(); });
    }

    if (btnGenerar) {
      btnGenerar.addEventListener("click", () => {
        const seleccionado = RESULTADOS?._seleccionado;
        if (!seleccionado) return;
        const form = getFormData();
        generarCertificado(seleccionado, form);
      });
    }

    if (btnCorreo) {
      btnCorreo.addEventListener("click", () => {
        const form = getFormData();
        if (!form.solicitante) {
          setStatus("Completa al menos tu nombre antes de enviar.", "warn");
          return;
        }
        enviarCorreo(form);
      });
    }

    setStatus("Cargando base de datos histórica...", "info");
    fetch("historico.json")
      .then(r => r.json())
      .then(data => {
        DATOS = data;
        setStatus(`Base de datos lista — ${data.meta.total.toLocaleString("es-CL")} registros (${data.meta.fuente}).`, "ok");
        setTimeout(() => setStatus("", ""), 4000);
      })
      .catch(() => {
        setStatus("No se pudo cargar la base de datos. Contacta a la DOM.", "error");
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
