// modules/juds/renajud/pesquisa_antigo.js

import { esperar } from "/funcoes.js";

const SELETORES_INPUT_DOC = [
	"#form-incluir-restricao\\:campo-cpf-cnpj",
	"input#documentoIdentificacao",
	"input[name*='documentoIdentificacao']",
	"input[id*='documentoIdentificacao']",
	"input[name*='cpf']",
	"input[id*='cpf']",
	"input[name*='cnpj']",
	"input[id*='cnpj']"
].join(", ");

const SELETORES_INPUT_PLACA = [
	"#form-incluir-restricao\\:campo-placa",
	"input#placa",
	"input[name*='placa']",
	"input[id*='placa']"
].join(", ");

const SELETORES_INPUT_CHASSI = [
	"#form-incluir-restricao\\:campo-chassi",
	"input#chassi",
	"input[name*='chassi']",
	"input[id*='chassi']"
].join(", ");

const SELETOR_SOMENTE_SEM_RESTRICAO = "#form-incluir-restricao\\:select-sem-restricao";
const SELETOR_BOTAO_RESTRINGIR = "#form-incluir-restricao\\:j_idt454";
const SELETOR_RADIO_TIPO_RESTRICAO = "#form-incluir-restricao\\:select-tipo-restricao";
const SELETOR_PENHORA_CHECKBOX = "#form-incluir-restricao\\:penhora-checkbox";
const SELETOR_MAGISTRADO_LABEL = "#form-incluir-restricao\\:campo-magistrado_label";
const SELETOR_NUMERO_PROCESSO = "#form-incluir-restricao\\:panel-numero-processo";
const SELETOR_PENHORA_DATA_ATUALIZACAO = "#form-incluir-restricao\\:campo-data-atualizacao-sentenca_input";
const SELETOR_PENHORA_VALOR_EXECUCAO = "#form-incluir-restricao\\:campo-valor-cumprimento-sentenca";
const SELETOR_PENHORA_DATA_PENHORA = "#form-incluir-restricao\\:campo-data-penhora_input";
const SELETOR_PENHORA_VALOR_AVALIACAO = "#form-incluir-restricao\\:campo-valor-avaliacao-veiculo";
const SELETOR_BOTAO_FINAL_INSERIR = "#form-incluir-restricao\\:j_idt525";
const TIPO_RESTRICAO_PADRAO_INSERCAO = "TRANSFERENCIA";

const SELETORES_BOTAO_PESQUISAR = [
	"#form-incluir-restricao\\:botao-pesquisar",
	"button[type='submit']",
	"input[type='submit']",
	"button[id*='pesquisar']",
	"button[name*='pesquisar']",
	"input[id*='pesquisar']",
	"a[id*='pesquisar']",
	"a[title*='Pesquisar']"
].join(", ");

function obterPrimeiroConsultadoComDoc(dados) {
	const consultados = dados?.consultados || dados?.dados_consulta?.consultados || [];
	return consultados.find((c) => String(c?.cpf || "").replace(/\D/g, ""));
}

function extrairSomenteDigitos(valor) {
	return String(valor ?? "").replace(/\D/g, "").slice(0, 14);
}

function normalizarTexto(valor) {
	return String(valor || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.toUpperCase();
}

function normalizarParametro(dados) {
	const valor = String(dados?.opcoes?.parametro_pesquisa || "cpf_cnpj").toLowerCase();
	if (["cpf_cnpj", "placa", "chassi", "numero_processo"].includes(valor)) return valor;
	return "cpf_cnpj";
}

function obterValorPesquisa(dados, parametro) {
	const consultado = obterPrimeiroConsultadoComDoc(dados);
	const documento = String(consultado?.cpf || "").trim();
	const valorManual = String(dados?.opcoes?.valor_manual_pesquisa || "").trim();
	if (parametro === "cpf_cnpj") return documento;
	if (parametro === "placa" || parametro === "chassi") return valorManual;
	return "";
}

function deveMostrarSomenteSemRestricoes(dados) {
	const valor = dados?.opcoes?.mostrar_somente_sem_restricoes_renajud;
	return valor !== false; // default: true
}

function sanitizarValorPesquisa(valor, parametro) {
	if (parametro === "cpf_cnpj") return extrairSomenteDigitos(valor);
	if (parametro === "placa" || parametro === "chassi") return String(valor || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
	return String(valor || "").trim();
}

function obterSeletorPorParametro(parametro) {
	if (parametro === "placa") return SELETORES_INPUT_PLACA;
	if (parametro === "chassi") return SELETORES_INPUT_CHASSI;
	return SELETORES_INPUT_DOC;
}

async function esperarCampo(seletor, tentativas = 25, delayMs = 220) {
	for (let i = 0; i < tentativas; i += 1) {
		const input = document.querySelector(seletor);
		if (input) return input;
		await esperar(delayMs);
	}
	return null;
}

async function esperarElemento(seletor, tentativas = 20, delayMs = 220) {
	for (let i = 0; i < tentativas; i += 1) {
		const el = document.querySelector(seletor);
		if (el) {
			console.log("[renajud/pesquisa_antigo] Elemento encontrado.", { seletor, tentativa: i + 1 });
			return el;
		}
		await esperar(delayMs);
	}
	console.warn("[renajud/pesquisa_antigo] Elemento nao encontrado no prazo.", { seletor, tentativas, delayMs });
	return null;
}

function encontrarBotaoPesquisa() {
	const candidatos = [...document.querySelectorAll(SELETORES_BOTAO_PESQUISAR)];
	const botaoInsercao = document.querySelector("#form-incluir-restricao\\:botao-pesquisar");
	if (botaoInsercao) {
		console.log("[renajud/pesquisa_antigo] Botao especifico de insercao localizado.", {
			id: botaoInsercao.id || null
		});
		return botaoInsercao;
	}
	for (const el of candidatos) {
		const texto = String(el?.textContent || el?.value || "").toLowerCase();
		const titulo = String(el?.getAttribute?.("title") || "").toLowerCase();
		if (texto.includes("pesquisar") || titulo.includes("pesquisar")) return el;
	}
	return candidatos[0] || null;
}

async function preencherCampoTexto(input, texto) {
	input.focus();
	input.value = "";
	input.dispatchEvent(new Event("input", { bubbles: true }));

	for (const char of texto) {
		input.dispatchEvent(new KeyboardEvent("keydown", { key: char, bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keypress", { key: char, bubbles: true }));
		input.value += char;
		input.dispatchEvent(new Event("input", { bubbles: true }));
		input.dispatchEvent(new KeyboardEvent("keyup", { key: char, bubbles: true }));
		await esperar(45);
	}

	input.dispatchEvent(new Event("change", { bubbles: true }));
	input.dispatchEvent(new Event("blur", { bubbles: true }));
}

async function acionarPesquisa(input, valor) {
	for (let tentativa = 1; tentativa <= 12; tentativa += 1) {
		await preencherCampoTexto(input, valor);
		const botao = encontrarBotaoPesquisa();
		if (botao) {
			console.log("[renajud/pesquisa_antigo] Clicando no botao de pesquisa.", {
				tentativa,
				id: botao.id || null,
				texto: String(botao.textContent || botao.value || "").trim() || null
			});
			botao.click();
			console.log("[renajud/pesquisa_antigo] Botao de pesquisa acionado.", { tentativa });
			return true;
		}
		await esperar(300);
	}
	return false;
}

function pseudoCheckboxEstaMarcado(container) {
	if (!container) return false;
	const aria = String(container.getAttribute?.("aria-checked") || "").toLowerCase();
	if (aria === "true") return true;
	if (aria === "false") return false;

	if (container.matches?.(".ui-state-active, .active, .checked")) return true;

	const boxAtiva = container.querySelector?.(".ui-chkbox-box.ui-state-active");
	if (boxAtiva) return true;

	const inputMarcado = container.querySelector?.("input[type='checkbox']:checked");
	if (inputMarcado) return true;

	return false;
}

async function garantirSomenteSemRestricaoMarcado() {
	const container = await esperarElemento(SELETOR_SOMENTE_SEM_RESTRICAO, 25, 220);
	if (!container) {
		console.warn("[renajud/pesquisa_antigo] Controle 'somente sem restricao' nao encontrado.");
		return false;
	}

	const antes = pseudoCheckboxEstaMarcado(container);
	console.log("[renajud/pesquisa_antigo] Estado inicial do filtro 'sem restricao'.", { marcado: antes });
	if (antes) return true;

	const inputInterno = container.querySelector("input[type='checkbox']");
	const alvoClique = container.querySelector(".ui-chkbox-box") || container;

	alvoClique.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
	alvoClique.click();
	alvoClique.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
	if (inputInterno) {
		inputInterno.dispatchEvent(new Event("change", { bubbles: true }));
	}
	await esperar(200);

	const depois = pseudoCheckboxEstaMarcado(container);
	console.log("[renajud/pesquisa_antigo] Estado apos tentativa de marcar filtro 'sem restricao'.", {
		marcado: depois,
		boxClass: container.querySelector(".ui-chkbox-box")?.className || null,
		inputChecked: !!inputInterno?.checked
	});
	return depois;
}

function obterNomeMagistrado(dados) {
	return String(dados?.dados_processo?.capa?.magistrado || "").trim();
}

function obterNumeroProcesso(dados) {
	return String(dados?.dados_processo?.capa?.numProcesso || "").trim();
}

function obterTipoRestricaoAntigo(dados) {
	const valor = String(dados?.opcoes?.tipo_restricao || "").trim().toLowerCase();
	if (valor === "penhora") return "PENHORA";
	if (valor === "licenciamento") return "LICENCIAMENTO";
	if (valor === "circulacao") return "CIRCULACAO";
	if (valor === "transferencia") return "TRANSFERENCIA";
	return TIPO_RESTRICAO_PADRAO_INSERCAO;
}

function obterPenhoraPainel(dados) {
	return obterTipoRestricaoAntigo(dados) === "PENHORA";
}

function obterDadosPenhora(dados) {
	return dados?.opcoes?.penhora_dados || {};
}

function pseudoRadioSelecionadoPorValor(container, valor) {
	if (!container) return false;
	const input = container.querySelector(`input[type='radio'][value='${valor}']`);
	if (!input) return false;
	if (input.checked) return true;
	const box = input.closest("td")?.querySelector(".ui-radiobutton-box.ui-state-active")
		|| input.closest(".ui-radiobutton")?.querySelector(".ui-radiobutton-box.ui-state-active");
	return !!box;
}

async function selecionarTipoRestricaoInsercao(valor = TIPO_RESTRICAO_PADRAO_INSERCAO) {
	const tabela = await esperarElemento(SELETOR_RADIO_TIPO_RESTRICAO, 40, 250);
	if (!tabela) return false;

	const alvo = tabela.querySelector(`input[type='radio'][value='${valor}']`);
	if (!alvo) {
		console.warn("[renajud/pesquisa_antigo] Radio de tipo de restricao nao encontrado.", { valor });
		return false;
	}

	if (pseudoRadioSelecionadoPorValor(tabela, valor)) {
		console.log("[renajud/pesquisa_antigo] Tipo de restricao ja selecionado.", { valor });
		return true;
	}

	const radioWidget = alvo.closest(".ui-helper-hidden-accessible")?.parentElement;
	const box = radioWidget?.querySelector(".ui-radiobutton-box");
	const label = tabela.querySelector(`label[for='${CSS.escape(alvo.id)}']`);
	const alvoClique = box || label || radioWidget || alvo;

	console.log("[renajud/pesquisa_antigo] Selecionando tipo de restricao.", {
		valor,
		inputId: alvo.id || null,
		alvoCliqueClasse: alvoClique?.className || null
	});
	alvoClique.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
	alvoClique.click();
	alvoClique.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
	alvo.dispatchEvent(new Event("change", { bubbles: true }));
	await esperar(250);

	const ok = pseudoRadioSelecionadoPorValor(tabela, valor);
	console.log("[renajud/pesquisa_antigo] Resultado selecao tipo de restricao.", { valor, selecionado: ok });
	return ok;
}

async function garantirPenhoraDesmarcada() {
	const container = await esperarElemento(SELETOR_PENHORA_CHECKBOX, 40, 250);
	if (!container) return false;

	const antes = pseudoCheckboxEstaMarcado(container);
	console.log("[renajud/pesquisa_antigo] Estado inicial da penhora.", { marcado: antes });
	if (!antes) return true;

	const inputInterno = container.querySelector("input[type='checkbox']");
	const box = container.querySelector(".ui-chkbox-box");
	const alvoClique = box || container;
	alvoClique.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
	alvoClique.click();
	alvoClique.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
	if (inputInterno) inputInterno.dispatchEvent(new Event("change", { bubbles: true }));
	await esperar(200);

	const depois = pseudoCheckboxEstaMarcado(container);
	console.log("[renajud/pesquisa_antigo] Estado apos tentativa de desmarcar penhora.", {
		marcado: depois,
		boxClass: box?.className || null,
		inputChecked: !!inputInterno?.checked
	});
	return !depois;
}

async function configurarPenhora(dados) {
	const deveMarcar = obterPenhoraPainel(dados);
	const container = await esperarElemento(SELETOR_PENHORA_CHECKBOX, 40, 250);
	if (!container) return false;

	const antes = pseudoCheckboxEstaMarcado(container);
	console.log("[renajud/pesquisa_antigo] Estado inicial da penhora.", { marcado: antes, deveMarcar });
	if (antes === deveMarcar) return true;

	const inputInterno = container.querySelector("input[type='checkbox']");
	const box = container.querySelector(".ui-chkbox-box");
	const alvoClique = box || container;
	alvoClique.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
	alvoClique.click();
	alvoClique.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
	if (inputInterno) inputInterno.dispatchEvent(new Event("change", { bubbles: true }));
	await esperar(200);

	const depois = pseudoCheckboxEstaMarcado(container);
	console.log("[renajud/pesquisa_antigo] Estado apos configurar penhora.", {
		marcado: depois,
		deveMarcar,
		boxClass: box?.className || null,
		inputChecked: !!inputInterno?.checked
	});
	return depois === deveMarcar;
}

async function clicarBotaoPorSeletor(seletor, descricao, tentativas = 40, delayMs = 250) {
	const botao = await esperarElemento(seletor, tentativas, delayMs);
	if (!botao) return false;
	console.log("[renajud/pesquisa_antigo] Clicando botao.", {
		descricao,
		seletor,
		id: botao.id || null,
		texto: String(botao.textContent || botao.value || "").trim() || null
	});
	botao.click();
	return true;
}

async function selecionarMagistradoInclusao(dados) {
	const nomeMagistrado = obterNomeMagistrado(dados);
	if (!nomeMagistrado) {
		console.warn("[renajud/pesquisa_antigo] Magistrado nao informado nos dados do processo.");
		return false;
	}

	const label = await esperarElemento(SELETOR_MAGISTRADO_LABEL, 40, 250);
	if (!label) {
		console.warn("[renajud/pesquisa_antigo] Campo de magistrado (label) nao encontrado.");
		return false;
	}

	console.log("[renajud/pesquisa_antigo] Abrindo lista de magistrados.", { nomeMagistrado });
	label.click();
	await esperar(300);

	// PrimeFaces costuma gerar um painel *_panel com itens em ul/li.
	let itens = [];
	for (let tentativa = 1; tentativa <= 20; tentativa += 1) {
		itens = [...document.querySelectorAll(
			"#form-incluir-restricao\\:campo-magistrado_panel li.ui-selectonemenu-item, " +
			"ul.ui-selectonemenu-items li.ui-selectonemenu-item"
		)].filter((li) => li.offsetParent !== null);
		if (itens.length) {
			console.log("[renajud/pesquisa_antigo] Lista de magistrados carregada.", {
				tentativa,
				qtdItens: itens.length
			});
			break;
		}
		await esperar(200);
	}

	if (!itens.length) {
		console.warn("[renajud/pesquisa_antigo] Nao foi possivel localizar itens da lista de magistrados.");
		return false;
	}

	const alvoNorm = normalizarTexto(nomeMagistrado);
	const candidato =
		itens.find((li) => normalizarTexto(li.getAttribute("data-label")) === alvoNorm) ||
		itens.find((li) => normalizarTexto(li.textContent) === alvoNorm) ||
		itens.find((li) => normalizarTexto(li.getAttribute("data-label")).includes(alvoNorm)) ||
		itens.find((li) => normalizarTexto(li.textContent).includes(alvoNorm));

	if (!candidato) {
		console.warn("[renajud/pesquisa_antigo] Magistrado nao encontrado na lista.", {
			nomeMagistrado,
			opcoes: itens.map((li) => String(li.getAttribute("data-label") || li.textContent || "").trim()).slice(0, 10)
		});
		return false;
	}

	console.log("[renajud/pesquisa_antigo] Selecionando magistrado.", {
		nomeMagistrado,
		opcao: String(candidato.getAttribute("data-label") || candidato.textContent || "").trim()
	});
	candidato.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
	candidato.click();
	candidato.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
	await esperar(300);

	const textoSelecionado = String(document.querySelector(SELETOR_MAGISTRADO_LABEL)?.textContent || "").trim();
	const ok = normalizarTexto(textoSelecionado) === alvoNorm || normalizarTexto(textoSelecionado).includes(alvoNorm);
	console.log("[renajud/pesquisa_antigo] Resultado selecao magistrado.", {
		ok,
		textoSelecionado
	});
	return ok;
}

async function preencherNumeroProcessoInclusao(dados) {
	const numeroProcesso = obterNumeroProcesso(dados);
	if (!numeroProcesso) {
		console.warn("[renajud/pesquisa_antigo] Numero do processo nao informado nos dados.");
		return false;
	}

	const campo = await esperarElemento(SELETOR_NUMERO_PROCESSO, 40, 250);
	if (!campo) {
		console.warn("[renajud/pesquisa_antigo] Campo de numero do processo nao encontrado.", {
			seletor: SELETOR_NUMERO_PROCESSO
		});
		return false;
	}

	const alvoInput =
		(campo.matches?.("input, textarea") ? campo : null) ||
		campo.querySelector?.("input, textarea") ||
		campo;

	console.log("[renajud/pesquisa_antigo] Preenchendo numero do processo.", {
		numeroProcesso,
		id: alvoInput.id || campo.id || null
	});

	if ("value" in alvoInput) {
		await preencherCampoTexto(alvoInput, numeroProcesso);
	} else {
		campo.textContent = numeroProcesso;
	}

	const valorFinal = "value" in alvoInput ? String(alvoInput.value || "").trim() : String(campo.textContent || "").trim();
	const ok = valorFinal.includes(numeroProcesso);
	console.log("[renajud/pesquisa_antigo] Resultado preenchimento numero do processo.", {
		ok,
		valorFinal
	});
	return ok;
}

async function preencherCampoPorSeletor(seletor, valor, descricao) {
	const texto = String(valor || "").trim();
	if (!texto) {
		console.warn("[renajud/pesquisa_antigo] Valor vazio para campo.", { descricao, seletor });
		return false;
	}
	const campo = await esperarElemento(seletor, 40, 250);
	if (!campo) return false;
	const input = (campo.matches?.("input, textarea") ? campo : null) || campo.querySelector?.("input, textarea");
	if (!input) {
		console.warn("[renajud/pesquisa_antigo] Campo sem input interno.", { descricao, seletor });
		return false;
	}
	console.log("[renajud/pesquisa_antigo] Preenchendo campo.", { descricao, seletor, valor: texto });
	await preencherCampoTexto(input, texto);
	return String(input.value || "").trim() === texto || String(input.value || "").trim().includes(texto);
}

async function preencherCamposPenhoraAntigo(dados) {
	if (!obterPenhoraPainel(dados)) {
		console.log("[renajud/pesquisa_antigo] Penhora nao selecionada no painel; campos de penhora nao serao preenchidos.");
		return true;
	}
	const p = obterDadosPenhora(dados);
	const okValorAvaliacao = await preencherCampoPorSeletor(SELETOR_PENHORA_VALOR_AVALIACAO, p.valor_avaliacao_veiculo, "Valor avaliacao veiculo");
	const okDataPenhora = await preencherCampoPorSeletor(SELETOR_PENHORA_DATA_PENHORA, p.data_penhora, "Data da penhora");
	const okValorExecucao = await preencherCampoPorSeletor(SELETOR_PENHORA_VALOR_EXECUCAO, p.valor_execucao, "Valor da execucao");
	const okDataExecucao = await preencherCampoPorSeletor(SELETOR_PENHORA_DATA_ATUALIZACAO, p.data_execucao, "Data atualizacao valor execucao");
	const ok = !!(okValorAvaliacao && okDataPenhora && okValorExecucao && okDataExecucao);
	console.log("[renajud/pesquisa_antigo] Resultado preenchimento campos de penhora.", {
		ok,
		okValorAvaliacao,
		okDataPenhora,
		okValorExecucao,
		okDataExecucao
	});
	return ok;
}

async function aguardarEtapaRestricoesAposCliqueUsuario(dados) {
	console.log("[renajud/pesquisa_antigo] Aguardando usuario escolher veiculos e clicar em 'Restringir'...");
	const fieldsetRestricoes = await esperarElemento(SELETOR_RADIO_TIPO_RESTRICAO, 400, 250);
	if (!fieldsetRestricoes) {
		console.warn("[renajud/pesquisa_antigo] Etapa de restricoes nao apareceu no prazo apos pesquisa.");
		return;
	}

	console.log("[renajud/pesquisa_antigo] Etapa de restricoes detectada apos clique do usuario em 'Restringir'.", {
		id: fieldsetRestricoes.id || null
	});
	const tipoRestricaoSelecionado = obterTipoRestricaoAntigo(dados);
	console.log("[renajud/pesquisa_antigo] Tipo de restricao recebido do painel.", {
		tipoRestricaoSelecionado
	});
	const okTipo = tipoRestricaoSelecionado === "PENHORA"
		? true
		: await selecionarTipoRestricaoInsercao(tipoRestricaoSelecionado);
	const okPenhora = await configurarPenhora(dados);
	const okMagistrado = await selecionarMagistradoInclusao(dados);
	const okNumeroProcesso = await preencherNumeroProcessoInclusao(dados);
	const okCamposPenhora = await preencherCamposPenhoraAntigo(dados);

	console.log("[renajud/pesquisa_antigo] Restricoes preparadas.", {
		tipoRestricao: tipoRestricaoSelecionado,
		okTipo,
		penhoraConfigurada: okPenhora,
		penhoraSolicitada: obterPenhoraPainel(dados),
		camposPenhora: okCamposPenhora,
		magistradoSelecionado: okMagistrado,
		numeroProcessoPreenchido: okNumeroProcesso
	});

	console.log("[renajud/pesquisa_antigo] Clique final desativado por enquanto (aguardando preenchimento completo de todos os campos).", {
		botaoFinalSeletor: SELETOR_BOTAO_FINAL_INSERIR
	});
	// Futuro: habilitar apenas quando todos os campos obrigatorios estiverem comprovadamente preenchidos.
	// await clicarBotaoPorSeletor(SELETOR_BOTAO_FINAL_INSERIR, "Inserir final", 40, 250);
}

export async function executar(dados) {
	try {
		const urlAtual = String(window.location.href || "");
		const emInsercao = urlAtual.includes("/restricoes-insercao.jsf");
		const parametro = normalizarParametro(dados);
		console.log("[renajud/pesquisa_antigo] Inicio.", { url: urlAtual, parametro, emInsercao });

		if (emInsercao && parametro === "numero_processo") {
			console.warn("[renajud/pesquisa_antigo] Insercao no RENAJUD antigo nao suporta pesquisa por numero do processo. Use CPF/CNPJ, placa ou chassi.");
			return;
		}

		if (emInsercao) {
			const usarFiltroSemRestricao = deveMostrarSomenteSemRestricoes(dados);
			console.log("[renajud/pesquisa_antigo] Opcao filtro 'somente sem restricao' recebida.", {
				usarFiltroSemRestricao
			});
			if (usarFiltroSemRestricao) {
				await garantirSomenteSemRestricaoMarcado();
			} else {
				console.log("[renajud/pesquisa_antigo] Filtro 'somente sem restricao' desativado no painel.");
			}
		}

		const seletor = obterSeletorPorParametro(parametro);
		let valor = obterValorPesquisa(dados, parametro);
		valor = sanitizarValorPesquisa(valor, parametro);
		if (!valor) {
			console.warn("[renajud/pesquisa_antigo] Valor de pesquisa vazio.", { parametro });
			return;
		}

		const input = await esperarCampo(seletor);
		if (!input) {
			console.warn("[renajud/pesquisa_antigo] Campo de pesquisa nao encontrado nesta tela.", { parametro, seletor });
			return;
		}
		console.log("[renajud/pesquisa_antigo] Campo localizado.", {
			parametro,
			id: input.id || null,
			name: input.name || null,
			valor
		});

		const ok = await acionarPesquisa(input, valor);
		if (!ok) {
			console.warn("[renajud/pesquisa_antigo] Nao foi possivel acionar a pesquisa.");
			return;
		}

		if (emInsercao) {
			const botaoRestringir = await esperarElemento(SELETOR_BOTAO_RESTRINGIR, 80, 250);
			if (botaoRestringir) {
				console.log("[renajud/pesquisa_antigo] Lista de veiculos carregada. Aguarde selecionar os veiculos e clique em 'Restringir'.", {
					botaoRestringirId: botaoRestringir.id || null
				});
			}
			await aguardarEtapaRestricoesAposCliqueUsuario(dados);
		}
	} catch (e) {
		console.error("[renajud/pesquisa_antigo] Erro:", e);
	}
}
