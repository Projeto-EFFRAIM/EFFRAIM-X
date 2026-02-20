import { iniciarTour } from "../modules/tutorials/core_tour.js";

const SNIPPETS = {
  favoritos: "snippets/favoritos_demo.html",
  requisitorios: "snippets/requisitorios_demo.html"
};

function getTutorialId() {
  const params = new URLSearchParams(window.location.search);
  const tutorialId = params.get("tutorial") || "favoritos";
  return SNIPPETS[tutorialId] ? tutorialId : "favoritos";
}

async function carregarSnippet(tutorialId) {
  const path = SNIPPETS[tutorialId];
  if (!path) return "";

  try {
    const resposta = await fetch(path, { cache: "no-store" });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return await resposta.text();
  } catch (erro) {
    console.warn("[EFFRAIM tutorial] Falha ao carregar snippet:", path, erro);
    return "";
  }
}

function renderFallback(root) {
  root.innerHTML = `
    <div class="tutorial-sim-page">
      <div class="tutorial-sim-topbar">Tutorial indisponivel</div>
      <div class="tutorial-sim-grid">
        <section class="tutorial-sim-card">
          <p>Nao foi possivel carregar a simulacao desta funcionalidade.</p>
        </section>
      </div>
    </div>
  `;
}

function getSteps(tutorialId) {
  if (tutorialId === "requisitorios") {
    return [
      {
        selector: "#demo-header",
        titulo: "Tutorial guiado simulado",
        texto: "Esta janela mostra uma simulacao da consulta de requisitorios."
      },
      {
        selector: "#sim-req-botao",
        titulo: "Acesso no painel deslizante",
        texto: "Este e o botao da funcionalidade dentro da barra lateral deslizante."
      },
      {
        selector: "#sim-req-processo",
        titulo: "Numero do processo",
        texto: "A consulta preenche este campo com o numero do processo atual."
      },
      {
        selector: "#sim-req-pesquisar",
        titulo: "Execucao da pesquisa",
        texto: "Quando as condicoes de localizador sao atendidas, a pesquisa pode ser disparada automaticamente."
      },
      {
        selector: "#sim-req-resultado",
        titulo: "Tela de resultado",
        texto: "Ao abrir o painel, voce encontra a listagem do sistema ja carregada."
      },
      {
        selector: "#sim-req-badge",
        titulo: "Contador",
        texto: "O badge indica quantos registros foram encontrados apos o fim da consulta."
      }
    ];
  }

  return [
    {
      selector: "#demo-header",
      titulo: "Tutorial guiado simulado",
      texto: "Esta janela mostra uma simulacao do fluxo de favoritos."
    },
    {
      selector: "#sim-favoritos-estrela",
      titulo: "Inicio pela estrela",
      texto: "Clique no icone de estrela ao lado do processo para abrir as opcoes de favorito."
    },
    {
      selector: "#sim-favoritos-painel-estrela",
      titulo: "Escolha de destino",
      texto: "Voce pode salvar sem pasta, escolher pasta ou abrir a criacao de pasta."
    },
    {
      selector: "#sim-favoritos-add-pasta",
      titulo: "Criar pasta",
      texto: "Este e o icone de adicionar pasta usado na funcionalidade real."
    },
    {
      selector: "#sim-favoritos-resultado",
      titulo: "Organizacao final",
      texto: "Aqui aparecem pastas e favoritos para acesso rapido no painel inicial."
    }
  ];
}

function atualizarCabecalho(tutorialId) {
  const title = document.getElementById("demo-title");
  const subtitle = document.getElementById("demo-subtitle");

  if (tutorialId === "requisitorios") {
    title.textContent = "Tutorial Guiado - Consulta Flutuante / Requisitorios";
    subtitle.textContent = "Simulacao com estrutura baseada na tela da funcionalidade e icones reais da extensao.";
    return;
  }

  title.textContent = "Tutorial Guiado - Painel Inicial / Favoritos";
  subtitle.textContent = "Simulacao com estrutura baseada na tela da funcionalidade e icones reais da extensao.";
}

async function renderDemo(tutorialId) {
  const root = document.getElementById("demo-root");
  const html = await carregarSnippet(tutorialId);

  if (!html) {
    renderFallback(root);
    return false;
  }

  root.innerHTML = html;
  return true;
}

function startTour(tutorialId) {
  iniciarTour(getSteps(tutorialId));
}

document.addEventListener("DOMContentLoaded", async () => {
  const tutorialId = getTutorialId();
  atualizarCabecalho(tutorialId);

  const ok = await renderDemo(tutorialId);
  if (ok) {
    window.setTimeout(() => startTour(tutorialId), 300);
  }

  const restartButton = document.getElementById("btn-reiniciar-tour");
  restartButton?.addEventListener("click", () => startTour(tutorialId));
});
