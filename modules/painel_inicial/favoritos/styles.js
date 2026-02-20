export function ensureFavoritosCss() {
	if (document.getElementById("effraim-favoritos-css")) return;
	const link = document.createElement("link");
	link.id = "effraim-favoritos-css";
	link.rel = "stylesheet";
	link.href = chrome.runtime.getURL("assets/css/favoritos.css");
	(document.head || document.documentElement).appendChild(link);
}
