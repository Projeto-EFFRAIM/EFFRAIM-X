// ==========================================================
// Configurações (EFFRAIM)
// ==========================================================

export async function carregarConfiguracoes() {
	const existentes = await lerConfiguracoes();

	// carrega padrão da versão atual
	const resposta = await fetch(chrome.runtime.getURL("configuracoes.json"));
	const padrao = await resposta.json();

	// nenhum salvo ainda → grava padrão completo
	if (!Object.keys(existentes).length) {
		await chrome.storage.sync.set({ effraim_configuracoes: padrao });
		return padrao;
	}

	// há salvos: inclui apenas as chaves novas do padrão, sem sobrescrever preferências
	const mesclado = mesclarPadroes(padrao, existentes);
	if (mesclado._atualizado) {
		delete mesclado._atualizado;
		await chrome.storage.sync.set({ effraim_configuracoes: mesclado });
		return mesclado;
	}
	return existentes;
}

async function lerConfiguracoes() {
	return new Promise(resolve => {
		chrome.storage.sync.get("effraim_configuracoes", dados => {
			resolve(dados.effraim_configuracoes || {});
		});
	});
}

export async function zerarConfiguracoes() {
	return new Promise(resolve => {
		chrome.storage.sync.remove("effraim_configuracoes", resolve);
	});
}

// -----------------------------------------------------------
// Utilitário opcional para depuração de espaço (mantido para compatibilidade)
// -----------------------------------------------------------
export async function verificarUsoSync(log = console.log) {
	try {
		const data = await new Promise((resolve, reject) => {
			if (!chrome?.storage?.sync)
				return reject(new Error("chrome.storage.sync indisponível"));
			chrome.storage.sync.get(null, resolve);
		});

		const bytesUsados = new Blob([JSON.stringify(data)]).size;
		const limite = chrome.storage?.sync?.QUOTA_BYTES ?? 102400;
		log(
			`Sync usado: ${(bytesUsados / 1024).toFixed(1)} / ${(limite / 1024).toFixed(1)} KB`
		);
	} catch (err) {
		console.error("[EFFRAIM] verificarUsoSync erro:", err);
	}
}


// ----------------------------------------------------------
// Leitura e gravação (com suporte a .valor)
// ----------------------------------------------------------

export async function obterConfiguracao(caminho) {
	const dados = await lerConfiguracoes();
	const partes = caminho.split(".");
	let obj = dados;
	for (const p of partes) {
		if (obj == null) return undefined;
		obj = obj[p];
	}
	if (obj && typeof obj === "object" && "valor" in obj) return obj.valor;
	return obj;
}

export async function gravarConfiguracao(caminho, novoValor) {
	const dados = await lerConfiguracoes();
	const partes = caminho.split(".");
	let alvo = dados;

	for (let i = 0; i < partes.length - 1; i++) {
		const parte = partes[i];
		if (typeof alvo[parte] !== "object" || alvo[parte] === null) {
			alvo[parte] = {};
		}
		alvo = alvo[parte];
	}

	const chaveFinal = partes.at(-1);
	if (alvo[chaveFinal] && typeof alvo[chaveFinal] === "object" && "valor" in alvo[chaveFinal]) {
		alvo[chaveFinal].valor = novoValor;
	} else {
		alvo[chaveFinal] = novoValor;
	}

	await new Promise(resolve => chrome.storage.sync.set({ effraim_configuracoes: dados }, resolve));
	return dados;
}

// ----------------------------------------------------------
// Painel de Preferências
// ----------------------------------------------------------

console.log("[EFFRAIM] configuracoes.js carregado");

export async function montarPreferencias() {
	console.log("[EFFRAIM] iniciar montagem de preferências");

	const cfg = await carregarConfiguracoes().catch(err => {
		console.error("[EFFRAIM] erro ao carregar configurações:", err);
		return {};
	});

	const container = document.getElementById("preferencias");
	if (!container) return;

	container.innerHTML = "";
	const secoes = filtrarInternos(cfg);

	for (const [secao, dados] of Object.entries(secoes)) {
		const bloco = document.createElement("section");
		bloco.className = "secao-preferencia";

		const header = document.createElement("div");
		header.className = "cabecalho-secao";

		const titulo = document.createElement("h2");
		titulo.textContent = dados._meta?.nome || formatarChave(secao);

		const toggle = document.createElement("button");
		toggle.textContent = "▾";
		toggle.className = "toggle-secao";
		header.append(titulo, toggle);

		const corpo = document.createElement("div");
		corpo.className = "corpo-secao";

		adicionarCampos(corpo, secao, dados);

		toggle.addEventListener("click", () => {
			const visivel = corpo.style.display !== "none";
			corpo.style.display = visivel ? "none" : "block";
			toggle.textContent = visivel ? "▸" : "▾";
		});

		bloco.append(header, corpo);
		container.appendChild(bloco);
	}
}

// -----------------------------------------------------------
// Funções auxiliares
// -----------------------------------------------------------

function filtrarInternos(obj) {
	const limpo = {};
	for (const [k, v] of Object.entries(obj)) {
		if (k.startsWith("_")) continue;
		limpo[k] = v;
	}
	return limpo;
}

function formatarChave(chave) {
	return chave.replaceAll("_", " ").replace(/\b\w/g, l => l.toUpperCase());
}

// inclui no objeto destino apenas as chaves que existem no padrão e não estão salvas
function mesclarPadroes(padrao, salvos) {
	let houveAtualizacao = false;

	const merge = (src, dst) => {
		for (const [chave, valorPadrao] of Object.entries(src)) {
			const valorAtual = dst[chave];

			// se não existe no salvo, copia por completo
			if (typeof valorAtual === "undefined") {
				dst[chave] = clone(valorPadrao);
				houveAtualizacao = true;
				continue;
			}

			// se ambos são objetos (e não array), desce recursivamente
			if (
				valorPadrao &&
				typeof valorPadrao === "object" &&
				!Array.isArray(valorPadrao) &&
				valorAtual &&
				typeof valorAtual === "object" &&
				!Array.isArray(valorAtual)
			) {
				merge(valorPadrao, valorAtual);
			}
			// caso contrário, mantém o valor atual (não sobrescreve preferências)
		}
	};

	merge(padrao, salvos);

	// flag interna para sabermos se precisamos gravar de volta
	if (houveAtualizacao) salvos._atualizado = true;
	return salvos;
}

function clone(obj) {
	try {
		return structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
	} catch (e) {
		return JSON.parse(JSON.stringify(obj));
	}
}

function adicionarCampos(container, prefixo, objeto) {
	for (const [chave, valor] of Object.entries(objeto)) {
		if (chave.startsWith("_")) continue;

		const caminho = `${prefixo}.${chave}`;

		// nó com estrutura { valor, _meta }
		if (valor && typeof valor === "object" && "valor" in valor) {
			const linha = document.createElement("div");
			linha.className = "linha-preferencia";

			const label = document.createElement("label");
			label.textContent = valor._meta?.nome || formatarChave(chave);
			label.title = valor._meta?.explicacao || "";

			let input;
			if (typeof valor.valor === "boolean") {
				label.classList.add("toggle-label");
				input = document.createElement("input");
				input.type = "checkbox";
				input.checked = valor.valor;
				const slider = document.createElement("span");
				slider.className = "slider";
				label.append(input, slider);
				linha.appendChild(label);
			} else {
				// Caso especial: select para tipo de ação SISBAJUD
				if (caminho === "opcoes_sisbajud.favoritos.tipoAcao") {
					input = document.createElement("select");
					const opcoes = [
						"Ação Cível",
						"Ação Criminal",
						"Ação Trabalhista",
						"Execução Fiscal",
						"Execução de Alimentos"
					];
					opcoes.forEach(opt => {
						const o = document.createElement("option");
						o.value = opt;
						o.textContent = opt;
						if (String(valor.valor) === opt) o.selected = true;
						input.appendChild(o);
					});
					linha.append(label, input);
				} else {
					input = document.createElement("input");
					input.type = "text";
					input.value = valor.valor ?? "";
					input.disabled = false;
					input.title = valor._meta?.explicacao || "";
					linha.append(label, input);
				}
			}

			let timer;
			input.addEventListener("change", async () => {
				if (input.disabled) return;
				clearTimeout(timer);
				timer = setTimeout(async () => {
					const novoValor = input.type === "checkbox" ? input.checked : input.value;
					await gravarConfiguracao(caminho, novoValor);
					console.log("[EFFRAIM] atualizado:", caminho, "=", novoValor);
				}, 300);
			});

			container.appendChild(linha);
			continue;
		}

		// recursão para subgrupos (sem .valor)
		if (valor && typeof valor === "object") {
			const sub = document.createElement("div");
			sub.className = "subgrupo";
			const subtitulo = document.createElement("h3");
			subtitulo.textContent = valor._meta?.nome || formatarChave(chave);
			subtitulo.title = valor._meta?.explicacao || "";
			sub.appendChild(subtitulo);
			adicionarCampos(sub, caminho, valor);
			container.appendChild(sub);
		}
	}
}

// -----------------------------------------------------------
// Autoexecução
// -----------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
	const btnReset = document.getElementById("btn-reset-config");
	if (btnReset) {
		btnReset.addEventListener("click", async () => {
			try {
				btnReset.disabled = true;
				await zerarConfiguracoes();
				await carregarConfiguracoes(); // repõe padrão
				await montarPreferencias();
			} catch (e) {
				console.error("[EFFRAIM] erro ao restaurar padrões:", e);
			} finally {
				btnReset.disabled = false;
			}
		});
	}

	if (document.getElementById("preferencias")) montarPreferencias();
});
