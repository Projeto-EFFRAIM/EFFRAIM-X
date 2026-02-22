import { iniciarTour } from "./core_tour.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function abrirRenajud() {
	const btn = document.getElementById("btn-renajud");
	btn?.click();
	await esperar(260);
}

async function selecionarTipoRestricaoPenhoraNoPainel() {
	await abrirRenajud();
	const radioPenhora = document.querySelector('input[name="renajud-tipo-restricao"][value="penhora"]');
	radioPenhora?.click();
	await esperar(180);
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
			selector: 'input[name="renajud-tipo-restricao"]',
			titulo: "Tipo de Restricao",
			texto: "Escolha a restricao que sera preparada: transferencia, licenciamento, circulacao ou penhora."
		},
		{
			selector: "#renajud-bloco-sem-restricoes",
			onEnter: async () => {
				await abrirRenajud();
				const ambienteAntigo = document.querySelector('input[name="renajud-ambiente"][value="antigo"]');
				const acaoInserir = document.querySelector('input[name="renajud-acao"][value="inserir"]');
				ambienteAntigo?.click();
				acaoInserir?.click();
				await esperar(180);
			},
			titulo: "Filtro de Veiculos (Antigo)",
			texto: "Na insercao do RENAJUD antigo, voce pode escolher mostrar somente veiculos sem restricoes."
		},
		{
			selector: "#renajud-bloco-penhora",
			onEnter: selecionarTipoRestricaoPenhoraNoPainel,
			titulo: "Campos de Penhora",
			texto: "Ao escolher Penhora, aparecem os campos adicionais. O valor da execucao vem preenchido com o valor da causa, e a data de atualizacao vem com a data de hoje."
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
			texto: "Com os dados definidos, use este botao para seguir. No RENAJUD novo, a tela abre no painel; no RENAJUD antigo, abre em nova aba para permitir o login."
		}
	]);
}
