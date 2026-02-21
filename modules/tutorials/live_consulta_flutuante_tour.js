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

async function abrirPainelConsulta() {
	const btn = await aguardarSeletor("#btn-consulta_flutuante", 5000);
	if (!btn) return;
	const painel = await aguardarSeletor("#effraim-painel-flutuante", 3500);
	if (!painel) return;
	if (painelAberto(painel)) return;
	btn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
	await esperar(220);
	if (painelAberto(painel)) return;
	// fallback defensivo: alguns ambientes podem ignorar mouseenter sintético.
	btn.click();
	await esperar(220);
}

async function abrirSecao(nome) {
	await abrirPainelConsulta();
	const inicio = Date.now();
	let btn = obterBotaoSecao(nome);
	while (!btn && (Date.now() - inicio) < 2000) {
		await esperar(120);
		btn = obterBotaoSecao(nome);
	}
	btn?.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
	btn?.click();
	await esperar(220);
}

async function fecharSecao(nome) {
	const btn = obterBotaoSecao(nome);
	btn?.click();
	await esperar(180);
}

export async function iniciarTutorial() {
	iniciarTour([
		{
			selector: "#btn-consulta_flutuante",
			titulo: "Botão Consulta Flutuante",
			texto: "Este botão abre o painel deslizante com atalhos das seções da página."
		},
		{
			selector: "#effraim-painel-flutuante",
			onEnter: abrirPainelConsulta,
			titulo: "Atalhos das Seções",
			texto: "Com o painel aberto, você acessa seções como Partes, Capa e Ações sem perder contexto."
		},
		{
			selector: "#fldPartes",
			onEnter: () => abrirSecao("Partes"),
			titulo: "Exemplo: abrir Partes",
			texto: "Ao clicar em Partes no painel, a seção é trazida para frente."
		},
		{
			selectorFn: () => obterBotaoSecao("Partes"),
			onEnter: () => fecharSecao("Partes"),
			titulo: "Exemplo: fechar Partes",
			texto: "Clicando no mesmo atalho, a seção volta ao lugar original."
		},
		{
			selector: "#fldAcoes",
			onEnter: () => abrirSecao("Ações"),
			titulo: "Exemplo: abrir Ações",
			texto: "O mesmo fluxo vale para outras seções, como Ações."
		}
	]);
}
