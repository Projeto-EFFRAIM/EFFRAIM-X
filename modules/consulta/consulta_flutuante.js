import { criarPainelFlutuante } from "../utils/interface.js";
import { consulta_dados_processo } from "../../funcoes.js";

let listenerRegistrado = false;

export async function init() {
  const botao = document.getElementById("btn-consulta_flutuante");

  // captura e deixa em cache global quando a rota de consulta processual carrega
  try {
    window.__EFFRAIM_DADOS_PROCESSO = consulta_dados_processo();
    console.log("[consulta_flutuante] Dados do processo cacheados:", window.__EFFRAIM_DADOS_PROCESSO);
  } catch (e) {
    console.warn("[consulta_flutuante] Falha ao capturar dados do processo:", e);
  }

  // quando o usuário expande partes com "Ver demais partes", recaptura tudo para incluir novos nomes
  if (!listenerRegistrado) {
    const reagendarCaptura = (delay = 1200) => {
      setTimeout(() => {
        try {
          window.__EFFRAIM_DADOS_PROCESSO = consulta_dados_processo();
          console.log("[consulta_flutuante] Dados recapturados após expandir partes:", window.__EFFRAIM_DADOS_PROCESSO);
        } catch (e) {
          console.warn("[consulta_flutuante] Falha ao recapturar dados após expandir partes:", e);
        }
      }, delay);
    };

    document.addEventListener("click", (ev) => {
      const alvo = ev.target?.closest("a[aria-label*='Ver demais partes']");
      if (alvo) {
        console.log("[consulta_flutuante] Click em 'Ver demais partes' detectado, recapturando partes...");
        reagendarCaptura(1200);
      }
    });

    listenerRegistrado = true;
  }

  criarPainelFlutuante({
    botao,
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
