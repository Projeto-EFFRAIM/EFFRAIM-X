import { criarPainelDeslizantePadrao, forcarAberturaPainelDeslizante } from "../utils/interface.js";
import { consulta_dados_processo } from "../../funcoes.js";
import { obterConfiguracao } from "../utils/configuracoes.js";

const RENAJUD_URL_NOVO_INSERIR = "https://renajud.pdpj.jus.br/veiculo/pesquisa";
const RENAJUD_URL_NOVO_RETIRAR = "https://renajud.pdpj.jus.br/veiculo/restricao/pesquisa";
const RENAJUD_URL_ANTIGO_LOGIN = "https://renajud.denatran.serpro.gov.br/renajud/login.jsf";

const DEFAULTS = {
	ambiente: "antigo",
	acaoNovo: "inserir",
	acaoAntigo: "inserir",
	parametroNovo: "cpf_cnpj",
	parametroAntigo: "cpf_cnpj",
	ramoJusticaNovo: "JUSTICA DO TRABALHO",
	tribunalNovo: "",
	orgaoNovo: ""
};

export function init() {
	const botao = document.getElementById("btn-renajud");
	if (!botao) {
		console.warn("Botao #btn-renajud nao encontrado.");
		return;
	}

	const painel = criarPainelDeslizantePadrao("painel-renajud", botao, "RENAJUD");
	Object.assign(painel.style, {
		background: "#f7fbff",
		color: "#0b2e4b",
		maxHeight: "",
		overflowY: "",
		paddingRight: "12px"
	});

	const conteudo = document.createElement("div");
	conteudo.id = "conteudo-renajud";
	conteudo.style.padding = "8px";
	conteudo.textContent = "Clique no botao RENAJUD para montar a consulta.";
	painel.appendChild(conteudo);

	botao.addEventListener("click", () => {
		forcarAberturaPainelDeslizante(painel);
		void montarPainel(conteudo);
	});

	console.log("Painel RENAJUD inicializado.");
}

async function carregarPreferenciasRenajud() {
	const [
		ambientePadrao,
		acaoNovo,
		acaoAntigo,
		parametroNovo,
		parametroAntigo,
		ramoJusticaNovo,
		tribunalNovo,
		orgaoNovo
	] = await Promise.all([
		obterConfiguracao("opcoes_renajud.ambiente_padrao"),
		obterConfiguracao("opcoes_renajud_novo.acao_padrao"),
		obterConfiguracao("opcoes_renajud_antigo.acao_padrao"),
		obterConfiguracao("opcoes_renajud_novo.parametro_pesquisa_padrao"),
		obterConfiguracao("opcoes_renajud_antigo.parametro_pesquisa_padrao"),
		obterConfiguracao("opcoes_renajud_novo.ramo_justica_padrao"),
		obterConfiguracao("opcoes_renajud_novo.tribunal_preferido"),
		obterConfiguracao("opcoes_renajud_novo.orgao_preferido")
	]);

	return {
		ambientePadrao: normalizarOpcao(ambientePadrao, ["novo", "antigo"], DEFAULTS.ambiente),
		acaoNovo: normalizarOpcao(acaoNovo, ["inserir", "retirar", "consultar"], DEFAULTS.acaoNovo),
		acaoAntigo: normalizarOpcao(acaoAntigo, ["inserir", "retirar", "consultar"], DEFAULTS.acaoAntigo),
		parametroNovo: normalizarOpcao(
			parametroNovo,
			["numero_processo", "placa", "chassi", "cpf_cnpj"],
			DEFAULTS.parametroNovo
		),
		parametroAntigo: normalizarOpcao(
			parametroAntigo,
			["numero_processo", "placa", "chassi", "cpf_cnpj"],
			DEFAULTS.parametroAntigo
		),
		ramoJusticaNovo: String(ramoJusticaNovo || DEFAULTS.ramoJusticaNovo).trim(),
		tribunalNovo: String(tribunalNovo || DEFAULTS.tribunalNovo).trim(),
		orgaoNovo: String(orgaoNovo || DEFAULTS.orgaoNovo).trim()
	};
}

function normalizarOpcao(valor, validos, fallback) {
	const v = String(valor || "").trim().toLowerCase();
	return validos.includes(v) ? v : fallback;
}

async function montarPainel(conteudo) {
	try {
		const [dadosProcesso, preferencias] = await Promise.all([
			Promise.resolve(window.__EFFRAIM_DADOS_PROCESSO || consulta_dados_processo()),
			carregarPreferenciasRenajud()
		]);
		conteudo.innerHTML = gerarPainelRenajud(dadosProcesso, preferencias);

		const ambienteRadios = [...conteudo.querySelectorAll('input[name="renajud-ambiente"]')];
		const acaoRadios = [...conteudo.querySelectorAll('input[name="renajud-acao"]')];
		const parametroRadios = [...conteudo.querySelectorAll('input[name="renajud-parametro"]')];
		const consultadoRadios = [...conteudo.querySelectorAll('input[name="consultado"]')];
		const inputValorManual = conteudo.querySelector("#renajud-valor-manual");
		const blocoValorManual = conteudo.querySelector("#renajud-bloco-valor-manual");
		const aviso = conteudo.querySelector("#renajud-aviso-validacao");
		const btnProsseguir = conteudo.querySelector("#btn-prosseguir-renajud");

		const getValorSelecionado = (name) => conteudo.querySelector(`input[name="${name}"]:checked`)?.value || "";

		const atualizarDefaultsPorAmbiente = () => {
			const ambiente = getValorSelecionado("renajud-ambiente");
			const acaoDefault = ambiente === "antigo" ? preferencias.acaoAntigo : preferencias.acaoNovo;
			const parametroDefault = ambiente === "antigo" ? preferencias.parametroAntigo : preferencias.parametroNovo;

			const acaoChecked = getValorSelecionado("renajud-acao");
			const parametroChecked = getValorSelecionado("renajud-parametro");

			if (!acaoChecked || !acaoRadios.some((r) => r.checked)) {
				const a = acaoRadios.find((r) => r.value === acaoDefault);
				if (a) a.checked = true;
			}
			if (!parametroChecked || !parametroRadios.some((r) => r.checked)) {
				const p = parametroRadios.find((r) => r.value === parametroDefault);
				if (p) p.checked = true;
			}
		};

		const atualizarEstado = () => {
			const selecionado = conteudo.querySelector('input[name="consultado"]:checked');
			const doc = String(selecionado?.dataset?.cpf || "").replace(/\D/g, "");
			const parametro = getValorSelecionado("renajud-parametro");
			const precisaDoc = parametro === "cpf_cnpj";
			const precisaValorManual = parametro === "placa" || parametro === "chassi";
			const valorManual = String(inputValorManual?.value || "").trim();

			if (blocoValorManual) blocoValorManual.style.display = precisaValorManual ? "block" : "none";

			let valido = true;
			let mensagem = "";
			if (!selecionado) {
				valido = false;
				mensagem = "Selecione um consultado para continuar.";
			} else if (precisaDoc && !doc) {
				valido = false;
				mensagem = "O consultado selecionado nao possui CPF/CNPJ.";
			} else if (precisaValorManual && !valorManual) {
				valido = false;
				mensagem = `Preencha ${parametro === "placa" ? "a placa" : "o chassi"} para continuar.`;
			}

			if (btnProsseguir) btnProsseguir.disabled = !valido;
			if (aviso) {
				aviso.textContent = mensagem;
				aviso.style.display = mensagem ? "block" : "none";
			}
		};

		for (const r of ambienteRadios) {
			r.addEventListener("change", () => {
				const ambiente = getValorSelecionado("renajud-ambiente");
				const acaoDefault = ambiente === "antigo" ? preferencias.acaoAntigo : preferencias.acaoNovo;
				const parametroDefault = ambiente === "antigo" ? preferencias.parametroAntigo : preferencias.parametroNovo;
				const acao = acaoRadios.find((x) => x.value === acaoDefault);
				const parametro = parametroRadios.find((x) => x.value === parametroDefault);
				if (acao) acao.checked = true;
				if (parametro) parametro.checked = true;
				atualizarEstado();
			});
		}
		for (const r of parametroRadios) r.addEventListener("change", atualizarEstado);
		for (const r of consultadoRadios) r.addEventListener("change", atualizarEstado);
		inputValorManual?.addEventListener("input", atualizarEstado);

		btnProsseguir?.addEventListener("click", () => {
			const payload = coletarDados(conteudo, dadosProcesso, preferencias);
			if (!payload.consultados.length) {
				if (aviso) {
					aviso.textContent = "Nenhum consultado valido para envio.";
					aviso.style.display = "block";
				}
				return;
			}

			console.log("[RENAJUD painel] Payload antes de prosseguir:", {
				ambiente: payload?.opcoes?.ambiente,
				acao: payload?.opcoes?.acao,
				parametro: payload?.opcoes?.parametro_pesquisa,
				valorManual: payload?.opcoes?.valor_manual_pesquisa
			});
			const destino = resolverDestino(payload.opcoes);
			injetarIframe(conteudo, payload, destino.url, destino.origem);
		});

		atualizarDefaultsPorAmbiente();
		atualizarEstado();
	} catch (e) {
		conteudo.textContent = "Erro ao montar painel RENAJUD.";
		console.error(e);
	}
}

function gerarPainelRenajud(dados, preferencias) {
	const ambientePadrao = preferencias.ambientePadrao;
	const acaoPadrao = ambientePadrao === "antigo" ? preferencias.acaoAntigo : preferencias.acaoNovo;
	const parametroPadrao = ambientePadrao === "antigo" ? preferencias.parametroAntigo : preferencias.parametroNovo;

	return `
		<div style="max-height:520px; overflow-y:auto; padding:8px 12px 8px 8px; box-sizing:border-box;">
			<h3 style="margin:4px 0 8px;">Ambiente do RENAJUD</h3>
			<div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:10px;">
				<label><input type="radio" name="renajud-ambiente" value="novo" ${ambientePadrao === "novo" ? "checked" : ""}> Novo</label>
				<label><input type="radio" name="renajud-ambiente" value="antigo" ${ambientePadrao === "antigo" ? "checked" : ""}> Antigo</label>
			</div>

			<h3 style="margin:8px 0;">Tipo de consulta</h3>
			<div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:10px;">
				<label><input type="radio" name="renajud-acao" value="inserir" ${acaoPadrao === "inserir" ? "checked" : ""}> Inserir</label>
				<label><input type="radio" name="renajud-acao" value="retirar" ${acaoPadrao === "retirar" ? "checked" : ""}> Retirar</label>
				<label><input type="radio" name="renajud-acao" value="consultar" ${acaoPadrao === "consultar" ? "checked" : ""}> Consultar</label>
			</div>

			<h3 style="margin:8px 0;">Parametro de pesquisa</h3>
			<div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:10px;">
				<label><input type="radio" name="renajud-parametro" value="numero_processo" ${parametroPadrao === "numero_processo" ? "checked" : ""}> Processo</label>
				<label><input type="radio" name="renajud-parametro" value="placa" ${parametroPadrao === "placa" ? "checked" : ""}> Placa</label>
				<label><input type="radio" name="renajud-parametro" value="chassi" ${parametroPadrao === "chassi" ? "checked" : ""}> Chassi</label>
				<label><input type="radio" name="renajud-parametro" value="cpf_cnpj" ${parametroPadrao === "cpf_cnpj" ? "checked" : ""}> CPF/CNPJ</label>
			</div>
			<div id="renajud-bloco-valor-manual" style="display:none; margin-bottom:10px;">
				<label for="renajud-valor-manual" style="display:block; font-weight:600; margin-bottom:4px;">Valor para pesquisa manual</label>
				<input id="renajud-valor-manual" type="text" placeholder="Preencha placa ou chassi" style="width:100%; max-width:340px;">
			</div>

			<h3 style="margin:8px 0;">Consultante (autores)</h3>
			${renderConsultanteFixo(dados.partes?.AUTOR)}

			<h3 style="margin:8px 0;">Selecione o consultado (apenas um)</h3>
			${gerarListaPartes(dados.partes?.REU)}

			<div id="renajud-aviso-validacao" style="display:none; margin-top:10px; padding:8px; border:1px solid #d8aa6f; background:#fff7e8; border-radius:6px; color:#734b00;"></div>
		</div>
		<div style="position:sticky; bottom:0; background:#f7fbff; padding:8px 0; text-align:center; border-top:1px solid #ccc;">
			<button id="btn-prosseguir-renajud" type="button">Prosseguir</button>
		</div>
	`;
}

function gerarListaPartes(partes = []) {
	if (!Array.isArray(partes) || partes.length === 0) {
		return "<p>Nenhum consultado encontrado.</p>";
	}
	let idxPadrao = partes.findIndex((parte) => String(parte?.cpf || "").replace(/\D/g, ""));
	if (idxPadrao < 0) idxPadrao = 0;

	return partes.map((parte, i) => {
		const nome = parte?.nome || "(sem nome)";
		const cpf = parte?.cpf || "";
		const cpfHtml = cpf ? `(${cpf})` : `<span class="effraim-texto-atencao">CPF/CNPJ nao informado</span>`;
		return `
			<div class="linha_parte" style="margin-bottom:6px;">
				<label>
					<input type="radio" name="consultado" value="${i}" data-nome="${escapeHtml(nome)}" data-cpf="${escapeHtml(cpf)}" ${i === idxPadrao ? "checked" : ""}>
					<span style="font-weight:600;">${escapeHtml(nome)}</span> ${cpfHtml}
				</label>
			</div>
		`;
	}).join("");
}

function renderConsultanteFixo(autores = []) {
	if (!Array.isArray(autores) || autores.length === 0) {
		return '<p class="effraim-texto-atencao">Sem autores encontrados.</p>';
	}
	return autores.map((a) => {
		const nome = a?.nome || "(sem nome)";
		const cpf = a?.cpf || "";
		const cpfHtml = cpf ? `(${escapeHtml(cpf)})` : '<span class="effraim-texto-atencao">CPF/CNPJ nao informado</span>';
		return `<div style="margin-bottom:4px; font-weight:600;">${escapeHtml(nome)} ${cpfHtml}</div>`;
	}).join("");
}

function escapeHtml(valor) {
	return String(valor || "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

function coletarDados(conteudo, dadosProcesso, preferencias) {
	const autores = dadosProcesso?.partes?.AUTOR || [];
	const primeiroAutorComDoc = autores.find((a) => String(a?.cpf || "").replace(/\D/g, ""));
	const baseConsultante = primeiroAutorComDoc || autores[0] || null;
	const consultante = baseConsultante ? { nome: baseConsultante.nome, cpf: baseConsultante.cpf } : null;

	const consultadoSelecionado = conteudo.querySelector('input[name="consultado"]:checked');
	const consultados = [];
	if (consultadoSelecionado) {
		consultados.push({
			nome: consultadoSelecionado.dataset.nome || "",
			cpf: consultadoSelecionado.dataset.cpf || "",
			valor_penhora: null
		});
	}

	const ambiente = conteudo.querySelector('input[name="renajud-ambiente"]:checked')?.value || "novo";
	const acao = conteudo.querySelector('input[name="renajud-acao"]:checked')?.value || "inserir";
	const parametroPesquisa = conteudo.querySelector('input[name="renajud-parametro"]:checked')?.value || "cpf_cnpj";
	const valorManualPesquisa = String(conteudo.querySelector("#renajud-valor-manual")?.value || "").trim();

	return {
		dados_processo: dadosProcesso,
		consultante,
		consultados,
		opcoes: {
			ambiente,
			acao,
			parametro_pesquisa: parametroPesquisa,
			valor_manual_pesquisa: valorManualPesquisa
		},
		preferencias_renajud_novo: {
			ramo_justica_padrao: preferencias.ramoJusticaNovo,
			tribunal_preferido: preferencias.tribunalNovo,
			orgao_preferido: preferencias.orgaoNovo
		}
	};
}

function resolverDestino(opcoes) {
	const ambiente = String(opcoes?.ambiente || "novo");
	const acao = String(opcoes?.acao || "inserir");
	if (ambiente === "antigo") {
		return { url: RENAJUD_URL_ANTIGO_LOGIN, origem: "https://renajud.denatran.serpro.gov.br" };
	}
	if (acao === "retirar" || acao === "consultar") {
		return { url: RENAJUD_URL_NOVO_RETIRAR, origem: "https://renajud.pdpj.jus.br" };
	}
	return { url: RENAJUD_URL_NOVO_INSERIR, origem: "https://renajud.pdpj.jus.br" };
}

function injetarIframe(conteudo, payload, urlDestino, origemDestino) {
	conteudo.innerHTML = "";
	const iframe = document.createElement("iframe");
	iframe.id = "effraim-iframe-renajud";
	iframe.src = urlDestino;
	Object.assign(iframe.style, {
		width: "100%",
		height: "100%",
		minHeight: "360px",
		border: "none",
		background: "#fff"
	});
	conteudo.appendChild(iframe);

	iframe.addEventListener("load", () => {
		iframe.contentWindow.postMessage(
			{
				type: "EFFRAIM_DADOS_RENAJUD",
				dados: payload,
				origem: window.location.origin
			},
			origemDestino
		);
	});
}
