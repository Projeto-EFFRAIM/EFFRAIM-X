// modules/painel_inicial_flutuante.js
import { criarPainelFlutuante } from "../utils/interface.js";
import {
  aplicarFavoritosNasSecoes,
  mostrarPainelFavoritos,
  renderizarSecaoFavoritos
} from "./favoritos/index.js";

export const secoesPainelInicial = [
  { id: "fldProcessos", nome: "Processos", chave: "4", favoritavel: false },
  { id: "fldLocalizadores", nome: "Localizadores", chave: "5", favoritavel: false },
  { id: "fldRequisicoesPagamento", nome: "Requisições de Pagamento", chave: "r", favoritavel: false },
  { id: "fldAgravo", nome: "Agravo", chave: "g", favoritavel: false },
  { id: "fldMinutas", nome: "Minutas", chave: "'", favoritavel: true, matcher: row => {
    const qtdTd = row.querySelector("td[id^='tdMinutas']");
    if (!qtdTd) return null;
    const id = qtdTd.id.replace("tdMinutas", "");
    const descTd = row.querySelector("td:first-child");
    return { id, titulo: (descTd?.textContent || "").trim() };
  }},
  { id: "fldMeusLocalizadores", nome: "Meus Localizadores", chave: "c1", favoritavel: true, matcher: row => {
    const descTd = row.querySelector("td[id^='tdMeusLocalizadoresDesc']");
    if (!descTd) return null;
    const id = descTd.id.replace("tdMeusLocalizadoresDesc", "");
    return { id, titulo: (descTd.textContent || "").trim() };
  }},
  { id: "fldComunicacoes", nome: "Comunicações Recebidas", chave: "6", favoritavel: false },
  { id: "fldProcessoDeUmLocalizador", nome: "Processo por Localizador", chave: "l", favoritavel: true, matcher: row => {
    const descTd = row.querySelector("td[id^='tdListaDeProcessosPorLocalizadorDesc']");
    if (!descTd) return null;
    const id = descTd.id.replace("tdListaDeProcessosPorLocalizadorDesc", "");
    return { id, titulo: (descTd.textContent || "").trim() };
  }},
  { id: "fldRelatorioGeral", nome: "Relatório Geral", chave: "c", favoritavel: true, matcher: row => {
    const descTd = row.querySelector("td[id^='tdRelatorioGeralDesc']");
    if (!descTd) return null;
    const id = descTd.id.replace("tdRelatorioGeralDesc", "");
    return { id, titulo: (descTd.textContent || "").trim() };
  }},
  { id: "fldTemas", nome: "Temas", chave: "7", favoritavel: false },
  { id: "fldAJG", nome: "AJG", chave: "8", favoritavel: false },
  { id: "fldMandados", nome: "Mandados", chave: "9", favoritavel: false },
  { id: "fldCartasAR", nome: "Cartas AR", chave: "0", favoritavel: false },
  { id: "fldCVLD", nome: "CVLD", chave: "=", favoritavel: false }
];

export async function init() {
  const cfgAtivas = await import("../utils/configuracoes.js");
  const ativo = await cfgAtivas.obterConfiguracao
    ? await cfgAtivas.obterConfiguracao("funcionalidades_ativas.painel_inicial_favoritos")
    : true;
  const habilitarFavoritos = ativo !== false;

  const botao = document.getElementById("btn-painel_inicial_flutuante");
  if (!botao) return;

  // garantir id de comunicações se existir segunda ocorrência
  const meusc = document.querySelectorAll("#fldMeusLocalizadores");
  if (meusc.length > 1) meusc[1].id = "fldComunicacoes";

  // botão "Favoritos" ao lado
  let btnFav = document.getElementById("btn-painel_inicial_favoritos");
  if (!btnFav) {
    btnFav = document.createElement("button");
    btnFav.id = "btn-painel_inicial_favoritos";
    btnFav.className = "btn btn-sm btn-outline-primary d-flex flex-column align-items-center effraim-btn-init";
    btnFav.style.padding = "2px";
    btnFav.style.borderRadius = "50%";
    btnFav.style.width = "34px";
    btnFav.style.height = "34px";
    const img = document.createElement("img");
    img.src = chrome.runtime.getURL("assets/icones/painel_inicial_favoritos.png");
    img.alt = "Favoritos";
    img.title = "Favoritos do painel";
    img.style.width = "24px";
    img.style.height = "24px";
    btnFav.appendChild(img);
    btnFav.style.marginLeft = "6px";
    botao.insertAdjacentElement("afterend", btnFav);
  }
  btnFav.style.display = habilitarFavoritos ? "inline-flex" : "none";

  criarPainelFlutuante({ botao, secoes: secoesPainelInicial });

  if (habilitarFavoritos) {
    aplicarFavoritosNasSecoes(secoesPainelInicial);
    renderizarSecaoFavoritos();
    btnFav.addEventListener("click", e => {
      e.stopPropagation();
      mostrarPainelFavoritos(btnFav);
    });
  }
}
