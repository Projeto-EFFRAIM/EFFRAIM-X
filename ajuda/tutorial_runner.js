const MAPA_PAGINA_TIPO = {
  painel_inicial: "ajuda/mock_pages/painel_inicial_secretaria/painel_inicial_secretaria.html",
  consulta_processual: "ajuda/mock_pages/consulta_processual/consulta_processual.html",
  lista_processos: "ajuda/mock_pages/lista_processos.html"
};
const LOG_PREFIX = "[EFFRAIM tutorial_runner]";

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    tipo: params.get("tipo") || "",
    tutorial: params.get("tutorial") || "",
    flag: params.get("effraim_tutorial") || ""
  };
}

function atualizarMeta({ tipo, flag }) {
  const elTipo = document.getElementById("runner-tipo");
  const elFlag = document.getElementById("runner-flag");
  elTipo.textContent = tipo || "(não informado)";
  elFlag.textContent = flag || "(não informado)";
}

function setStatus(texto) {
  const el = document.getElementById("runner-status");
  if (el) el.textContent = texto;
}

function getUrlPaginaTipo(tipo) {
  const path = MAPA_PAGINA_TIPO[tipo];
  if (!path) return "";
  const url = chrome.runtime.getURL(path);
  console.info(`${LOG_PREFIX} URL da pagina-tipo resolvida:`, { tipo, path, url });
  return url;
}

function getTutorialStartSelector(tutorialId) {
  const id = String(tutorialId || "").toLowerCase();
  if (id === "requisitorios") return "#btn-requisitorio";
  if (id === "consulta_flutuante") return "#btn-consulta_flutuante";
  if (id === "sisbajud") return "#btn-sisbajud";
  if (id === "renajud") return "#btn-renajud";
  if (id === "favoritos") return "#btn-painel_inicial_favoritos";
  if (id === "lista_partes_aprimorada") return "#fldPartes";
  return "#effraim-funcionalidades-container";
}

function dispararTutorialNoIframe(frame, params) {
  const tutorialId = String(params?.tutorial || "").trim().toLowerCase();
  if (!tutorialId) return;

  const seletorPronto = getTutorialStartSelector(tutorialId);
  console.info(`${LOG_PREFIX} Aguardando seletor para iniciar tour:`, { tutorialId, seletorPronto });
  let tentativas = 0;
  const maxTentativas = 30; // ~15s

  const timer = window.setInterval(() => {
    tentativas += 1;
    try {
      const win = frame.contentWindow;
      const doc = frame.contentDocument;
      if (!win || !doc) return;

      const pronto = Boolean(doc.querySelector(seletorPronto));
      setStatus(
        pronto
          ? `Iniciando tutorial (${tutorialId})...`
          : `Preparando tutorial (${tutorialId})... tentativa ${tentativas}/${maxTentativas}`
      );
      if (!pronto && (tentativas === 1 || tentativas % 5 === 0)) {
        console.info(`${LOG_PREFIX} Seletor ainda nao encontrado:`, {
          tutorialId,
          seletorPronto,
          tentativas,
          maxTentativas
        });
      }

      if (!pronto && tentativas < maxTentativas) return;

      win.postMessage(
        {
          tipo: "EFFRAIM_START_TUTORIAL",
          tutorialId
        },
        "*"
      );
      window.clearInterval(timer);
      console.info(`${LOG_PREFIX} postMessage enviado para iniciar tutorial:`, { tutorialId });
      setStatus(`Tutorial ${tutorialId} iniciado.`);
    } catch (erro) {
      if (tentativas >= maxTentativas) {
        window.clearInterval(timer);
        setStatus("Falha ao iniciar tutorial");
        console.warn(`${LOG_PREFIX} Falha ao disparar tutorial no iframe:`, erro);
      }
    }
  }, 500);
}

function injetarEprocInitNoIframe(frame, params) {
  try {
    const doc = frame.contentDocument;
    const win = frame.contentWindow;
    if (!doc || !win) return;

    // Evita injeção duplicada na mesma carga.
    if (doc.getElementById("effraim-tutorial-eproc-init")) return;

    // Contexto de tutorial disponível antes do bootstrap.
    win.EFFRAIM_TUTORIAL_ROUTE = true;
    win.EFFRAIM_TUTORIAL_TIPO = params.tipo;
    win.EFFRAIM_TUTORIAL_ID = params.tutorial;

    // Em iframe srcdoc, chrome.runtime pode não existir por padrão.
    if (!win.chrome?.runtime && window.chrome?.runtime) {
      try {
        Object.defineProperty(win, "chrome", {
          value: window.chrome,
          configurable: true
        });
      } catch {
        // fallback para ambientes que não aceitam defineProperty no window.
        win.chrome = window.chrome;
      }
    }

    const script = doc.createElement("script");
    script.id = "effraim-tutorial-eproc-init";
    script.type = "module";
    script.src = chrome.runtime.getURL("content/eproc_init.js");
    doc.documentElement.appendChild(script);
    console.info(`${LOG_PREFIX} eproc_init injetado no iframe:`, {
      src: script.src,
      tipo: params?.tipo,
      tutorial: params?.tutorial
    });
  } catch (erro) {
    console.warn(`${LOG_PREFIX} Falha ao injetar eproc_init no iframe:`, erro);
  }
}

function sanitizarHtmlTutorial(html, baseHref) {
  let limpo = String(html || "");

  // Remove scripts inline e externos da página salva.
  limpo = limpo.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

  // Remove handlers inline (onclick, onload, etc.).
  limpo = limpo.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "");
  limpo = limpo.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");

  // Neutraliza javascript: em href/src.
  limpo = limpo.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"');

  // Injeta base para recursos relativos (consulta_processual_files/*).
  if (/<head[\s>]/i.test(limpo)) {
    limpo = limpo.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`);
  } else {
    limpo = `<!DOCTYPE html><html><head><base href="${baseHref}"></head><body>${limpo}</body></html>`;
  }

  return limpo;
}

async function carregarHtmlSanitizado(tipo) {
  const path = MAPA_PAGINA_TIPO[tipo];
  if (!path) return "";

  const url = chrome.runtime.getURL(path);
  const baseHref = url.slice(0, url.lastIndexOf("/") + 1);
  console.info(`${LOG_PREFIX} Carregando HTML base para sanitizacao:`, { tipo, url, baseHref });
  const resposta = await fetch(url, { cache: "no-store" });
  if (!resposta.ok) {
    throw new Error(`Falha ao carregar HTML da página-tipo (${resposta.status}).`);
  }

  const htmlOriginal = await resposta.text();
  console.info(`${LOG_PREFIX} HTML base carregado e sanitizado.`, {
    tamanhoOriginal: htmlOriginal.length
  });
  return sanitizarHtmlTutorial(htmlOriginal, baseHref);
}

function renderErro(mensagem) {
  const frame = document.getElementById("tutorial-runner-frame");
  if (!frame) return;
  frame.srcdoc = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: Arial, sans-serif; margin: 16px; color: #163a4d; }
        .erro { border: 1px solid #c58a8a; background: #fff1f1; border-radius: 8px; padding: 12px; }
        code { background: #f2f7fa; padding: 1px 4px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="erro">
        <strong>Não foi possível carregar a página-base do tutorial.</strong>
        <p>${mensagem}</p>
        <p>Verifique se o arquivo existe em <code>ajuda/mock_pages</code>.</p>
      </div>
    </body>
    </html>
  `;
}

function inicializarRunner() {
  const params = getParams();
  console.info(`${LOG_PREFIX} Inicializando runner com params:`, params);
  atualizarMeta(params);

  if (params.flag !== "1") {
    setStatus("Flag inválida");
    renderErro("A rota de tutorial exige a flag <code>effraim_tutorial=1</code>.");
    return;
  }

  const urlPaginaTipo = getUrlPaginaTipo(params.tipo);
  if (!urlPaginaTipo) {
    setStatus("Tipo não mapeado");
    renderErro(`Tipo não mapeado: <code>${params.tipo || "(vazio)"}</code>.`);
    return;
  }

  const frame = document.getElementById("tutorial-runner-frame");
  if (!frame) {
    setStatus("Erro de renderização");
    return;
  }

  frame.addEventListener("load", () => {
    setStatus("Página carregada");
    console.info(`${LOG_PREFIX} iframe load concluido.`);

    // Marca explícita para os próximos passos do bootstrap tutorial dos módulos.
    try {
      const doc = frame.contentDocument;
      if (doc?.documentElement) {
        doc.documentElement.setAttribute("data-effraim-tutorial", "1");
        doc.documentElement.setAttribute("data-effraim-tipo", params.tipo);
      }
      if (frame.contentWindow) {
        frame.contentWindow.EFFRAIM_TUTORIAL_ROUTE = true;
        frame.contentWindow.EFFRAIM_TUTORIAL_TIPO = params.tipo;
        frame.contentWindow.EFFRAIM_TUTORIAL_ID = params.tutorial;
      }
    } catch (erro) {
      console.warn(`${LOG_PREFIX} Nao foi possivel marcar contexto no iframe:`, erro);
    }

    injetarEprocInitNoIframe(frame, params);
    dispararTutorialNoIframe(frame, params);
  });

  setStatus("Sanitizando página-base...");
  carregarHtmlSanitizado(params.tipo)
    .then(htmlSanitizado => {
      if (!htmlSanitizado) {
        setStatus("Erro de sanitização");
        renderErro("Não foi possível gerar versão sanitizada da página-base.");
        return;
      }
      frame.srcdoc = htmlSanitizado;
      setStatus("Abrindo página-base sanitizada...");
    })
    .catch(erro => {
      console.warn(`${LOG_PREFIX} Falha ao preparar pagina-tipo:`, erro);
      setStatus("Erro ao abrir página-base");
      renderErro(`Erro ao abrir página-base: <code>${String(erro?.message || erro)}</code>.`);
    });
}

document.addEventListener("DOMContentLoaded", inicializarRunner);
