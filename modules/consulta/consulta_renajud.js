import { criarPainelDeslizantePadrao, forcarAberturaPainelDeslizante } from "../utils/interface.js";
import { consulta_dados_processo } from "../../funcoes.js";
import { obterConfiguracao } from "../utils/configuracoes.js";

const RENAJUD_URL_NOVO_INSERIR = "https://renajud.pdpj.jus.br/veiculo/pesquisa";
const RENAJUD_URL_NOVO_RETIRAR = "https://renajud.pdpj.jus.br/veiculo/restricao/pesquisa";
const RENAJUD_URL_ANTIGO_LOGIN = "https://renajud.denatran.serpro.gov.br/renajud/login.jsf";
const CHAVE_JOB_RENAJUD_PREFIXO = "effraim_renajud_job_";

async function gravarJobRenajud(chaveJob, dadosJob) {
	try {
		if (chrome.storage?.session?.set) {
			await chrome.storage.session.set({ [chaveJob]: { ...dadosJob, _storage: "session" } });
			return "session";
		}
	} catch (e) {
		console.debug("[RENAJUD painel] storage.session indisponivel; usando storage.local.", e);
	}
	await chrome.storage.local.set({ [chaveJob]: { ...dadosJob, _storage: "local" } });
	return "local";
}

const DEFAULTS = {
	ambiente: "antigo",
	acaoNovo: "inserir",
	acaoAntigo: "inserir",
	parametroNovo: "cpf_cnpj",
	parametroAntigo: "cpf_cnpj",
	tipoRestricaoPadrao: "transferencia",
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
		obterConfiguracao("opcoes_renajud.novo.acao_padrao"),
		obterConfiguracao("opcoes_renajud.antigo.acao_padrao"),
		obterConfiguracao("opcoes_renajud.novo.parametro_pesquisa_padrao"),
		obterConfiguracao("opcoes_renajud.antigo.parametro_pesquisa_padrao"),
		obterConfiguracao("opcoes_renajud.novo.ramo_justica_padrao"),
		obterConfiguracao("opcoes_renajud.novo.tribunal_preferido"),
		obterConfiguracao("opcoes_renajud.novo.orgao_preferido")
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

function obterValorPadraoExecucaoPenhora(dadosProcesso) {
	return String(dadosProcesso?.capa?.valorCausa || "").trim();
}

function obterDataHojePtBr() {
	try {
		const agora = new Date();
		const dd = String(agora.getDate()).padStart(2, "0");
		const mm = String(agora.getMonth() + 1).padStart(2, "0");
		const yyyy = String(agora.getFullYear());
		return `${dd}/${mm}/${yyyy}`;
	} catch {
		return "";
	}
}

function normalizarDataPtBr(valor) {
	const digitos = String(valor || "").replace(/\D/g, "").slice(0, 8);
	if (digitos.length <= 2) return digitos;
	if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
	return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

function normalizarMoedaPtBr(valor) {
	let v = String(valor || "").trim();
	if (!v) return "";
	v = v.replace(/[R$\s]/g, "");
	v = v.replace(/\./g, "");
	v = v.replace(/,/g, ".");
	v = v.replace(/[^0-9.]/g, "");
	const n = Number.parseFloat(v);
	if (!Number.isFinite(n)) return "";
	return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function dataPtBrValida(valor) {
	const m = String(valor || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
	if (!m) return false;
	const dd = Number(m[1]);
	const mm = Number(m[2]);
	const yyyy = Number(m[3]);
	if (yyyy < 1900 || yyyy > 2100) return false;
	if (mm < 1 || mm > 12) return false;
	if (dd < 1 || dd > 31) return false;
	const dt = new Date(yyyy, mm - 1, dd);
	return dt.getFullYear() === yyyy && dt.getMonth() === (mm - 1) && dt.getDate() === dd;
}

function moedaPtBrValida(valor) {
	const v = String(valor || "").trim();
	if (!v) return false;
	return /^(\d{1,3}(\.\d{3})*|\d+),\d{2}$/.test(v);
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
		const tipoRestricaoRadios = [...conteudo.querySelectorAll('input[name="renajud-tipo-restricao"]')];
		const consultadoRadios = [...conteudo.querySelectorAll('input[name="consultado"]')];
		const inputValorManual = conteudo.querySelector("#renajud-valor-manual");
		const blocoValorManual = conteudo.querySelector("#renajud-bloco-valor-manual");
		const blocoSomenteSemRestricoes = conteudo.querySelector("#renajud-bloco-sem-restricoes");
		const blocoPenhora = conteudo.querySelector("#renajud-bloco-penhora");
		const inputPenhoraValorAvaliacao = conteudo.querySelector("#renajud-penhora-valor-avaliacao");
		const inputPenhoraDataPenhora = conteudo.querySelector("#renajud-penhora-data-penhora");
		const inputPenhoraValorExecucao = conteudo.querySelector("#renajud-penhora-valor-execucao");
		const inputPenhoraDataExecucao = conteudo.querySelector("#renajud-penhora-data-execucao");
		const aviso = conteudo.querySelector("#renajud-aviso-validacao");
		const btnProsseguir = conteudo.querySelector("#btn-prosseguir-renajud");

		const aplicarMascarasPenhora = () => {
			const normalizarInputData = (el) => {
				if (!el) return;
				el.value = normalizarDataPtBr(el.value);
			};
			const normalizarInputMoeda = (el) => {
				if (!el) return;
				const normalizado = normalizarMoedaPtBr(el.value);
				if (normalizado) el.value = normalizado;
			};

			inputPenhoraDataPenhora?.addEventListener("input", () => normalizarInputData(inputPenhoraDataPenhora));
			inputPenhoraDataExecucao?.addEventListener("input", () => normalizarInputData(inputPenhoraDataExecucao));
			inputPenhoraValorAvaliacao?.addEventListener("blur", () => normalizarInputMoeda(inputPenhoraValorAvaliacao));
			inputPenhoraValorExecucao?.addEventListener("blur", () => normalizarInputMoeda(inputPenhoraValorExecucao));
		};

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
			const ambiente = getValorSelecionado("renajud-ambiente");
			const acao = getValorSelecionado("renajud-acao");
			const tipoRestricao = getValorSelecionado("renajud-tipo-restricao");
			const precisaDoc = parametro === "cpf_cnpj";
			const precisaValorManual = parametro === "placa" || parametro === "chassi";
			const precisaPenhora = tipoRestricao === "penhora";
			const valorManual = String(inputValorManual?.value || "").trim();
			const valorAvaliacao = String(inputPenhoraValorAvaliacao?.value || "").trim();
			const dataPenhora = String(inputPenhoraDataPenhora?.value || "").trim();
			const valorExecucao = String(inputPenhoraValorExecucao?.value || "").trim();
			const dataExecucao = String(inputPenhoraDataExecucao?.value || "").trim();

			if (blocoValorManual) blocoValorManual.style.display = precisaValorManual ? "block" : "none";
			const exibirFiltroSemRestricoes = ambiente === "antigo" && acao === "inserir";
			if (blocoSomenteSemRestricoes) blocoSomenteSemRestricoes.style.display = exibirFiltroSemRestricoes ? "block" : "none";
			if (blocoPenhora) blocoPenhora.style.display = precisaPenhora ? "block" : "none";

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
		for (const r of tipoRestricaoRadios) r.addEventListener("change", atualizarEstado);
		for (const r of acaoRadios) r.addEventListener("change", atualizarEstado);
		for (const r of consultadoRadios) r.addEventListener("change", atualizarEstado);
		inputValorManual?.addEventListener("input", atualizarEstado);
		inputPenhoraValorAvaliacao?.addEventListener("input", atualizarEstado);
		inputPenhoraDataPenhora?.addEventListener("input", atualizarEstado);
		inputPenhoraValorExecucao?.addEventListener("input", atualizarEstado);
		inputPenhoraDataExecucao?.addEventListener("input", atualizarEstado);
		aplicarMascarasPenhora();

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
				tipoRestricao: payload?.opcoes?.tipo_restricao,
				valorManual: payload?.opcoes?.valor_manual_pesquisa,
				penhoraDados: payload?.opcoes?.penhora_dados,
				somenteSemRestricoes: payload?.opcoes?.mostrar_somente_sem_restricoes_renajud
			});
			const destino = resolverDestino(payload.opcoes);
			if (String(payload?.opcoes?.ambiente || "").toLowerCase() === "antigo") {
				void abrirRenajudEmNovaAba(conteudo, payload, destino.url);
			} else {
				injetarIframe(conteudo, payload, destino.url, destino.origem);
			}
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
	const tipoRestricaoPadrao = DEFAULTS.tipoRestricaoPadrao;
	const valorExecucaoPadraoPenhora = obterValorPadraoExecucaoPenhora(dados);
	const dataAtualizacaoExecucaoPadrao = obterDataHojePtBr();

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
			<div id="renajud-bloco-sem-restricoes" style="display:none; margin-bottom:10px; padding:8px; border:1px solid #d8e5ee; border-radius:6px; background:#f9fcff;">
				<label style="display:flex; align-items:flex-start; gap:8px;">
					<input id="renajud-somente-sem-restricoes" type="checkbox" checked>
					<span>Mostrar somente veículos sem restrições RENAJUD (inserção no RENAJUD antigo)</span>
				</label>
			</div>
			<h3 style="margin:8px 0;">Tipo de restrição</h3>
			<div style="display:flex; gap:14px; flex-wrap:wrap; margin-bottom:10px;">
				<label><input type="radio" name="renajud-tipo-restricao" value="transferencia" ${tipoRestricaoPadrao === "transferencia" ? "checked" : ""}> Transferência</label>
				<label><input type="radio" name="renajud-tipo-restricao" value="licenciamento" ${tipoRestricaoPadrao === "licenciamento" ? "checked" : ""}> Licenciamento</label>
				<label><input type="radio" name="renajud-tipo-restricao" value="circulacao" ${tipoRestricaoPadrao === "circulacao" ? "checked" : ""}> Circulação</label>
				<label><input type="radio" name="renajud-tipo-restricao" value="penhora" ${tipoRestricaoPadrao === "penhora" ? "checked" : ""}> Penhora</label>
			</div>
			<div id="renajud-bloco-penhora" style="display:none; margin-bottom:10px; padding:8px; border:1px solid #d8e5ee; border-radius:6px; background:#f9fcff;">
				<div style="font-weight:600; margin-bottom:6px;">Dados da penhora</div>
				<div style="display:grid; grid-template-columns:minmax(240px, 1.3fr) minmax(180px, 1fr); gap:8px; margin-bottom:8px;">
					<label style="display:flex; flex-direction:column; gap:4px;">Valor da Avaliação do Veículo (R$)
						<input id="renajud-penhora-valor-avaliacao" type="text" placeholder="Ex.: 35000,00">
					</label>
					<label style="display:flex; flex-direction:column; gap:4px;">Data da Penhora
						<input id="renajud-penhora-data-penhora" type="text" placeholder="dd/mm/aaaa">
					</label>
				</div>
				<div style="display:grid; grid-template-columns:minmax(240px, 1.3fr) minmax(220px, 1fr); gap:8px;">
					<label style="display:flex; flex-direction:column; gap:4px;">Valor da Execução (R$)
						<input id="renajud-penhora-valor-execucao" type="text" placeholder="Ex.: 12000,00" value="${escapeHtml(valorExecucaoPadraoPenhora)}">
					</label>
					<label style="display:flex; flex-direction:column; gap:4px;">Data da Atualização do Valor da Execução
						<input id="renajud-penhora-data-execucao" type="text" placeholder="dd/mm/aaaa" value="${escapeHtml(dataAtualizacaoExecucaoPadrao)}">
					</label>
				</div>
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
	const tipoRestricao = conteudo.querySelector('input[name="renajud-tipo-restricao"]:checked')?.value || "transferencia";
	const valorManualPesquisa = String(conteudo.querySelector("#renajud-valor-manual")?.value || "").trim();
	const mostrarSomenteSemRestricoesRenajud = !!conteudo.querySelector("#renajud-somente-sem-restricoes")?.checked;
	const penhoraDados = {
		valor_avaliacao_veiculo: String(conteudo.querySelector("#renajud-penhora-valor-avaliacao")?.value || "").trim(),
		data_penhora: String(conteudo.querySelector("#renajud-penhora-data-penhora")?.value || "").trim(),
		valor_execucao: String(conteudo.querySelector("#renajud-penhora-valor-execucao")?.value || "").trim(),
		data_execucao: String(conteudo.querySelector("#renajud-penhora-data-execucao")?.value || "").trim()
	};

	return {
		dados_processo: dadosProcesso,
		consultante,
		consultados,
		opcoes: {
			ambiente,
			acao,
			parametro_pesquisa: parametroPesquisa,
			tipo_restricao: tipoRestricao,
			valor_manual_pesquisa: valorManualPesquisa,
			penhora_dados: penhoraDados,
			mostrar_somente_sem_restricoes_renajud: mostrarSomenteSemRestricoesRenajud
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

function gerarJobId() {
	try {
		return crypto.randomUUID();
	} catch {
		return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
	}
}

function montarUrlComJob(urlDestino, jobId) {
	const url = new URL(urlDestino);
	const hashAtual = String(url.hash || "").replace(/^#/, "");
	const params = new URLSearchParams(hashAtual);
	params.set("effraimJob", jobId);
	url.hash = params.toString();
	return url.toString();
}

async function abrirRenajudEmNovaAba(conteudo, payload, urlDestino) {
	const jobId = gerarJobId();
	const chaveJob = `${CHAVE_JOB_RENAJUD_PREFIXO}${jobId}`;
	const dadosJob = {
		type: "EFFRAIM_DADOS_RENAJUD",
		dados: payload,
		criadoEm: Date.now(),
		origem: window.location.origin
	};

	console.log("[RENAJUD painel] Gravando job para nova aba.", { jobId, chaveJob, urlDestino });
	try {
		const backend = await gravarJobRenajud(chaveJob, dadosJob);
		console.log("[RENAJUD painel] Job gravado.", { jobId, chaveJob, backend });
	} catch (e) {
		console.error("[RENAJUD painel] Falha ao gravar job no storage (session/local).", e);
		conteudo.innerHTML = '<div style="color:#8a1f11;background:#fff1ef;border:1px solid #f1b5ae;padding:8px;border-radius:6px;">Falha ao preparar abertura do RENAJUD em nova aba.</div>';
		return;
	}

	const urlComJob = montarUrlComJob(urlDestino, jobId);
	const status = document.createElement("div");
	status.style.cssText = "padding:8px;border:1px solid #b8d7f1;background:#eef7ff;border-radius:6px;color:#163a59;";
	status.textContent = "Abrindo RENAJUD em nova aba...";
	conteudo.innerHTML = "";
	conteudo.appendChild(status);

	chrome.runtime.sendMessage({ type: "EFFRAIM_ABRIR_RENAJUD_ABA", url: urlComJob }, (resposta) => {
		const erro = chrome.runtime.lastError;
		if (erro || !resposta?.ok) {
			console.error("[RENAJUD painel] Falha ao abrir nova aba.", erro || resposta);
			status.style.cssText = "padding:8px;border:1px solid #f1b5ae;background:#fff1ef;border-radius:6px;color:#8a1f11;";
			status.textContent = "Nao foi possivel abrir o RENAJUD em nova aba.";
			return;
		}
		console.log("[RENAJUD painel] Nova aba RENAJUD aberta.", { tabId: resposta.tabId, jobId });
		status.style.cssText = "padding:8px;border:1px solid #cbe8bf;background:#f1fff0;border-radius:6px;color:#1f5a15;";
		status.textContent = "RENAJUD aberto em nova aba. Conclua o login e acompanhe a automacao.";
	});
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
