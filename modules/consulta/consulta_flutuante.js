import { criarPainelFlutuante } from "../utils/interface.js";

export async function init() {
  const botao = document.getElementById("btn-consulta_flutuante");
  criarPainelFlutuante({
    botao,
    secoes: [
  { id: "fldCapa", nome: "Capa", chave: "."}, //futuramente pode trazer um resumo da capa
  { id: "fldLembretes", nome: "Lembretes", chave: "l" },
  { id: "fldAssuntos", nome: "Assuntos", chave: "j" },
  { id: "fldPartes", nome: "Partes", chave:"z" },
  { id: "fldMinutas", nome: "Minutas", chave:"i" },
  { id: "fldInformacoesAdicionais", nome: "Informações Adicionais", chave:"+" },
  { id: "fldResumo", nome: "Resumo", chave:"0"},
  { id: "fldAcoes", nome: "Ações", chave:"ç" },
  { id: "div-preferencia-minuta", nome: "Minutas Favoritas", chave:"4"},
  { id: "div-preferencia-movimentacao", nome: "Movimentos Favoritos", chave:"5"},
  { id: "div-preferencia-intimacao", nome:"Intimações Favoritas", chave:"6"}
]
  });
}
