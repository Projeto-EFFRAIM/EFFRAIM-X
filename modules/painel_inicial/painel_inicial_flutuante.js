// modules/painel_inicial_flutuante.js
import { criarPainelFlutuante } from "../utils/interface.js";

export async function init() {
  const botao = document.getElementById("btn-painel_inicial_flutuante");
  if (!botao) return;

  criarPainelFlutuante({
    botao,
    secoes: secoesPainelInicial
  });
}
//muda o id do painel de comunicações, que está como fldMeusLocalizadores
document.querySelectorAll("#fldMeusLocalizadores")[1].id = "fldComunicacoes";

const secoesPainelInicial = [
  { id: "fldProcessos", nome: "Processos", chave: "4" },
  { id: "fldLocalizadores", nome: "Localizadores", chave: "5" },
  { id: "fldRequisicoesPagamento", nome: "Requisições de Pagamento", chave: "r" },
  { id: "fldAgravo", nome: "Agravo", chave: "g" },
  { id: "fldMinutas", nome: "Minutas", chave: "t" },
  { id: "fldMeusLocalizadores", nome: "Meus Localizadores", chave: "ç" },
  { id: "fldComunicacoes", nome: "Comunicações Recebidas", chave: "6" },
  { id: "fldProcessoDeUmLocalizador", nome: "Processo por Localizador", chave: "l" },
  { id: "fldRelatorioGeral", nome: "Relatório Geral", chave: "c" },
  { id: "fldTemas", nome: "Temas", chave: "7" },
  { id: "fldAJG", nome: "AJG", chave: "8" },
  { id: "fldMandados", nome: "Mandados", chave: "9" },
  { id: "fldCartasAR", nome: "Cartas AR", chave: "0" },
  { id: "fldCVLD", nome: "CVLD", chave: "=" }
];
