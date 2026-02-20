import { iniciarTour } from "./core_tour.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function obterBotaoSecao(nome) {
	const painel = document.getElementById("effraim-painel-flutuante");
	if (!painel) return null;
	const alvo = String(nome || "").toLowerCase();
	return [...painel.querySelectorAll("button")].find((btn) =>
		String(btn.textContent || "").toLowerCase().includes(alvo)
	) || null;
}

async function abrirPainelConsulta() {
	const btn = document.getElementById("btn-consulta_flutuante");
	btn?.click();
	await esperar(220);
}

async function abrirSecao(nome) {
	await abrirPainelConsulta();
	const btn = obterBotaoSecao(nome);
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

