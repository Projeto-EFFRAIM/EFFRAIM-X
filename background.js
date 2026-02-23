
// Futuro uso para listeners globais
chrome.runtime.onInstalled.addListener(() => {
  console.log("EFFRAIM instalado.");
});

async function effraimFetchCorregedoria(mensagem) {
  const url = String(mensagem?.url || "").trim();
  const respostaComo = String(mensagem?.respostaComo || "json").trim().toLowerCase();
  const metodo = String(mensagem?.metodo || "GET").trim().toUpperCase();

  if (!url) return { ok: false, erro: "url_vazia" };
  if (!url.startsWith("https://portaldeestatisticas.trf2.jus.br/")) {
    return { ok: false, erro: "url_nao_permitida" };
  }

  const resposta = await fetch(url, { method: metodo });
  if (!resposta.ok) {
    return { ok: false, erro: `HTTP ${resposta.status}`, status: resposta.status };
  }

  if (respostaComo === "text") {
    return { ok: true, data: await resposta.text() };
  }
  return { ok: true, data: await resposta.json() };
}

chrome.runtime.onMessage.addListener((mensagem, _sender, sendResponse) => {
  if (!mensagem?.type) return;

  if (mensagem.type === "EFFRAIM_CORREGEDORIA_FETCH") {
    effraimFetchCorregedoria(mensagem)
      .then(sendResponse)
      .catch((e) => {
        console.warn("[EFFRAIM/bg] Falha no fetch da Corregedoria.", e);
        sendResponse({ ok: false, erro: String(e?.message || e) });
      });
    return true;
  }

  if (mensagem.type !== "EFFRAIM_ABRIR_RENAJUD_ABA") return;

  const url = String(mensagem.url || "").trim();
  if (!url) {
    sendResponse({ ok: false, erro: "url_vazia" });
    return;
  }

  try {
    chrome.tabs.create({ url }, (tab) => {
      const erro = chrome.runtime.lastError;
      if (erro) {
        console.warn("[EFFRAIM/bg] Falha ao abrir aba RENAJUD.", erro);
        sendResponse({ ok: false, erro: erro.message || "tabs_create_falhou" });
        return;
      }
      sendResponse({ ok: true, tabId: tab?.id || null });
    });
  } catch (e) {
    console.error("[EFFRAIM/bg] Erro ao abrir aba RENAJUD.", e);
    sendResponse({ ok: false, erro: String(e?.message || e) });
  }

  return true; // resposta assíncrona
});
