import { iniciarTour } from "./core_tour.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function abrirRenajud() {
	const btn = document.getElementById("btn-renajud");
	btn?.click();
	await esperar(260);
}

export async function iniciarTutorial() {
	iniciarTour([
		{
			selector: "#btn-renajud",
			titulo: "Botão RENAJUD",
			texto: "Este botão abre o painel deslizante do RENAJUD."
		},
		{
			selector: "#painel-renajud",
			onEnter: abrirRenajud,
			titulo: "Painel Deslizante",
			texto: "No painel, você define consultados e valores de penhora."
		},
		{
			selectorFn: () => document.querySelector('input[name=\"consultado\"]'),
			onEnter: async () => {
				await abrirRenajud();
				const chk = document.querySelector('input[name=\"consultado\"]');
				if (chk && !chk.checked) chk.click();
				await esperar(120);
			},
			titulo: "Selecionar Consultado",
			texto: "Primeiro, marque quem será consultado no RENAJUD."
		},
		{
			selectorFn: () => document.querySelector(".valor_consultado"),
			onEnter: async () => {
				const campo = document.querySelector(".valor_consultado");
				if (campo) {
					campo.focus();
					campo.value = "1000,00";
					campo.dispatchEvent(new Event("input", { bubbles: true }));
				}
				await esperar(120);
			},
			titulo: "Preencher Valor",
			texto: "Em seguida, informe o valor de penhora para cada consultado."
		},
		{
			selector: "#btn-prosseguir-renajud",
			titulo: "Prosseguir",
			texto: "Com os dados preenchidos, prossiga para abrir o sistema RENAJUD."
		}
	]);
}

