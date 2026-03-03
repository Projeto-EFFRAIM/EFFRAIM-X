// modules/juds/renajud/inclusao.js

import { esperar } from "/funcoes.js";
import { obterConfiguracao, gravarConfiguracao } from "../../utils/configuracoes.js";

const SELETOR_RAMO = "#ramoJustica";
const SELETOR_TRIBUNAL = "#tribunal";
const SELETOR_ORGAO = "#orgao";
const SELETOR_PROCESSO = "#numeroProcesso";
const SELETOR_PENHORA_VALOR_AVALIACAO = "#valorPenhora";
const SELETOR_PENHORA_DATA_PENHORA = "#dataPenhora";
const SELETOR_PENHORA_VALOR_EXECUCAO = "#valorExecucao";
const SELETOR_PENHORA_DATA_EXECUCAO = "#dataExecucao";
const RAMO_PADRAO = "JUSTICA DO TRABALHO";

function normalizarTexto(valor) {
	return String(valor || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/\s+/g, " ")
		.trim()
		.toUpperCase();
}

async function esperarSeletor(seletor, tentativas = 30, delayMs = 250) {
	for (let i = 0; i < tentativas; i += 1) {
		const el = document.querySelector(seletor);
		if (el) {
			console.log("[renajud/inclusao] Seletor encontrado.", { seletor, tentativa: i + 1 });
			return el;
		}
		await esperar(delayMs);
	}
	console.warn("[renajud/inclusao] Seletor nao encontrado no prazo.", { seletor, tentativas, delayMs });
	return null;
}

async function esperarSelectComOpcoes(seletor, tentativas = 40, delayMs = 250) {
	for (let i = 0; i < tentativas; i += 1) {
		const el = document.querySelector(seletor);
		const qtdOpcoes = el?.options?.length || 0;
		if (el && qtdOpcoes > 1) {
			console.log("[renajud/inclusao] Select com opcoes carregado.", {
				seletor,
				tentativa: i + 1,
				opcoes: qtdOpcoes
			});
			return el;
		}
		await esperar(delayMs);
	}
	console.warn("[renajud/inclusao] Select sem opcoes suficientes no prazo.", { seletor, tentativas, delayMs });
	return null;
}

function marcarDirtyTouched(el) {
	el.classList.remove("ng-pristine");
	el.classList.remove("ng-untouched");
	el.classList.add("ng-dirty");
	el.classList.add("ng-touched");
}

function dispararEventosControle(el) {
	el.dispatchEvent(new Event("input", { bubbles: true }));
	el.dispatchEvent(new Event("change", { bubbles: true }));
	el.dispatchEvent(new Event("blur", { bubbles: true }));
}

function obterTipoRestricaoNovo(dados) {
	const valor = String(dados?.opcoes?.tipo_restricao || "").trim().toLowerCase();
	if (valor === "penhora") return "PENHORA";
	if (valor === "licenciamento") return "LICENCIAMENTO";
	if (valor === "circulacao") return "CIRCULACAO";
	return "TRANSFERENCIA";
}

function mapearTextoTipoRestricaoNovo(codigo) {
	if (codigo === "PENHORA") return "PENHORA";
	if (codigo === "LICENCIAMENTO") return "LICENCIAMENTO";
	if (codigo === "CIRCULACAO") return "CIRCULACAO";
	return "TRANSFERENCIA";
}

function obterDadosPenhora(dados) {
	return dados?.opcoes?.penhora_dados || {};
}

function selecionarOpcaoPorTextoOuValor(select, alvo) {
	if (!select || !alvo) return false;
	const alvoNorm = normalizarTexto(alvo);
	const opcoes = [...select.options];

	let opt = opcoes.find((o) => normalizarTexto(o.value) === alvoNorm);
	if (!opt) opt = opcoes.find((o) => normalizarTexto(o.textContent) === alvoNorm);
	if (!opt) opt = opcoes.find((o) => normalizarTexto(o.textContent).includes(alvoNorm));
	if (!opt) return false;

	select.value = opt.value;
	marcarDirtyTouched(select);
	dispararEventosControle(select);
	console.log("[renajud/inclusao] Opcao selecionada.", {
		id: select.id,
		alvo,
		valor: opt.value,
		texto: String(opt.textContent || "").trim()
	});
	return true;
}

async function preencherNumeroProcesso(dados) {
	const numeroProcesso = String(dados?.dados_processo?.capa?.numProcesso || "").trim();
	if (!numeroProcesso) {
		console.warn("[renajud/inclusao] Sem numero de processo nos dados.");
		return false;
	}
	const campo = await esperarSeletor(SELETOR_PROCESSO, 50, 200);
	if (!campo) return false;
	campo.focus();
	campo.value = numeroProcesso;
	marcarDirtyTouched(campo);
	dispararEventosControle(campo);
	console.log("[renajud/inclusao] Numero do processo preenchido.", { numeroProcesso });
	return true;
}

async function preencherCampoTextoDireto(seletor, valor, descricao, tentativas = 50, delayMs = 200) {
	const texto = String(valor || "").trim();
	if (!texto) {
		console.warn("[renajud/inclusao] Valor vazio para campo.", { descricao, seletor });
		return false;
	}
	const campo = await esperarSeletor(seletor, tentativas, delayMs);
	if (!campo) return false;
	campo.focus();
	campo.value = texto;
	marcarDirtyTouched(campo);
	dispararEventosControle(campo);
	console.log("[renajud/inclusao] Campo preenchido.", { descricao, seletor, valor: texto });
	return true;
}

async function preencherCascataSelects(dados) {
	const prefPayload = dados?.preferencias_renajud_novo || {};
	const ramoPreferido = String(prefPayload?.ramo_justica_padrao || RAMO_PADRAO || "").trim() || RAMO_PADRAO;
	const tribunalPreferido = String(prefPayload?.tribunal_preferido || "").trim();
	const orgaoPreferido = String(prefPayload?.orgao_preferido || "").trim();
	console.log("[renajud/inclusao] Preferencias recebidas para preenchimento.", {
		ramoPreferido,
		tribunalPreferido,
		orgaoPreferido
	});

	const selRamo = await esperarSelectComOpcoes(SELETOR_RAMO, 50, 250);
	if (!selRamo) return;
	const ramoSelecionado = selecionarOpcaoPorTextoOuValor(selRamo, ramoPreferido);
	if (!ramoSelecionado) {
		console.warn("[renajud/inclusao] Ramo da justica nao localizado nas opcoes.", { ramoPreferido });
	}
	await esperar(800);

	const selTribunal = await esperarSelectComOpcoes(SELETOR_TRIBUNAL, 50, 250);
	if (selTribunal && tribunalPreferido) {
		const tribunalSelecionado = selecionarOpcaoPorTextoOuValor(selTribunal, tribunalPreferido);
		if (!tribunalSelecionado) {
			console.warn("[renajud/inclusao] Tribunal preferido nao encontrado nas opcoes.", { tribunalPreferido });
		}
		await esperar(800);
	}

	const selOrgao = await esperarSelectComOpcoes(SELETOR_ORGAO, 50, 250);
	if (selOrgao && orgaoPreferido) {
		const orgaoSelecionado = selecionarOpcaoPorTextoOuValor(selOrgao, orgaoPreferido);
		if (!orgaoSelecionado) {
			console.warn("[renajud/inclusao] Orgao preferido nao encontrado nas opcoes.", { orgaoPreferido });
		}
	}
}

async function selecionarTipoRestricao(dados) {
	const codigo = obterTipoRestricaoNovo(dados);
	const alvoTexto = mapearTextoTipoRestricaoNovo(codigo);
	console.log("[renajud/inclusao] Selecionando tipo de restricao (novo).", { codigo, alvoTexto });

	for (let tentativa = 1; tentativa <= 40; tentativa += 1) {
		const radios = [...document.querySelectorAll("input[formcontrolname='tipoRestricao'].form-check-input")];
		if (!radios.length) {
			await esperar(250);
			continue;
		}

		for (const radio of radios) {
			const wrap = radio.closest(".form-check");
			const label = wrap?.querySelector("label.form-check-label");
			const texto = normalizarTexto(label?.textContent || "");
			const isPenhora = alvoTexto === "PENHORA" && texto === "PENHORA";
			const isCirculacao = alvoTexto === "CIRCULACAO" && texto.includes("CIRCULACAO");
			const isLic = alvoTexto === "LICENCIAMENTO" && texto === "LICENCIAMENTO";
			const isTransf = alvoTexto === "TRANSFERENCIA" && texto === "TRANSFERENCIA";
			if (!isPenhora && !isCirculacao && !isLic && !isTransf) continue;

			radio.click();
			marcarDirtyTouched(radio);
			dispararEventosControle(radio);
			await esperar(150);

			console.log("[renajud/inclusao] Tipo de restricao selecionado (novo).", {
				tentativa,
				label: String(label?.textContent || "").trim()
			});
			return true;
		}

		await esperar(250);
	}

	console.warn("[renajud/inclusao] Nao foi possivel localizar radio do tipo de restricao (novo).", {
		codigo
	});
	return false;
}

async function preencherCamposPenhoraNovo(dados) {
	if (obterTipoRestricaoNovo(dados) !== "PENHORA") {
		console.log("[renajud/inclusao] Penhora nao selecionada; campos de penhora nao serao preenchidos.");
		return true;
	}

	const p = obterDadosPenhora(dados);
	const okValorAvaliacao = await preencherCampoTextoDireto(SELETOR_PENHORA_VALOR_AVALIACAO, p.valor_avaliacao_veiculo, "Valor da avaliacao do veiculo");
	const okDataPenhora = await preencherCampoTextoDireto(SELETOR_PENHORA_DATA_PENHORA, p.data_penhora, "Data da penhora");
	const okValorExecucao = await preencherCampoTextoDireto(SELETOR_PENHORA_VALOR_EXECUCAO, p.valor_execucao, "Valor da execucao");
	const okDataExecucao = await preencherCampoTextoDireto(SELETOR_PENHORA_DATA_EXECUCAO, p.data_execucao, "Data da atualizacao da execucao");
	const ok = !!(okValorAvaliacao && okDataPenhora && okValorExecucao && okDataExecucao);
	console.log("[renajud/inclusao] Resultado preenchimento campos de penhora (novo).", {
		ok,
		okValorAvaliacao,
		okDataPenhora,
		okValorExecucao,
		okDataExecucao
	});
	return ok;
}

function localizarBotaoInserir() {
	const botoes = [...document.querySelectorAll("button[type='submit'].btn.btn-primary, button[type='submit'], input[type='submit']")];
	for (const b of botoes) {
		const texto = String(b.textContent || b.value || "").trim().toLowerCase();
		if (texto === "inserir" || texto.includes("inserir")) return b;
	}
	return null;
}

async function salvarPreferenciasNoPrimeiroInserir() {
	const botao = localizarBotaoInserir();
	if (!botao || botao.dataset.effraimRenajudBindInserir === "1") {
		console.log("[renajud/inclusao] Botao Inserir nao disponivel para bind (ou ja bindado).");
		return;
	}
	botao.dataset.effraimRenajudBindInserir = "1";
	console.log("[renajud/inclusao] Listener de salvamento no botao Inserir registrado.");

	botao.addEventListener("click", async () => {
		try {
			const selRamo = document.querySelector(SELETOR_RAMO);
			const selTribunal = document.querySelector(SELETOR_TRIBUNAL);
			const selOrgao = document.querySelector(SELETOR_ORGAO);
			if (!selRamo || !selTribunal || !selOrgao) return;

			const ramoAtual = String(selRamo.options?.[selRamo.selectedIndex]?.textContent || "").trim();
			const tribAtual = String(selTribunal.options?.[selTribunal.selectedIndex]?.textContent || "").trim();
			const orgaoAtual = String(selOrgao.options?.[selOrgao.selectedIndex]?.textContent || "").trim();
			if (!ramoAtual || !tribAtual || !orgaoAtual) return;

			// Ramo e lista fixa: atualiza sempre no clique em Inserir para refletir a escolha real do usuario.
			await gravarConfiguracao("opcoes_renajud.novo.ramo_justica_padrao", ramoAtual);

			const tribSalvo = String(await obterConfiguracao("opcoes_renajud.novo.tribunal_preferido") || "").trim();
			const orgaoSalvo = String(await obterConfiguracao("opcoes_renajud.novo.orgao_preferido") || "").trim();

			let salvou = false;
			if (!tribSalvo) {
				await gravarConfiguracao("opcoes_renajud.novo.tribunal_preferido", tribAtual);
				salvou = true;
			}
			if (!orgaoSalvo) {
				await gravarConfiguracao("opcoes_renajud.novo.orgao_preferido", orgaoAtual);
				salvou = true;
			}

			if (salvou) {
				window.alert(
					"Ramo da justica e tribunal/orgao judiciario salvos como preferencia. " +
					"Se quiser mudar, va em Preferencias e limpe a configuracao atual."
				);
				console.log("[renajud/inclusao] Preferencias salvas no primeiro Inserir.", {
					ramo: ramoAtual,
					tribunal: tribAtual,
					orgao: orgaoAtual
				});
			} else {
				console.log("[renajud/inclusao] Ramo atualizado; tribunal/orgao ja existiam e foram mantidos.", {
					ramo: ramoAtual
				});
			}
		} catch (e) {
			console.warn("[renajud/inclusao] Falha ao salvar preferencias no Inserir.", e);
		}
	}, { once: true });
}

export async function executar(dados) {
	try {
		console.log("[renajud/inclusao] Inicio da automacao na rota de inclusao.", {
			url: window.location.href
		});
		const okTipoRestricao = await selecionarTipoRestricao(dados);
		const okCamposPenhora = await preencherCamposPenhoraNovo(dados);
		await preencherCascataSelects(dados);
		const okProcesso1 = await preencherNumeroProcesso(dados);
		const okProcesso2 = await preencherNumeroProcesso(dados);
		await salvarPreferenciasNoPrimeiroInserir();
		console.log("[renajud/inclusao] Campos de inclusao preparados.", {
			tipoRestricao: okTipoRestricao,
			camposPenhora: okCamposPenhora,
			processoTentativa1: okProcesso1,
			processoTentativa2: okProcesso2
		});
	} catch (e) {
		console.error("[renajud/inclusao] Erro:", e);
	}
}
