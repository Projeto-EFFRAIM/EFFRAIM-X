import { iniciarTour } from "./core_tour.js";

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function aguardarSeletor(seletor, timeoutMs = 3500) {
	const inicio = Date.now();
	while ((Date.now() - inicio) < timeoutMs) {
		const el = document.querySelector(seletor);
		if (el) return el;
		await esperar(120);
	}
	return null;
}

function ativarExpandirTodos() {
	const toggle = document.getElementById("effraim-tabelas-compactas-toggle");
	if (!toggle) return;
	if (!toggle.checked) toggle.click();
}

function desativarExpandirTodos() {
	const toggle = document.getElementById("effraim-tabelas-compactas-toggle");
	if (!toggle) return;
	if (toggle.checked) toggle.click();
}

async function forcarLinhaExpandida() {
	const linha = await aguardarSeletor("#tblProcessoLista tbody tr");
	if (!linha) return;
	linha.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
	await esperar(220);
}

export async function iniciarTutorial() {
	iniciarTour([
		{
			selector: "#tblProcessoLista",
			titulo: "Lista de Processos",
			texto: "Nesta lista, textos longos ficam resumidos para facilitar a leitura."
		},
		{
			selector: "#effraim-tabelas-compactas-aviso",
			titulo: "Aviso da Função",
			texto: "Aqui aparece a confirmação de que a compactação está ativa nesta tela."
		},
		{
			selector: "#effraim-tabelas-compactas-toggle",
			onEnter: ativarExpandirTodos,
			titulo: "Expandir Todos",
			texto: "Use esta chave para abrir o conteúdo completo em todas as linhas compactadas."
		},
		{
			selector: ".effraim-tabelas-compactas-colapsavel",
			onEnter: desativarExpandirTodos,
			titulo: "Visualização Compacta",
			texto: "Textos longos ficam limitados à altura configurada para manter a tabela legível."
		},
		{
			selector: "#tblProcessoLista tbody tr",
			onEnter: forcarLinhaExpandida,
			titulo: "Destaque por Linha",
			texto: "Ao passar o mouse, a linha é destacada por cima das demais e o conteúdo expandido usa scroll vertical. A coluna do número do processo não entra no destaque."
		},
		{
			selector: ".effraim-tabelas-compactas-overlay-linha",
			onEnter: forcarLinhaExpandida,
			titulo: "Leitura do Conteúdo",
			texto: "A expansão acontece na linha útil, sem alterar a altura da tabela original. Para navegar entre linhas, use primeiro a área do número do processo e depois mova para o conteúdo."
		}
	]);
}
