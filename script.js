const certificados = [
     {
    nombre: "Certificado de Número",
    plazo: "7 días hábiles",
    descripcion: "Acredita el número municipal asignado a una propiedad.",
    documentos: ["Rol de avalúo", "Croquis de ubicación","Dominio Vigente","Copia Escritura"],
    formulario: "./img/Doc/formulario.pdf"
  },
 
  {
    nombre: "Certificado de Informaciones Previas",
    plazo: "7 días hábiles",
    descripcion: "Entrega información urbanística aplicable a un predio.",
    documentos: ["Rol de avalúo", "Croquis", "Poder simple si corresponde","Dominio Vigente","Copia Escritura"],
    formulario: "./img/Doc/cip.pdf"
  },
  {
    nombre: "Certificado de Afectación a Utilidad Pública",
    plazo: "7 días hábiles",
    descripcion: "Certifica si una propiedad se encuentra afecta a utilidad pública según la planificación vigente.",
    documentos: ["Rol de avalúo", "Croquis de ubicación","Dominio Vigente","Copia Escritura"],
    formulario: "./img/Doc/cup.pdf"
  },
   {
    nombre: "Certificado de Vivienda Social",
    plazo: "7 días hábiles",
    descripcion: "Permite acreditar antecedentes para fines asociados a vivienda social.",
    documentos: ["Rol", "Antecedentes de la propiedad","Dominio Vigente","Copia Escritura"],
    formulario: "./img/Doc/formulario.pdf"
  },
  {
    nombre: "Certificado de Zonificación",
    plazo: "7 días hábiles",
    descripcion: "Informa la zonificación aplicable a un predio.",
    documentos: ["Rol", "Dirección", "Croquis","Dominio Vigente","Copia Escritura"],
    formulario: "./img/Doc/formulario.pdf"
  },     
 
  {
    nombre: "Otro",
    plazo: "Según revisión",
    descripcion: "Corresponde a solicitudes especiales no listadas explícitamente.",
    documentos: ["Antecedentes según solicitud"],
    formulario: "./img/Doc/formulario.pdf"
  }

];

const accordion = document.getElementById("certificadosAccordion");

function crearAcordeon() {
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

document.querySelectorAll(".faq-question").forEach((button) => {
  button.addEventListener("click", () => {
    button.parentElement.classList.toggle("active");
  });
});

crearAcordeon();