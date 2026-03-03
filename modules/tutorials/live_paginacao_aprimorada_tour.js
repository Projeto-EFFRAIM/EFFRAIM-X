import { iniciarTour } from "./core_tour.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function aguardarSeletor(seletor, timeoutMs = 4000) {
	const inicio = Date.now();
	while ((Date.now() - inicio) < timeoutMs) {
		const el = document.querySelector(seletor);
		if (el) return el;
		await esperar(120);
	}
	return null;
}

async function selecionarRadio5() {
	const radio = await aguardarSeletor("#optPaginacao5Effraim");
	if (!radio) return;
	if (!radio.checked) {
		radio.click();
		await esperar(180);
	}
}

async function selecionarSelect10() {
	const select = await aguardarSeletor("#tblProcessoLista_length select");
	if (!select) return;
	if (select.querySelector("option[value='10']")) {
		select.value = "10";
		select.dispatchEvent(new Event("change", { bubbles: true }));
		await esperar(180);
	}
}

export async function iniciarTutorial() {
	iniciarTour([
		{
			selector: "#divPaginacao",
			titulo: "Paginação da Lista",
			texto: "Aqui você escolhe quantos itens aparecem por página."
		},
		{
			selector: "#optPaginacao5Effraim",
			onEnter: selecionarRadio5,
			titulo: "Nova Opção 5",
			texto: "A opção 5 foi adicionada para uma visão mais curta."
		},
		{
			selector: "#optPaginacao200Effraim",
			titulo: "Nova Opção 200",
			texto: "Também é possível exibir mais itens de uma vez com a opção 200."
		},
		{
			selector: "#tblProcessoLista_length",
			titulo: "Seletor da Tabela",
			texto: "O mesmo conjunto de opções extras também aparece no seletor da tabela."
		},
		{
			selector: "#tblProcessoLista_length select option[value='10']",
			onEnter: selecionarSelect10,
			titulo: "Lembrar Escolha",
			texto: "A escolha feita fica guardada para as próximas aberturas desta lista."
		}
	]);
}
