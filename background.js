
// Futuro uso para listeners globais
chrome.runtime.onInstalled.addListener(() => {
  console.log("EFFRAIM instalado.");
});

chrome.runtime.onMessage.addListener((mensagem, _sender, sendResponse) => {
  if (!mensagem || mensagem.type !== "EFFRAIM_ABRIR_RENAJUD_ABA") return;

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
