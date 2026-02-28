import { iniciarTour } from "./core_tour.js";

const LOG_PREFIXO = "[EFFRAIM tutorial_lista_partes_aprimorada]";

function logInfo(mensagem, dados) {
	if (dados !== undefined) console.info(`${LOG_PREFIXO} ${mensagem}`, dados);
	else console.info(`${LOG_PREFIXO} ${mensagem}`);
}

export async function iniciarTutorial() {
	logInfo("Iniciando tutorial.");
	iniciarTour([
		{
			selector: "#fldPartes",
			titulo: "Lista de Partes",
			texto: "A funcionalidade atua dentro deste fieldset, organizando a visualização das partes."
		},
		{
			selector: "#effraim-lista-partes-aprimorada-aviso",
			titulo: "Aviso da Funcionalidade",
			texto: "Este aviso indica que a Lista de Partes Aprimorada está ativa e pode ser desligada nas configurações."
		},
		{
			selectorFn: () =>
				document.querySelector("#tblPartesERepresentantes thead tr th") ||
				document.querySelector("#tblPartesERepresentantes tbody tr th") ||
				document.querySelector("#tblPartesERepresentantes"),
			titulo: "Contagem por Polo",
			texto: "Os cabeçalhos de polo exibem a quantidade de partes entre parênteses, por exemplo: AUTOR (4) e REU (2)."
		},
		{
			selector: ".effraim-lista-partes-scroll-tabela",
			titulo: "Altura Máxima da Tabela",
			texto: "A tabela mantém altura máxima configurável e mostra rolagem quando necessário, sem colapsar linhas."
		}
	]);
}
