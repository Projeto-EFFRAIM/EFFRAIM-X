// interface.js

// Cria estrutura padrão de painel EFFRAIM e retorna {painel, conteudo}
export function criarContainer(id, referencia, titulo) {
    const painel = criarPainelBase(id);
    const cabecalho = criarCabecalho(titulo);
    const conteudo = criarAreaConteudo();

    painel.appendChild(cabecalho);
    painel.appendChild(conteudo);
    referencia.appendChild(painel);

    return [ painel, conteudo ];
}

// Fecha apenas o painel informado
export function fecharPainel(painel) {
    if (painel && painel.parentNode) painel.remove();
}

// Cria o contêiner principal
function criarPainelBase(id) {
    const painel = document.createElement("div");
    painel.id = id;
    painel.className = "effraim-painel";
    painel.style.cssText = `
      display: flex;
    flex-direction: column;
      border: 1px solid #ecf5ecff;
      padding: 0;
      margin: 0;
    `;
    return painel;
}

// Cria cabeçalho com título e botão fechar
function criarCabecalho(titulo) {
    const cabecalho = document.createElement("div");
    cabecalho.className = "effraim-painel-cabecalho";
    cabecalho.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      gap: 8px;
      padding: 4px;
      background-color: #b6e1ecff;
    `;

    cabecalho.appendChild(criarTitulo(titulo));
    cabecalho.appendChild(criarBotaoFechar());

    return cabecalho;
}

// Cria título centralizado
function criarTitulo(texto) {
    const titulo = document.createElement("h6");
    titulo.textContent = texto;
    titulo.className = "effraim-painel-titulo";
    titulo.style.cssText = `
      text-align: center;
      color: darkblue;
      margin: 0;
    `;
    return titulo;
}

// Cria botão fechar seguro
function criarBotaoFechar() {
    const botao = document.createElement("button");
    botao.className = "effraim-botao-fechar";
    botao.textContent = "x";
    botao.addEventListener("click", e => {
      const painel = e.target.closest(".effraim-painel");
      if (painel) painel.remove();
    });
    return botao;
}

// Cria área de conteúdo
function criarAreaConteudo() {
    const conteudo = document.createElement("div");
    conteudo.className = "effraim-painel-conteudo";
    return conteudo;
}


//painel de opções===========================

export function criarOpcoes(dicionarioOpcoes) {
    const div = document.createElement("div");
    div.className = "effraim-opcoes-dinamicas";

    const nomes = Object.keys(dicionarioOpcoes);
    if (nomes.length === 0) return div;

    nomes.forEach(nome => {
        const link = dicionarioOpcoes[nome];
        const a = document.createElement("a");
        a.className = "link-secondary text-center";

        const img = document.createElement("img");
        img.src = chrome.runtime.getURL(`assets/icones/${nome}.png`);
        img.style.width = "24px";
        img.style.height = "24px";
        img.title = nome;
        a.appendChild(img);

        if (link.endsWith(".html")) {
          a.href = chrome.runtime.getURL(link);
          a.target = "_blank";
        } else if (link.endsWith(".js")) {
          a.href = "#";
          a.addEventListener("click", async e => {
            e.preventDefault();
            const modulo = await import(chrome.runtime.getURL(link));
            if (modulo && typeof modulo.iniciar === "function") modulo.iniciar();
          });
        }

        div.appendChild(a);
    });

    return div;
}


export function criarPainelHoverLogo(dicionarioOpcoes) {
    if (typeof dicionarioOpcoes !== "object")
      throw new Error("criarPainelHoverLogo requer um dicionario de opcoes valido.");
    
    const logo = document.querySelector("#effraim-logo-container");
    if (!logo) return;
    
    const painel = document.createElement("div");
    painel.id = "effraim-painel-hover";
    painel.style.cssText = `
      position: absolute;
      top: 50%;
      left: 100%;
      transform: translateY(-50%) translateX(-10px);
      width: 160px;
      background: #fafafa;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease, transform 0.25s ease;
      z-index: 9999;
      padding: 6px;
    `;

    const conteudo = criarOpcoes(dicionarioOpcoes);
    painel.appendChild(conteudo);
    logo.parentElement.appendChild(painel);
    
    const abrir = () => {
      painel.style.opacity = "1";
      painel.style.pointerEvents = "auto";
      painel.style.transform = "translateY(-50%) translateX(0)";
    };

    const fechar = () => {
      painel.style.opacity = "0";
      painel.style.pointerEvents = "none";
      painel.style.transform = "translateY(-50%) translateX(-10px)";
    };

    logo.addEventListener("mouseenter", abrir);
    logo.addEventListener("mouseleave", fechar);
    painel.addEventListener("mouseenter", abrir);
    painel.addEventListener("mouseleave", fechar);
    return painel;
}

//Fim do painel de opções========================================

//Painel deslizante padrão cima-baixo=======================================
// interface.js
//cria todo o painel flutuante
// Painel flutuante genérico (para páginas com seções)
export function criarPainelFlutuante({ botao, secoes, id="effraim-painel-flutuante"}) {
  if (!id || !botao || !Array.isArray(secoes)) return null;

  const painel = criarPainelDeslizantePadrao(id, botao);

  let secaoAtiva = null;
  let placeholder = null;

  function mostrarSecaoFlutuante(idSecao) {
    if (secaoAtiva) devolverSecao();

    const secao = document.getElementById(idSecao);
    if (!secao) return;

    if (secao.classList.contains("collapse"))
      secao.classList.add("show");

    const painelRect = painel.getBoundingClientRect();
    const base = painelRect.top + painel.scrollHeight + 8;

    placeholder = document.createElement("div");
    placeholder.id = `ph-${idSecao}`;
    placeholder.style.display = "none";
    secao.insertAdjacentElement("beforebegin", placeholder);

    Object.assign(secao.style, {
      position: "fixed",
      top: `${base}px`,
      left: "0",
      right: "0",
      zIndex: "10",
      background: "#fff",
      border: "1px solid #2a9c1bff",
      boxShadow: "0 -2px 4px rgba(0,0,0,0.05)",
      maxHeight: `calc(100vh - ${Math.round(base)}px)`,
      overflow: "auto"
    });

    document.body.appendChild(secao);
    secaoAtiva = secao;
    focarPrimeiroElemento(secao);
  }

  function devolverSecao() {
    painel.querySelectorAll(".btn.active").forEach(x => x.classList.remove("active"));
    if (!secaoAtiva || !placeholder) return;

    if (secaoAtiva.classList.contains("collapse") && secaoAtiva.classList.contains("show"))
      secaoAtiva.classList.remove("show");

    placeholder.insertAdjacentElement("afterend", secaoAtiva);
    Object.assign(secaoAtiva.style, {
      position: "",
      top: "",
      left: "",
      right: "",
      zIndex: "",
      background: "",
      maxHeight: "",
      overflow: ""
    });

    placeholder.remove();
    secaoAtiva = null;
    placeholder = null;
  }

  secoes.forEach(secao => {
    const b = document.createElement("button");
    b.className = "btn btn-sm btn-light border";
    b.accessKey = secao.chave;
    b.textContent = `${secao.nome} (${b.accessKey})`;
    b.title = `Atalho: Alt + ${b.accessKey}`;

    b.addEventListener("click", () => {
      if (secaoAtiva && secaoAtiva.id === secao.id) {
        devolverSecao();
        b.blur();
        return;
      }

      painel.querySelectorAll(".btn").forEach(x => x.classList.remove("active"));
      b.classList.add("active");
      mostrarSecaoFlutuante(secao.id);
    });

    painel.appendChild(b);
  });

  return painel;
}


//cria o painel deslizante ligado ao botão
export function criarPainelDeslizantePadrao(id, botaoReferencia, titulo = "") {
    // remove painel anterior se existir
  const existente = document.getElementById(id);
  if (existente) {mostrarPainel(existente);}else{

    const painel = document.createElement("div");
    painel.id = id;
    painel.className = "effraim-painel-deslizante";
    // posicionamento relativo ao botão, mas centralizado na tela
    Object.assign(painel.style, {
      position: "absolute",
      top: `${botaoReferencia.offsetHeight + 30}px`,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#fff",
      border: "1px solid #ccc",
      borderRadius: "6px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      overflow: "hidden",
      whiteSpace: "nowrap",
      opacity: "0",
      maxHeight: "0",
      transition: "all 0.25s ease-out",
      zIndex: "1000",
      padding: "4px 6px",
      // layout: todos os botões em uma linha horizontal
      display: "inline-block",
      overflowX: "auto",
      overflowY: "hidden",
      minWidth: "200px",
      maxWidth: "90vw"
    });


    // título opcional (usado raramente)
    if (titulo) {
      const cab = document.createElement("div");
      
      Object.assign(cab.style, {
        fontWeight: "bold",
        padding: "6px 8px",
        background: "#f8f9fa"
      });

      cab.textContent = titulo;
      painel.appendChild(cab);      
    }

    botaoReferencia.style.position = "relative";
    botaoReferencia.parentNode.insertBefore(painel, botaoReferencia.nextSibling);

    // listeners padrão
    botaoReferencia.addEventListener("mouseenter", () => mostrarPainel(painel));
    botaoReferencia.addEventListener("mouseleave", e => ocultarPainelSeFora(painel, e));
    painel.addEventListener("mouseleave", () => ocultarPainel(painel));
    console.log("Painel padrão criado");
  return painel;
  }
}

function mostrarPainel(painel) {
  Object.assign(painel.style, {
    opacity: "1",
    maxHeight: painel.scrollHeight + "px",
    pointerEvents:"auto"
  });
}

function ocultarPainel(painel) {
  Object.assign(painel.style, {
    opacity: "0",
    maxHeight: "0",
    pointerEvents: "none"
  });
}


function ocultarPainelSeFora(painel, e) {
  const related = e.relatedTarget;
  if (!painel.contains(related)) {
    ocultarPainel(painel);
  }
}

//Fim do Painel deslizante padrão cima-baixo=======================================

// Utilidades=============================================
export function focarPrimeiroElemento(container) {
  if (!container) return;
  const el = container.querySelector(".infraButton, .content-link");
  if (el) el.focus();
}

  // função local para exibir o aviso padrão
export function inserir_aviso_effraim(mensagem, tempo = 15000, posicao = "topo") {
	let container = document.getElementById("aviso-effraim-container");
	if (!container) {
		container = document.createElement("div");
		container.id = "aviso-effraim-container";
		Object.assign(container.style, {
			position: "fixed",
			top: "10px",
			left: "10px",
			display: "flex",
			flexDirection: "column",
			gap: "6px",
			zIndex: 1131,
			pointerEvents: "none"
		});
		document.body.appendChild(container);
	}

	const aviso = document.createElement("div");
	aviso.innerHTML = mensagem;
	Object.assign(aviso.style, {
		background: "rgba(255,255,200,0.95)",
		color: "#222",
		padding: "6px 10px",
		border: "1px solid #ccc",
		borderRadius: "6px",
		fontSize: "13px",
		opacity: "0",
		transition: "opacity 0.3s ease"
	});

	if (posicao === "fundo") container.appendChild(aviso);
	else container.prepend(aviso);

	requestAnimationFrame(() => (aviso.style.opacity = "1"));
	setTimeout(() => aviso.remove(), tempo);
}



//date picker
export function criarDatePicker(id, label, diasMax, diasMinBloqueio = 0) {
	const wrapper = document.createElement("div");
	wrapper.style.marginTop = "6px";

	const hoje = new Date();
	const min = new Date(hoje);
	min.setDate(hoje.getDate() + diasMinBloqueio);
	const max = new Date(hoje);
	max.setDate(hoje.getDate() + diasMax);

	const input = document.createElement("input");
	input.type = "date";
	input.id = id;
	input.min = min.toISOString().split("T")[0];
	input.max = max.toISOString().split("T")[0];
	input.style.marginLeft = "4px";

	const lbl = document.createElement("label");
	lbl.htmlFor = id;
	lbl.textContent = label + ":";

	wrapper.append(lbl, input);
	return wrapper;
}



//Fim de Utilidades======================================