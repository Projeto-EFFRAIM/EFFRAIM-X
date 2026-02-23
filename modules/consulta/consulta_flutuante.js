import { criarPainelFlutuante } from "../utils/interface.js";

export async function init() {
  const botao = document.getElementById("btn-consulta_flutuante");

  criarPainelFlutuante({
    botao,
    posicionamentoSecao: "meio_viewport",
    secoes: [
  { id: "fldCapa", nome: "Capa", chave: "."}, //futuramente pode trazer um resumo da capa
  { id: "fldLembretes", nome: "Lembretes", chave: "," },
  { id: "fldAssuntos", nome: "Assuntos", chave: "j" },
  { id: "fldPartes", nome: "Partes", chave:"z" },
  { id: "fldMinutas", nome: "Minutas", chave:"'" },
  { id: "fldInformacoesAdicionais", nome: "Informações Adicionais", chave:"+" },
  { id: "fldResumo", nome: "Resumo", chave:";"},
  { id: "fldAcoes", nome: "Ações", chave:"ç" },
  { id: "div-preferencia-minuta", nome: "Minutas Favoritas", chave:"/"},
  { id: "div-preferencia-movimentacao", nome: "Movimentos Favoritos", chave:"*"},
  { id: "div-preferencia-intimacao", nome:"Intimações Favoritas", chave:"-"}
]
  });
}
