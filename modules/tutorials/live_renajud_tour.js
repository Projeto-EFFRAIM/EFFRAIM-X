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
			titulo: "Botao RENAJUD",
			texto: "Este botao abre o painel deslizante do RENAJUD."
		},
		{
			selector: "#painel-renajud",
			onEnter: abrirRenajud,
			titulo: "Painel RENAJUD",
			texto: "No painel, voce define ambiente, tipo de consulta e parametro de pesquisa."
		},
		{
			selector: 'input[name="renajud-ambiente"]',
			onEnter: abrirRenajud,
			titulo: "Ambiente",
			texto: "Escolha entre RENAJUD Novo e RENAJUD Antigo."
		},
		{
			selector: 'input[name="renajud-acao"]',
			titulo: "Tipo de Consulta",
			texto: "Escolha se deseja inserir, retirar ou consultar."
		},
		{
			selector: 'input[name="renajud-parametro"]',
			titulo: "Parametro de Pesquisa",
			texto: "Escolha se a busca sera por processo, placa, chassi ou CPF/CNPJ."
		},
		{
			selectorFn: () => document.querySelector('input[name="consultado"]'),
			onEnter: async () => {
				await abrirRenajud();
				const radio = document.querySelector('input[name="consultado"]');
				if (radio && !radio.checked) radio.click();
				await esperar(120);
			},
			titulo: "Consultado Unico",
			texto: "No RENAJUD, apenas um consultado pode ser selecionado por vez."
		},
		{
			selector: "#btn-prosseguir-renajud",
			titulo: "Prosseguir",
			texto: "Com os dados definidos, use este botao para seguir para o RENAJUD escolhido."
		}
	]);
}
