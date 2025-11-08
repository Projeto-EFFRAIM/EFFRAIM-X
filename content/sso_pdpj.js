console.log("Iniciando sso_pdpj");


(async () => {		
  
	const { inserir_aviso_effraim } = await import(
    	chrome.runtime.getURL("modules/utils/interface.js")	
  	);
	const { prepararDOM } = await import(
    	chrome.runtime.getURL("funcoes.js")
  	);
  	await prepararDOM();
  	inserir_aviso_effraim(
		"EFFRAIM NÃO GUARDA SEUS DADOS. " +
		"Ele detecta automaticamente o autopreenchimento do navegador e realiza o login no serviço. " +
		"Para desabilitar este comportamento, vá em Preferências."
  	);
})();


