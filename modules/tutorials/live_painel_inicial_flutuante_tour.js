import { iniciarTour } from "./core_tour.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizarTexto(valor) {
	return String(valor || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

async function aguardarSeletor(seletor, timeoutMs = 4000) {
	const inicio = Date.now();
	while ((Date.now() - inicio) < timeoutMs) {
		const el = document.querySelector(seletor);
		if (el) return el;
		await esperar(120);
	}
	return null;
}

function painelAberto(painel) {
	if (!painel) return false;
	const estilo = window.getComputedStyle(painel);
	return estilo.display !== "none" && estilo.opacity !== "0" && parseFloat(estilo.maxHeight || "0") > 0;
}

function obterBotaoSecao(nome) {
	const painel = document.getElementById("effraim-painel-flutuante");
	if (!painel) return null;
	const alvo = normalizarTexto(nome);
	return [...painel.querySelectorAll("button")].find((btn) =>
		normalizarTexto(btn.textContent || "").includes(alvo)
	) || null;
}

async function abrirPainelAtalhos() {
	const botao = await aguardarSeletor("#btn-painel_inicial_flutuante", 5000);
	if (!botao) return;
	const painel = await aguardarSeletor("#effraim-painel-flutuante", 3500);
	if (!painel) return;
	if (painelAberto(painel)) return;
	botao.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
	await esperar(240);
	if (!painelAberto(painel)) {
		botao.click();
		await esperar(200);
	}
}

async function abrirSecao(nome) {
	await abrirPainelAtalhos();
	const inicio = Date.now();
	let botaoSecao = obterBotaoSecao(nome);
	while (!botaoSecao && (Date.now() - inicio) < 2200) {
		await esperar(120);
		botaoSecao = obterBotaoSecao(nome);
	}
	botaoSecao?.click();
	await esperar(220);
}

async function fecharSecao(nome) {
	const botaoSecao = obterBotaoSecao(nome);
	botaoSecao?.click();
	await esperar(180);
}

export async function iniciarTutorial() {
	iniciarTour([
		{
			selector: "#btn-painel_inicial_flutuante",
			titulo: "Botao do Painel Inicial",
			texto: "Este botao abre um painel com atalhos das areas principais."
		},
		{
			selector: "#effraim-painel-flutuante",
			onEnter: abrirPainelAtalhos,
			titulo: "Painel de Atalhos",
			texto: "Com ele aberto, voce escolhe a area que quer trazer para frente."
		},
		{
			selectorFn: () => obterBotaoSecao("Processos") || document.querySelector("#effraim-painel-flutuante"),
			onEnter: () => abrirSecao("Processos"),
			titulo: "Abrir Processos",
			texto: "Clicando em Processos, essa parte da tela vai para frente."
		},
		{
			selector: "#fldProcessos",
			titulo: "Area em Destaque",
			texto: "A secao escolhida fica em foco para uso rapido."
		},
		{
			selectorFn: () => obterBotaoSecao("Relatorio Geral") || document.querySelector("#effraim-painel-flutuante"),
			onEnter: async () => {
				await fecharSecao("Processos");
				await abrirSecao("Relatorio Geral");
			},
			titulo: "Trocar de Area",
			texto: "Voce pode fechar uma secao e abrir outra sem sair da mesma pagina."
		}
	]);
}
