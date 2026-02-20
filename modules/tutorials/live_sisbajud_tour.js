import { iniciarTour } from "./core_tour.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function abrirSisbajud() {
	const btn = document.getElementById("btn-sisbajud");
	btn?.click();
	await esperar(260);
}

export async function iniciarTutorial() {
	iniciarTour([
		{
			selector: "#btn-sisbajud",
			titulo: "Botão SISBAJUD",
			texto: "Este botão abre o painel deslizante do SISBAJUD."
		},
		{
			selector: "#painel-sisbajud",
			onEnter: abrirSisbajud,
			titulo: "Painel Deslizante",
			texto: "Ao abrir, você escolhe tipo de consulta e partes."
		},
		{
			selector: "#tipo-consulta",
			onEnter: async () => {
				await abrirSisbajud();
			},
			titulo: "Tipo de Consulta",
			texto: "Você pode alternar entre Bloqueio, Informações e Consulta de ordem emitida."
		},
		{
			selector: "#opcoes-informacoes",
			onEnter: async () => {
				const radioInfo = document.querySelector('input[name=\"tipoConsulta\"][value=\"informacoes\"]');
				radioInfo?.click();
				await esperar(180);
			},
			titulo: "Consequência: modo Informações",
			texto: "Neste modo, aparecem opções como Saldo, Endereços e Agências."
		},
		{
			selector: "#opcoes-bloqueio",
			onEnter: async () => {
				const radioBloqueio = document.querySelector('input[name=\"tipoConsulta\"][value=\"bloqueio\"]');
				radioBloqueio?.click();
				await esperar(180);
				const chkProtocolo = document.getElementById("toggle-agendar-protocolo");
				if (chkProtocolo && !chkProtocolo.checked) chkProtocolo.click();
				await esperar(120);
			},
			titulo: "Consequência: modo Bloqueio",
			texto: "No bloqueio, você pode configurar protocolo, teimosinha e demais parâmetros."
		},
		{
			selector: "#btn-prosseguir-consulta",
			titulo: "Prosseguir",
			texto: "Depois de selecionar as partes e as opções, use este botão para seguir para o sistema."
		}
	]);
}

