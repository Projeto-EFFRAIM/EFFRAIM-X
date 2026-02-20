import { iniciarTour } from "./core_tour.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function abrirRequisitorios() {
	const btn = document.getElementById("btn-requisitorio");
	btn?.click();
	await esperar(260);
}

export async function iniciarTutorial() {
	iniciarTour([
		{
			selector: "#btn-consulta_flutuante",
			titulo: "Consulta Flutuante",
			texto: "Este botão abre o painel deslizante com as seções da página do processo."
		},
		{
			selector: "#btn-requisitorio",
			onEnter: abrirRequisitorios,
			titulo: "Requisitórios",
			texto: "Este botão abre o painel de Requisitórios e inicia a busca automática quando configurado."
		},
		{
			selector: ".effraim-badge-requisitorio",
			titulo: "Resultado no Badge",
			texto: "O badge mostra status e quantidade encontrada sem exigir novo clique manual."
		},
		{
			selector: "#painel-requisitorio",
			titulo: "Painel em Processamento/Resultado",
			texto: "Ao abrir, o painel já traz o estado atual da consulta automática."
		},
		{
			selector: "#effraim-mock-requisitorio-img, #effraim-iframe-requisitorio, #effraim-iframe-requisitorio-auto",
			titulo: "Visualização do Resultado",
			texto: "No tutorial, é exibida uma imagem ilustrativa. No uso real, o painel mostra a tela do sistema com o resultado."
		}
	]);
}
