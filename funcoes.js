// Ponto de agregação de utilitários (barrel file)

export * from "./modules/utils/configuracoes.js";
export * from "./modules/utils/interacao_DOM.js";
export * from "./modules/utils/rotas.js";
export * from "./modules/utils/processo.js";

// Outras funções genéricas ou ainda não classificadas podem ficar aqui.



/*

// Configurações ==========================================================
export async function carregarConfiguracoes() {
	console.log("Verifica se já há configurações salvas");
	const existentes = await lerConfiguracoes();
	console.log(existentes);
	if (Object.keys(existentes).length > 0) return existentes;

	console.log("Carregando o arquivo JSON padrão. Não há nenhuma configuração salva");
	const resposta = await fetch(chrome.runtime.getURL("configuracoes.json"));
	const padrao = await resposta.json();
	console.log("Salvar no chrome.storage.sync");
	chrome.storage.sync.set({ effraim_configuracoes: padrao });
	return padrao;
}

async function lerConfiguracoes() {
	console.log("effraim_configuracoes obtido do sync");
  	return new Promise((resolve) => {
		chrome.storage.sync.get("effraim_configuracoes", (dados) => {
		resolve(dados.effraim_configuracoes || {});
		});
	
  	});
}

export async function zerarConfiguracoes() {
	console.log("Zerando configurações");
	return new Promise(resolve => {
		chrome.storage.sync.remove("effraim_configuracoes", () => {
			console.log("Configurações removidas. Será recarregado o JSON padrão no próximo carregamento.");
			resolve();
		});
	});
}

// saber uso do sync
export async function verificarUsoSync(log = console.log) {
  try {
    log("[verificarUsoSync] inicio");
    const data = await new Promise((resolve, reject) => {
      if (!chrome?.storage?.sync) return reject(new Error("chrome.storage.sync indisponivel"));
      chrome.storage.sync.get(null, resolve);
    });

    const json = JSON.stringify(data);
    const totalBytes = new Blob([json]).size; // mais robusto que TextEncoder em alguns contextos
    const maxBytes = chrome.storage?.sync?.QUOTA_BYTES ?? 102400; // fallback 100 KB
    log(
      `Armazenamento sync utilizado: ${(totalBytes/1024).toFixed(1)}/${(maxBytes/1024).toFixed(1)} KB`
    );
    log("[verificarUsoSync] fim");
  } catch (err) {
    console.error("[verificarUsoSync] erro:", err);
  }
}




// Fim de Configurações====================================================================

// Init=====================================================================================
export async function prepararDOM(caminhoestilo = "assets/css/estilos.css") {
	let teste = "padrão";
	if (caminhoestilo != "assets/css/estilos.css") teste = "alternativo";
	console.log(`Preparando DOM. Estilo:${teste}`);
	await aguardarDOM();
	await injetarCSS(caminhoestilo);
}

async function aguardarDOM() {
	console.log("Aguardando DOM ficar pronto");
	return new Promise(resolve => {
		if (document.readyState === "complete" || document.readyState === "interactive") {
			resolve();
		} else {
			document.addEventListener("DOMContentLoaded", resolve);
		}
	});
}

export async function injetarCSS(caminho) {
	console.log("Inserindo estilo");
	return new Promise(resolve => {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = chrome.runtime.getURL(caminho);
		link.onload = resolve;
		document.head.appendChild(link);
		console.log("Estilo inserido");
	});
}


export function verificarRotasAtivas(rotas, configuracoes) {
	console.log("Filtrando rotas disponíveis");
	const rotasDisponiveis = rotas.filter(r => r.cond());
	if (rotasDisponiveis.length === 0) return [];
	console.log(`configurações: ${configuracoes}`);

	const rotasAtivas = rotasDisponiveis.filter(r => configuracoes.funcionalidades_ativas[r.nome] === true);
	return rotasAtivas;
}



// Fim de Init============================================================================================


//Consulta da página HTML formada

export function consulta_dados_processo() {
	console.log("Iniciando consulta de dados do processo");
  const capa = {
    numProcesso: document.querySelector("#txtNumProcesso")?.value?.trim() || document.querySelector("#txtNumProcesso")?.textContent?.trim() || null,
    magistrado: document.querySelector("#txtMagistrado")?.textContent?.trim() || null,
    classe: document.querySelector("#txtClasse")?.textContent?.trim() || null,
    competencia: document.querySelector("#txtCompetencia")?.textContent?.trim() || null,
    autuacao: document.querySelector("#txtAutuacao")?.textContent?.trim() || null,
    localidade: document.querySelector("#txtLocalidade")?.textContent?.trim() || null,
    situacao: document.querySelector("#txtSituacao")?.textContent?.trim() || null,
    orgaoJulgador: document.querySelector("#txtOrgaoJulgador")?.textContent?.trim() || null
  };

  const categorias = ["AUTOR", "REU", "INTERESSADO", "MPF", "PERITO"];
  const partes = {};

  categorias.forEach(tipo => {
    partes[tipo] = [];
    const seletores = document.querySelectorAll(`.infraNomeParte[data-parte="${tipo}"]`);
    seletores.forEach((el, idx) => {
      const nome = el.textContent?.trim() || null;
      const cpfEl = document.querySelector(
        `#spnCpfParte${tipo[0] + tipo.slice(1).toLowerCase()}${idx}`
      );
      const cpf = cpfEl?.textContent?.trim() || null;
      partes[tipo].push({ nome, cpf });
    });
  });

  return { capa, partes };
}

// Fim de Consulta da página HTML formada

export function limparEventos(elemento) {
  const clone = elemento.cloneNode(true);
  elemento.replaceWith(clone);
  return clone;
}


//Monitor
export function monitorarMudancaDeRota(mapaRotas, intervalo = 1000) {
  let ultimaUrl = window.location.href;

  const checar = () => {
    const atual = window.location.href;
    if (atual !== ultimaUrl) {
      ultimaUrl = atual;
      console.log("URL mudou para:", atual);

      for (const [rota, acao] of Object.entries(mapaRotas)) {
        if (atual.startsWith(rota)) {
          acao(atual);
        }
      }
    }
  };

  const monitor = setInterval(checar, intervalo);
  return () => clearInterval(monitor);
}

export function esperarElemento(seletor, callback) {
  const alvo = document.querySelector(seletor);
  if (alvo) return callback(alvo);

  const observer = new MutationObserver(() => {
    const el = document.querySelector(seletor);
    if (el) {
      observer.disconnect();
      callback(el);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
// Fim de monitor */