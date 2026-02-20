import { iniciarTour } from "./core_tour.js";

const LOG_PREFIXO = "[EFFRAIM tutorial_lista_partes_aprimorada]";
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function logInfo(mensagem, dados) {
	if (dados !== undefined) console.info(`${LOG_PREFIXO} ${mensagem}`, dados);
	else console.info(`${LOG_PREFIXO} ${mensagem}`);
}

async function prepararCenarioComColapsavel() {
	const tabela = document.getElementById("tblPartesERepresentantes");
	const tbody = tabela?.querySelector("tbody");
	if (!tbody) {
		logInfo("Tabela de partes não encontrada para preparo do cenário.");
		return;
	}

	if (document.querySelector(".effraim-lista-partes-toggle")) {
		logInfo("Colapsável já presente. Preparo de cenário ignorado.");
		return;
	}

	const linhas = [...tbody.querySelectorAll(":scope > tr")];
	let cabecalho = null;
	let primeiraLinhaDados = null;

	for (let i = 0; i < linhas.length; i += 1) {
		const tr = linhas[i];
		const ths = tr.querySelectorAll("th");
		if (ths.length >= 2) {
			cabecalho = tr;
			primeiraLinhaDados = linhas[i + 1] || null;
			break;
		}
	}

	if (!cabecalho || !primeiraLinhaDados || primeiraLinhaDados.querySelector("th")) {
		logInfo("Não foi possível encontrar grupo AUTOR/REU para gerar cenário.");
		return;
	}

	for (let i = 0; i < 2; i += 1) {
		const clone = primeiraLinhaDados.cloneNode(true);
		clone.dataset.effraimTutorialClonePartes = "1";
		primeiraLinhaDados.insertAdjacentElement("afterend", clone);
	}
	logInfo("Linhas de demonstração adicionadas para forçar colapsável.");

	for (let tentativa = 1; tentativa <= 8; tentativa += 1) {
		await esperar(180);
		const toggle = document.querySelector(".effraim-lista-partes-toggle");
		if (toggle) {
			logInfo("Colapsável detectado após preparo.", { tentativa });
			return;
		}
	}
	logInfo("Colapsável não apareceu no tempo esperado após preparo.");
}

function abrirColapsavel() {
	const botao = document.querySelector(".effraim-lista-partes-toggle");
	if (!botao) return;
	const expandido = botao.getAttribute("aria-expanded") === "true";
	if (!expandido) botao.click();
}

export async function iniciarTutorial() {
	logInfo("Iniciando tutorial.");
	iniciarTour([
		{
			selector: "#fldPartes",
			titulo: "Lista de Partes",
			texto: "A funcionalidade atua dentro deste fieldset, organizando a visualização das partes."
		},
		{
			selector: "#effraim-lista-partes-aprimorada-aviso",
			titulo: "Aviso da Funcionalidade",
			texto: "Este aviso indica que a Lista de Partes Aprimorada está ativa e pode ser desligada nas configurações."
		},
		{
			selectorFn: () => document.querySelector(".effraim-lista-partes-toggle") || document.querySelector("#fldPartes"),
			onEnter: prepararCenarioComColapsavel,
			titulo: "Colapsável de Linhas Excedentes",
			texto: "A partir da segunda linha de cada tipo, o EFFRAIM agrupa no comando 'Abrir demais ...'."
		},
		{
			selectorFn: () => document.querySelector(".effraim-lista-partes-toggle"),
			onEnter: abrirColapsavel,
			titulo: "Expandir Demais Partes",
			texto: "Ao clicar, as linhas excedentes daquele grupo são exibidas."
		},
		{
			selector: ".effraim-lista-partes-scroll-tabela",
			titulo: "Altura Máxima da Tabela",
			texto: "A tabela tem altura máxima configurável e só mostra barra de rolagem quando ultrapassa esse limite."
		}
	]);
}
