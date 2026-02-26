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
function ensureMetafuncionalCss() {
    if (document.getElementById("effraim-meta-css")) return;
    const link = document.createElement("link");
    link.id = "effraim-meta-css";
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("assets/css/metafuncional.css");
    (document.head || document.documentElement).appendChild(link);
}

function ensurePaineisDeslizantesCss() {
    if (document.getElementById("effraim-paineis-deslizantes-css")) return;
    const link = document.createElement("link");
    link.id = "effraim-paineis-deslizantes-css";
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("assets/css/paineis_deslizantes.css");
    (document.head || document.documentElement).appendChild(link);
}

function obterLabelOpcao(nome) {
    const mapa = {
      configs: "Configurações",
      tutorial: "Tutorial",
      ajuda: "Ajuda"
    };
    return mapa[nome] || nome.replaceAll("_", " ");
}

function normalizarLinkOpcao(nome, link) {
    // compatibilidade com configurações antigas salvas no sync
    if (nome === "tutorial" && link === "ajuda/tutorial.js") {
      return "ajuda/tutorial.html";
    }
    return link;
}

export function criarOpcoes(dicionarioOpcoes) {
    ensureMetafuncionalCss();
    const div = document.createElement("div");
    div.className = "effraim-opcoes-dinamicas";

    const nomes = Object.keys(dicionarioOpcoes);
    if (nomes.length === 0) return div;

    nomes.forEach(nome => {
        const link = normalizarLinkOpcao(nome, dicionarioOpcoes[nome]);
        const a = document.createElement("a");
        a.className = "effraim-meta-opcao";

        const img = document.createElement("img");
        img.src = chrome.runtime.getURL(`assets/icones/${nome}.png`);
        img.title = obterLabelOpcao(nome);
        a.appendChild(img);

        const label = document.createElement("span");
        label.className = "effraim-meta-opcao-label";
        label.textContent = obterLabelOpcao(nome);
        a.appendChild(label);

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
    ensureMetafuncionalCss();
    
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
export function criarPainelFlutuante({
  botao,
  secoes,
  id = "effraim-painel-flutuante",
  posicionamentoSecao = "ancora_subindo"
}) {
  if (!id || !botao || !Array.isArray(secoes)) return null;

  const painel = criarPainelDeslizantePadrao(id, botao);
  painel.classList.add("effraim-painel-flutuante");
  const gradeSecoes = document.createElement("div");
  gradeSecoes.className = "effraim-painel-flutuante-grade";
  painel.appendChild(gradeSecoes);

  let secaoAtiva = null;
  let placeholder = null;
  let restaurarInfoAdicionalAoFechar = false;
  const mapaAtalhos = new Map();
  let observadorVisibilidadePainel = null;

  function obterToggleInformacoesAdicionais() {
    return document.getElementById("imgStatusInfAdicional");
  }

  function infoAdicionalEstaFechada() {
    const img = obterToggleInformacoesAdicionais();
    const src = String(img?.getAttribute("src") || img?.src || "");
    return src.includes("ver_tudo.gif");
  }

  function infoAdicionalEstaAberta() {
    const img = obterToggleInformacoesAdicionais();
    const src = String(img?.getAttribute("src") || img?.src || "");
    return src.includes("ver_resumo.gif");
  }

  function clicarToggleInformacoesAdicionais() {
    const img = obterToggleInformacoesAdicionais();
    if (!img) return false;
    img.click();
    return true;
  }

  function garantirInformacoesAdicionaisAbertasParaSecao(idSecao) {
    const precisaAbrir = idSecao === "fldInformacoesAdicionais" || idSecao === "fldPartes";
    if (!precisaAbrir) {
      restaurarInfoAdicionalAoFechar = false;
      return;
    }
    const estavaFechada = infoAdicionalEstaFechada();
    if (estavaFechada) {
      clicarToggleInformacoesAdicionais();
      restaurarInfoAdicionalAoFechar = true;
    } else {
      restaurarInfoAdicionalAoFechar = false;
    }
  }

  function mostrarSecaoFlutuante(idSecao) {
    if (secaoAtiva) devolverSecao();
    garantirInformacoesAdicionaisAbertasParaSecao(idSecao);

    const secao = document.getElementById(idSecao);
    if (!secao) return;

    if (secao.classList.contains("collapse"))
      secao.classList.add("show");

    const painelRect = painel.getBoundingClientRect();
    const baseOriginal = painelRect.top + painel.scrollHeight + 8;
    const vh = window.innerHeight || document.documentElement.clientHeight || 800;
    const usarMeioViewport = posicionamentoSecao === "meio_viewport";
    const base = Math.max(48, baseOriginal + 15);
    const baseMinViewport = Math.round(vh * 0.35);
    const deslocamentoSubida = usarMeioViewport ? 0 : Math.round(vh * 0.30);
    const topoVisual = usarMeioViewport
      ? Math.max(48, Math.max(base, baseMinViewport))
      : Math.max(16, base - deslocamentoSubida);


    placeholder = document.createElement("div");
    placeholder.id = `ph-${idSecao}`;
    placeholder.style.display = "none";
    secao.insertAdjacentElement("beforebegin", placeholder);

    Object.assign(secao.style, {
      position: "fixed",
      top: `${usarMeioViewport ? topoVisual : base}px`,
      left: "0",
      right: "0",
      transform: usarMeioViewport ? "" : `translateY(-${deslocamentoSubida}px)`,
      zIndex: "10000",
      background: "#fff",
      border: "1px solid #2a9c1bff",
      boxShadow: "0 -2px 4px rgba(0,0,0,0.05)",
      maxHeight: `calc(100vh - ${Math.round(topoVisual)}px)`,
      overflow: "auto"
    });

    document.body.appendChild(secao);
    secaoAtiva = secao;
    focarPrimeiroElemento(secao);
  }

  function devolverSecao() {
    painel.querySelectorAll(".btn.active").forEach(x => x.classList.remove("active"));
    if (!secaoAtiva || !placeholder) return;
    const idSecaoFechando = secaoAtiva.id;

    if (secaoAtiva.classList.contains("collapse") && secaoAtiva.classList.contains("show"))
      secaoAtiva.classList.remove("show");

    placeholder.insertAdjacentElement("afterend", secaoAtiva);
    Object.assign(secaoAtiva.style, {
      position: "",
      top: "",
      left: "",
      right: "",
      transform: "",
      zIndex: "",
      background: "",
      border: "",
      maxHeight: "",
      overflow: ""
    });

    placeholder.remove();
    secaoAtiva = null;
    placeholder = null;

    if (
      restaurarInfoAdicionalAoFechar &&
      (idSecaoFechando === "fldInformacoesAdicionais" || idSecaoFechando === "fldPartes") &&
      infoAdicionalEstaAberta()
    ) {
      clicarToggleInformacoesAdicionais();
    }
    restaurarInfoAdicionalAoFechar = false;
  }

  function painelFoiOcultado() {
    if (!painel) return false;
    const estilo = window.getComputedStyle ? window.getComputedStyle(painel) : null;
    const display = estilo?.display || painel.style.display || "";
    const opacity = estilo?.opacity || painel.style.opacity || "";
    const pointerEvents = estilo?.pointerEvents || painel.style.pointerEvents || "";
    return display === "none" || opacity === "0" || pointerEvents === "none";
  }

  secoes.forEach(secao => {
    const b = document.createElement("button");
    b.className = "effraim-painel-flutuante-botao";
    b.accessKey = secao.chave;
    b.dataset.effraimAtalho = String(secao.chave || "");
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

    gradeSecoes.appendChild(b);
    mapaAtalhos.set(String(secao.chave || "").toLowerCase(), b);
  });

  function painelVisivel() {
    return painel && painel.style.display !== "none" && painel.style.pointerEvents !== "none";
  }

  function normalizarTeclaEventoParaAtalho(event) {
    const code = String(event.code || "");
    // Prioriza código físico da tecla para atalhos (evita variações de layout/locale com Alt).
    if (/^Key[A-Z]$/.test(code)) return code.slice(3).toLowerCase();
    if (/^Digit[0-9]$/.test(code)) return code.slice(5);
    if (code === "Equal" || code === "NumpadAdd") return "="; // tratado abaixo para "+"
    if (code === "Minus" || code === "NumpadSubtract") return "-";

    const key = String(event.key || "").toLowerCase();
    if (key === "add") return "+";
    if (key === "plus") return "+";
    if (key === "subtract") return "-";
    if (key) return key;
    return "";
  }

  if (!painel.__effraimAtalhosCapturaAtivo) {
    const onKeydown = (event) => {
      if (!painelVisivel()) return;
      if (!event.altKey || event.ctrlKey || event.metaKey) return;

      const tecla = normalizarTeclaEventoParaAtalho(event);
      let botaoAtalho = mapaAtalhos.get(tecla);

      const ehTentativaAltZ =
        String(event.code || "") === "KeyZ" ||
        String(event.key || "").toLowerCase() === "z";
      if (ehTentativaAltZ) {
        console.log("[EFFRAIM atalhos painel_flutuante] Alt+Z debug (antes dos fallbacks)", {
          idPainel: painel.id,
          key: event.key,
          code: event.code,
          teclaNormalizada: tecla,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          mapaTemZ: mapaAtalhos.has("z"),
          botaoInicialResolvido: !!botaoAtalho
        });
      }

      // layouts onde Alt+'+' chega como '='
      if (!botaoAtalho && tecla === "=") botaoAtalho = mapaAtalhos.get("+");
      // fallback específico para letras quando event.key vier alterado por layout
      if (!botaoAtalho && /^Key[A-Z]$/.test(String(event.code || ""))) {
        botaoAtalho = mapaAtalhos.get(String(event.code).slice(3).toLowerCase());
      }

      if (ehTentativaAltZ) {
        console.log("[EFFRAIM atalhos painel_flutuante] Alt+Z debug (apos fallbacks)", {
          idPainel: painel.id,
          botaoFinalResolvido: !!botaoAtalho,
          botaoTexto: botaoAtalho?.textContent || "",
          botaoAtalhoDataset: botaoAtalho?.dataset?.effraimAtalho || ""
        });
      }

      if (!botaoAtalho) return;
      event.preventDefault();
      event.stopPropagation();
      if (ehTentativaAltZ) {
        console.log("[EFFRAIM atalhos painel_flutuante] Alt+Z disparando clique.", {
          idPainel: painel.id,
          botaoTexto: botaoAtalho?.textContent || ""
        });
      }
      botaoAtalho.click();
    };

    document.addEventListener("keydown", onKeydown, true);
    painel.__effraimAtalhosCapturaAtivo = true;
    painel.__effraimAtalhosCapturaHandler = onKeydown;
  }

  if (!observadorVisibilidadePainel && painel instanceof HTMLElement) {
    observadorVisibilidadePainel = new MutationObserver(() => {
      if (!secaoAtiva) return;
      if (!painelFoiOcultado()) return;
      devolverSecao();
    });
    observadorVisibilidadePainel.observe(painel, {
      attributes: true,
      attributeFilter: ["style", "class"]
    });
    painel.__effraimObservadorSecaoFlutuante = observadorVisibilidadePainel;
  }

  return painel;
}


//cria o painel deslizante ligado ao botão
export function criarPainelDeslizantePadrao(id, botaoReferencia, titulo = "") {
  ensurePaineisDeslizantesCss();
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
      opacity: "0",
      maxHeight: "0",
      transition: "all 0.25s ease-out",
      zIndex: "1130",
      padding: "4px 6px",
      // layout: todos os botões em uma linha horizontal
      display: "none",
      pointerEvents: "none"
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
    painel.addEventListener("mouseleave", () => iniciarOcultarComDelay(painel));
    painel.addEventListener("mouseenter", () => cancelarOcultar(painel));

    console.log("Painel padrão criado");
  return painel;
  }
}

// Badge de status numérico para botões de funcionalidade
export function atualizarBadgeRequisitorioBotao(botao, status, quantidade = 0) {
  if (!botao) return;

  let badge = botao.querySelector(".effraim-badge-requisitorio");
  if (!badge) {
    botao.style.position = "relative";
    badge = document.createElement("span");
    badge.className = "effraim-badge-requisitorio";
    Object.assign(badge.style, {
      position: "absolute",
      top: "-6px",
      right: "-6px",
      minWidth: "18px",
      height: "18px",
      padding: "0 5px",
      borderRadius: "999px",
      fontSize: "11px",
      fontWeight: "700",
      lineHeight: "18px",
      textAlign: "center",
      color: "#fff",
      background: "#6c757d",
      border: "1px solid rgba(255,255,255,0.85)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
      zIndex: "2"
    });
    botao.appendChild(badge);
  }

  if (status === "carregando") {
    badge.textContent = "...";
    badge.style.background = "#0d6efd";
    badge.title = "Consultando requisitorios...";
    return;
  }

  if (status === "com") {
    badge.textContent = String(quantidade);
    badge.style.background = "#198754";
    badge.title = `${quantidade} requisitorio(s) encontrado(s).`;
    return;
  }

  if (status === "sem") {
    badge.textContent = "0";
    badge.style.background = "#6c757d";
    badge.title = "Nenhum requisitorio encontrado.";
    return;
  }

  if (status === "inativo") {
    badge.textContent = "-";
    badge.style.background = "#adb5bd";
    badge.title = "Consulta automatica desativada para este localizador.";
    return;
  }

  badge.textContent = "!";
  badge.style.background = "#dc3545";
  badge.title = "Falha na consulta de requisitorios.";
}

// --- orquestrador de visibilidade dos painéis deslizantes ---
let painelDeslizanteAtivo = null;
const mapaTimeoutOcultar = new WeakMap();

function limparTimeoutOcultar(painel) {
	if (!painel) return;
	const timeout = mapaTimeoutOcultar.get(painel);
	if (timeout) {
		clearTimeout(timeout);
		mapaTimeoutOcultar.delete(painel);
	}
}

function iniciarOcultarComDelay(painel, delay = 500) {
	limparTimeoutOcultar(painel);
	const timeout = setTimeout(() => ocultarPainel(painel), delay);
	mapaTimeoutOcultar.set(painel, timeout);
}

function cancelarOcultar(painel) {
	limparTimeoutOcultar(painel);
}

function fecharPainelAtivoSeDiferente(painelAtual) {
	if (!painelDeslizanteAtivo || painelDeslizanteAtivo === painelAtual) return;
	ocultarPainel(painelDeslizanteAtivo);
}

function ajustarPainelPorProporcao(painel) {
  const vw = window.innerWidth || document.documentElement.clientWidth || 1280;
  const vh = window.innerHeight || document.documentElement.clientHeight || 720;
  const larguraMax = Math.max(260, Math.round(vw * 0.92));
  const alturaMax = Math.max(220, Math.round(vh * 0.88));
  const larguraMin = Math.min(300, larguraMax);
  const proporcaoLimite = 1.6;
  const ehForcado = painel.classList.contains("effraim-painel-deslizante--forcado");

  if (ehForcado) {
    Object.assign(painel.style, {
      maxWidth: `${larguraMax}px`,
      maxHeight: `${alturaMax}px`,
      overflowX: "hidden",
      overflowY: "auto",
      whiteSpace: "normal"
    });
    return alturaMax;
  }

  Object.assign(painel.style, {
    width: "auto",
    minWidth: `${larguraMin}px`,
    maxWidth: `${larguraMax}px`,
    maxHeight: "none",
    overflowX: "hidden",
    overflowY: "hidden",
    whiteSpace: "normal"
  });

  let larguraAtual = painel.scrollWidth || painel.offsetWidth || 0;
  let alturaAtual = painel.scrollHeight || painel.offsetHeight || 0;

  if (alturaAtual > 0 && larguraAtual / alturaAtual > proporcaoLimite) {
    const larguraAlvo = Math.max(
      larguraMin,
      Math.min(larguraMax, Math.round(alturaAtual * proporcaoLimite))
    );
    painel.style.width = `${larguraAlvo}px`;
    larguraAtual = painel.scrollWidth || painel.offsetWidth || larguraAlvo;
    alturaAtual = painel.scrollHeight || painel.offsetHeight || 0;
  }

  if (larguraAtual > larguraMax) {
    painel.style.width = `${larguraMax}px`;
    painel.style.overflowX = "auto";
    larguraAtual = larguraMax;
    alturaAtual = painel.scrollHeight || painel.offsetHeight || alturaAtual;
  } else {
    painel.style.overflowX = "hidden";
  }

  if (alturaAtual > alturaMax) {
    painel.style.maxHeight = `${alturaMax}px`;
    painel.style.overflowY = "auto";
    return alturaMax;
  }

  painel.style.maxHeight = `${alturaAtual}px`;
  painel.style.overflowY = "hidden";
  return alturaAtual;
}

export function forcarAberturaPainelDeslizante(painel) {
  if (!painel) return;
  painel.classList.add("effraim-painel-deslizante--forcado");
  mostrarPainel(painel);
}

export function removerForcamentoPainelDeslizante(painel) {
  if (!painel) return;
  painel.classList.remove("effraim-painel-deslizante--forcado");
}

function mostrarPainel(painel) {
  fecharPainelAtivoSeDiferente(painel);
  cancelarOcultar(painel);
  const ajustarAltura = () => {
    const altura = ajustarPainelPorProporcao(painel);
    painel.style.maxHeight = `${altura}px`;
  };

  painel.style.display = "inline-block"; // deixar visível antes de medir
  painel.style.opacity = "1";
  painel.style.pointerEvents = "auto";

  ajustarAltura(); // mede no mesmo tick
  requestAnimationFrame(ajustarAltura); // mede de novo após qualquer ajuste de conteúdo
  painelDeslizanteAtivo = painel;
}

function ocultarPainel(painel) {
  limparTimeoutOcultar(painel);
  Object.assign(painel.style, {
    opacity: "0",
    maxHeight: "0",
    pointerEvents: "none",
    display: "none"
  });
  if (painelDeslizanteAtivo === painel) painelDeslizanteAtivo = null;
}


function ocultarPainelSeFora(painel, e) {
	const related = e.relatedTarget;

	// se o mouse ainda está dentro do painel, cancela o fechamento
	if (painel.contains(related)) {
		cancelarOcultar(painel);
		return;
	}

	// mouse saiu: inicia contagem para fechar
	iniciarOcultarComDelay(painel);
}


//Fim do Painel deslizante padrão cima-baixo=======================================

// Utilidades=============================================
export function focarPrimeiroElemento(container) {
  if (!container) return;
  const el = container.querySelector(".infraButton, .content-link");
  if (el) el.focus();
}

// =========================
// Formatação / Máscaras
// =========================
// Aplica formatação monetária (R$) ao input alvo.
// Se registrar for true, associa listeners de input/blur para manter o formato.
export function aplicarMascaraMoeda(input, registrar = false) {
  if (!input) return;
  const formatar = (el) => {
    let val = (el.value || "").replace(/\D/g, "");
    if (val === "") return (el.value = "");
    val = (parseInt(val, 10) / 100).toFixed(2);
    val = val.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    el.value = val;
  };
  formatar(input);
  if (registrar) {
    input.addEventListener("input", (e) => formatar(e.target));
    input.addEventListener("blur", (e) => formatar(e.target));
  }
}

// Registra a máscara de moeda em uma lista de inputs NodeList/Array.
export function registrarMascaraMoeda(inputs) {
  if (!inputs) return;
  inputs.forEach((el) => aplicarMascaraMoeda(el, true));
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
