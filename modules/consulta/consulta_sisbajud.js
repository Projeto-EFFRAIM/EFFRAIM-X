import { criarPainelDeslizantePadrao, criarDatePicker } from "../utils/interface.js";
import { consulta_dados_processo } from "../../funcoes.js";

const LIMITE_PROTOCOLO = 30;	// dias
const LIMITE_TEIMOSINHA = 60;	// dias
const BLOQUEIO_DIAS_MIN_TEIMOSINHA = 3; // bloqueio mínimo de 48h

export function init() {
	const botao = document.getElementById("btn-sisbajud");
	if (!botao) {
		console.warn("Botão #btn-sisbajud não encontrado.");
		return;
	}

	const painel = criarPainelDeslizantePadrao("painel-sisbajud", botao, "SISBAJUD");
	Object.assign(painel.style, {
		background: "#f0f8ff",
		color: "#002244",
		width: "55vw",
		maxWidth: "55vw",
		height: "auto", // deixa ajustar ao conteúdo
		maxHeight: "80vh",
		overflowY: "auto",
		paddingRight: "12px"
	});

	const conteudo = document.createElement("div");
	conteudo.id = "conteudo-sisbajud";
	conteudo.style.padding = "8px";
	conteudo.textContent = "Clique no botão SISBAJUD para consultar os dados.";
	painel.appendChild(conteudo);

	botao.addEventListener("click", () => {
		inserir_sisbajud_no_painel(painel, conteudo);
	});

	console.log("Painel SISBAJUD inicializado.");
}

async function inserir_sisbajud_no_painel(painel, conteudo) {
	try {
		const sisbajud_configuracoes = window.EFFRAIM_CONFIGURACOES.opcoes_sisbajud;
		console.log("Sisba config:", sisbajud_configuracoes);
		const dados_processo = window.__EFFRAIM_DADOS_PROCESSO || consulta_dados_processo();
		console.log("Dados coletados para enviar sisbajud:", dados_processo);

		const dados_consulta = await selecionar_dados_consulta(conteudo, dados_processo);
		conteudo.innerHTML = "";

		const dados_iframe = { ...dados_processo, sisbajud_configuracoes, dados_consulta };

		const iframe = document.createElement("iframe");
		iframe.id = "effraim-iframe-sisbajud";

		console.log(`Iframe criado: ${iframe.id}`);

		iframe.src = "https://sisbajud.cnj.jus.br/";
		Object.assign(iframe.style, {
			width: "50vw",
			height: "80vh",
			border: "none",
			background: "#fff",
		});

		conteudo.appendChild(iframe);

		iframe.addEventListener("load", () => {
			console.log("Iframe SISBAJUD carregado, enviando dados...");
			iframe.contentWindow.postMessage(
				{
					type: "EFFRAIM_DADOS_PROCESSO",
					dados: dados_iframe,
					origem: window.location.origin
				},
				"https://sisbajud.cnj.jus.br"
			);
		});
	} catch (e) {
		conteudo.textContent = "Erro ao carregar SISBAJUD.";
		console.error(e);
	}
}

async function selecionar_dados_consulta(conteudo, dados_processo) {
	console.log("[SISBAJUD] Seleção de partes iniciada");

	conteudo.innerHTML = `
		<div style="max-height:480px; overflow-y:auto; padding:8px 16px 8px 8px; box-sizing:border-box;">
			<div id="tipo-consulta" style="margin-bottom:10px;">
				<label><input type="radio" name="tipoConsulta" value="bloqueio" checked> Bloqueio</label>
				<label style="margin-left:12px;"><input type="radio" name="tipoConsulta" value="informacoes"> Informações</label>
			</div>
			<h3>Selecione o consultante (apenas um)</h3>
			${gerarListaPartes(dados_processo.partes.AUTOR, "consultante")}
			<h3>Selecione os consultados</h3>
			${gerarListaPartes(dados_processo.partes.REU, "consultado")}
		</div>

		<div id="opcoes-comuns" style="margin-top:10px;">
			<label><input type="checkbox" id="ordem-sigilosa"> Ordem sigilosa</label>
		</div>

		<div id="opcoes-bloqueio" style="margin-top:10px;">
			<label style="display:block;">
				<input type="checkbox" id="toggle-bloq-conta-salario"> Bloquear também conta salário
			</label>

			<!-- Bloco 1: Agendar protocolo -->
			<div id="bloco-protocolo" style="border:1px solid #ccc; margin-top:8px; padding:8px; border-radius:4px;">
				<label>
					<input type="checkbox" id="toggle-agendar-protocolo"> Agendar protocolo
				</label>
				<div id="campo-protocolo" style="display:none; margin-top:6px;"></div>
			</div>

			<!-- Bloco 2: Programar teimosinha -->
			<div id="bloco-teimosinha" style="border:1px solid #ccc; margin-top:8px; padding:8px; border-radius:4px;">
				<label>
					<input type="checkbox" id="toggle-teimosinha"> Programar teimosinha
				</label>
				<div id="campo-teimosinha" style="display:none; margin-top:6px;"></div>
			</div>
		</div>


		<div id="opcoes-informacoes" class="effraim-nao-preenchido" style="display:none; margin-top:10px;">
			<div id="grupo-informacoes-opcoes" style="display:flex; flex-wrap:wrap; gap:20px;">
				<label><input type="checkbox" id="info-saldo"> Saldo</label>
				<label><input type="checkbox" id="info-enderecos"> Endereços</label>
				<label><input type="checkbox" id="info-agencias"> Relação de agências e contas</label>
			</div>
			<label style="display:block; margin-top:6px;">
				<input type="checkbox" id="info-encerrados" checked> Incluir contas, investimentos e ativos encerrados
			</label>
			<div id="aviso-opcoes-informacoes" class="effraim-texto-atencao" style="margin-top:6px;">
				Nenhuma opção selecionada.
			</div>
		</div>

		<div style="position:sticky; bottom:0; background:#f0f8ff; padding:8px 0; text-align:center; border-top:1px solid #ccc;">
			<button id="btn-prosseguir-consulta">Prosseguir</button>
		</div>

		<div style="margin-top:10px; color:black; font-weight:500;">
			<span style="color:red; font-weight:bold;">ATENÇÃO:</span><br>
			Certifique-se de que todas as partes a serem selecionadas aparecem na Seção<br>'Partes e Representantes' do processo.
		</div>
	`;

	// date pickers
	const campoProtocolo = criarDatePicker("data_protocolo", "Data do protocolo", LIMITE_PROTOCOLO);
	const campoTeimosinha = criarDatePicker("data_limite_teimosinha", "Data limite da teimosinha", LIMITE_TEIMOSINHA, BLOQUEIO_DIAS_MIN_TEIMOSINHA);

	conteudo.querySelector("#campo-protocolo").appendChild(campoProtocolo);
	conteudo.querySelector("#campo-teimosinha").appendChild(campoTeimosinha);

	const radios = conteudo.querySelectorAll('input[name="tipoConsulta"]');
	const blocoBloqueio = conteudo.querySelector("#opcoes-bloqueio");
	const blocoInfo = conteudo.querySelector("#opcoes-informacoes");
	const salario = conteudo.querySelector("#toggle-bloq-conta-salario");

	const infoSaldo = conteudo.querySelector("#info-saldo");
	const infoEnderecos = conteudo.querySelector("#info-enderecos");
	const infoAgencias = conteudo.querySelector("#info-agencias");
	const avisoInfo = conteudo.querySelector("#aviso-opcoes-informacoes");

	const atualizarAvisoInfo = () => {
		const algumMarcado =
			(infoSaldo && infoSaldo.checked) ||
			(infoEnderecos && infoEnderecos.checked) ||
			(infoAgencias && infoAgencias.checked);

		if (algumMarcado) {
			blocoInfo.classList.remove("effraim-nao-preenchido");
			if (avisoInfo) {
				avisoInfo.style.display = "none";
			}
		} else {
			blocoInfo.classList.add("effraim-nao-preenchido");
			if (avisoInfo) {
				avisoInfo.style.display = "block";
			}
		}
	};

	[infoSaldo, infoEnderecos, infoAgencias].forEach(chk => {
		if (!chk) return;
		chk.addEventListener("change", atualizarAvisoInfo);
	});

	// estado inicial de atenção (nenhuma opção marcada)
	atualizarAvisoInfo();

	// alternância de tipo
	radios.forEach(r => {
		r.addEventListener("change", () => {
			if (!r.checked) return;
			const tipo = r.value;
			const blocosValor = conteudo.querySelectorAll(".bloco_valor");
			const controlesSelecionarTodos = conteudo.querySelectorAll(".selecionar_todos");
			const controlesPermitirDif = conteudo.querySelectorAll(".permitir_diferentes");

			if (tipo === "bloqueio") {
				blocoBloqueio.style.display = "block";
				blocoInfo.style.display = "none";
				salario.disabled = false;
				blocosValor.forEach(div => {
					const chk = div.closest(".linha_parte")?.querySelector('input[name="consultado"]');
					div.style.display = chk?.checked ? "block" : "none";
				});
				controlesSelecionarTodos.forEach(el => el.closest("label").style.display = "block");
				controlesPermitirDif.forEach(el => el.closest("label").style.display = "block");
			} else {
				blocoBloqueio.style.display = "none";
				blocoInfo.style.display = "block";
				salario.disabled = true;
				blocosValor.forEach(div => (div.style.display = "none"));
				controlesSelecionarTodos.forEach(el => el.closest("label").style.display = "block");
				controlesPermitirDif.forEach(el => el.closest("label").style.display = "none");

				// garantir que o estado visual (borda/texto) reflita a seleção atual
				atualizarAvisoInfo();
			}
		});
	});

	// exibir blocos de data
	conteudo.querySelector("#toggle-agendar-protocolo").addEventListener("change", e => {
		conteudo.querySelector("#campo-protocolo").style.display = e.target.checked ? "block" : "none";
	});
	conteudo.querySelector("#toggle-teimosinha").addEventListener("change", e => {
		conteudo.querySelector("#campo-teimosinha").style.display = e.target.checked ? "block" : "none";
	});

	// interdependência das datas
	const campoDataTeimosinha = conteudo.querySelector("#data_limite_teimosinha");
	const campoDataProtocolo = conteudo.querySelector("#data_protocolo");

	campoDataProtocolo.addEventListener("change", () => {
		if (campoDataProtocolo.value) {
			const base = new Date(campoDataProtocolo.value);
			const min = new Date(base);
			min.setDate(base.getDate() + BLOQUEIO_DIAS_MIN_TEIMOSINHA);
			const max = new Date(base);
			max.setDate(base.getDate() + LIMITE_TEIMOSINHA);
			campoDataTeimosinha.min = min.toISOString().split("T")[0];
			campoDataTeimosinha.max = max.toISOString().split("T")[0];

			if (campoDataTeimosinha.value) {
				const valorTeimosinha = new Date(campoDataTeimosinha.value);
				if (valorTeimosinha < min) {
					campoDataTeimosinha.value = "";
					console.log("[SISBAJUD] Data de teimosinha apagada por estar anterior ao novo protocolo");
				}
			}
			console.log("[SISBAJUD] Teimosinha ajustada ao protocolo:", campoDataTeimosinha.min, campoDataTeimosinha.max);
		} else {
			const hoje = new Date();
			const min = new Date(hoje);
			min.setDate(hoje.getDate() + BLOQUEIO_DIAS_MIN_TEIMOSINHA);
			const max = new Date(hoje);
			max.setDate(hoje.getDate() + LIMITE_TEIMOSINHA);
			campoDataTeimosinha.min = min.toISOString().split("T")[0];
			campoDataTeimosinha.max = max.toISOString().split("T")[0];
			console.log("[SISBAJUD] Teimosinha voltou ao padrão (sem protocolo)");
		}
	});


	return new Promise(resolve => {
		conteudo.querySelector("#btn-prosseguir-consulta").addEventListener("click", () => {
			console.log("[SISBAJUD] Prosseguir clicado");

			const tipo = conteudo.querySelector('input[name="tipoConsulta"]:checked')?.value || "bloqueio";
			const consultanteSel = conteudo.querySelector('input[name="consultante"]:checked');
			const consultadosSel = [...conteudo.querySelectorAll('input[name="consultado"]:checked')];

			if (consultadosSel.length === 0) {
				alert("Selecione ao menos um consultado antes de prosseguir.");
				console.warn("[SISBAJUD] Nenhum consultado selecionado.");
				return;
			}

			const consultante = consultanteSel
				? { nome: consultanteSel.dataset.nome, cpf: consultanteSel.dataset.cpf }
				: null;

			const consultados = consultadosSel.map(cb => {
				const idx = cb.value;
				const input = conteudo.querySelector(`input.valor_consultado[data-idx="${idx}"]`);
				const raw = (input?.value || "").replace(/\./g, "").replace(",", ".");
				const valor = parseFloat(raw);
				return {
					nome: cb.dataset.nome,
					cpf: cb.dataset.cpf,
					valor_bloqueado: isNaN(valor) ? null : valor
				};
			});

			if (tipo === "bloqueio") {
				const semValor = consultados.find(e => e.valor_bloqueado === null);
				if (semValor) {
					alert(`Preencha o valor bloqueado para ${semValor.nome}.`);
					console.warn("[SISBAJUD] Consultado sem valor:", semValor.nome);
					return;
				}
			}

			const metadados_consulta = {
				tipo,
				ordem_sigilosa: conteudo.querySelector("#ordem-sigilosa").checked
			};

			if (tipo === "bloqueio") {
				Object.assign(metadados_consulta, {
					conta_salario: conteudo.querySelector("#toggle-bloq-conta-salario").checked,
					agendar_protocolo: conteudo.querySelector("#toggle-agendar-protocolo").checked,
					data_protocolo: conteudo.querySelector("#data_protocolo").value || null,
					teimosinha: conteudo.querySelector("#toggle-teimosinha").checked,
					data_limite_teimosinha: conteudo.querySelector("#data_limite_teimosinha").value || null
				});
			} else {
				Object.assign(metadados_consulta, {
					saldo: conteudo.querySelector("#info-saldo").checked,
					enderecos: conteudo.querySelector("#info-enderecos").checked,
					agencias: conteudo.querySelector("#info-agencias").checked,
					incluir_encerrados: conteudo.querySelector("#info-encerrados").checked
				});
			}

			const dados_consulta = { consultante, consultados, metadados_consulta };
			console.log("[SISBAJUD] dados_consulta:", dados_consulta);

			conteudo.innerHTML = "";
			resolve(dados_consulta);
		});
	});
}

// gerarListaPartes permanece igual, apenas renomeando "reu" -> "consultado"
function gerarListaPartes(partes = [], tipo) {
	console.log(`[SISBAJUD] gerarListaPartes(${tipo}) recebeu`, partes);

	if (!Array.isArray(partes) || partes.length === 0) {
		console.warn(`[SISBAJUD] Nenhum ${tipo} encontrado.`);
		return `<p>Nenhum ${tipo === "consultante" ? "consultante" : "consultado"} encontrado.</p>`;
	}

	const blocoId = `bloco_${tipo}_${Math.random().toString(36).slice(2,7)}`;
	const checkType = tipo === "consultante" ? "radio" : "checkbox";

	const checkboxes = partes.map((parte, i) => {
		const nome = parte?.nome || "(sem nome)";
		const cpf = parte?.cpf || "";
		let cpfHtml = "";

		if (!cpf) {
			cpfHtml = `<span class="effraim-texto-atencao">CPF/CNPJ não informado</span>`;
		} else {
			cpfHtml = `(${cpf})`;
		}

		const checked = i === 0 && tipo === "consultante" ? "checked" : "";
		const valorCampo =
			tipo === "consultado"
				? `<div class="bloco_valor" style="margin-left:18px; display:none;">
					 <label>Valor bloqueado:
					   <input type="text" class="valor_consultado" data-idx="${i}" style="width:120px; text-align:right;">
					 </label>
				   </div>`
				: "";
		return `
		  <div class="linha_parte" style="margin-bottom:6px;">
			<label style="display:block;">
			  <input type="${checkType}" name="${tipo}" value="${i}" data-nome="${nome}" data-cpf="${cpf}" ${checked}>
			  ${nome} ${cpfHtml}
			</label>
			${valorCampo}
		  </div>
		`;
	}).join("");

	const controlesExtras =
		tipo === "consultado" && partes.length > 1
			? `<label style="display:block;font-weight:bold;margin-top:6px;">
				   <input type="checkbox" class="selecionar_todos" data-tipo="${tipo}">
				   Selecionar todos os consultados
			   </label>
			   <label style="display:block;font-weight:bold;margin-top:4px;">
				   <input type="checkbox" class="permitir_diferentes" data-tipo="${tipo}">
				   Permitir valores diferentes por consultado
			   </label>`
			: "";
	let avisoHtml = "";
	if (tipo === "consultado") {
		avisoHtml = `
		<div id="aviso-consultados" class="effraim-texto-atencao" style="margin-top:6px;">
			Nenhum consultado selecionado.
		</div>
	`;
}


	const html = `
		<div id="${blocoId}" class="effraim-nao-preenchido" style="max-height:360px; overflow-y:auto; border:1px solid #ccc; padding:6px; border-radius:4px;">
			${controlesExtras}
			${checkboxes}
			${avisoHtml}
		</div>
	`;

	queueMicrotask(() => {
		const root = document.getElementById(blocoId);
		if (!root) return;

		const checkAll = root.querySelector(".selecionar_todos");
		const permitirDif = root.querySelector(".permitir_diferentes");
		const valores = root.querySelectorAll(".valor_consultado");
		let alterandoTodos = false;

		const aplicarMascara = (input) => {
			let val = input.value.replace(/\D/g, "");
			if (val === "") return (input.value = "");
			val = (parseInt(val, 10) / 100).toFixed(2) + "";
			val = val.replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
			input.value = val;
		};

		valores.forEach(v => {
			v.addEventListener("input", (e) => {
				aplicarMascara(e.target);
				if (permitirDif?.checked) return;
				const novo = e.target.value;
				valores.forEach(x => {
					if (x !== e.target) x.value = novo;
				});
			});
			v.addEventListener("blur", (e) => aplicarMascara(e.target));
		});

		const consultadoChecks = root.querySelectorAll('input[name="consultado"]');
		consultadoChecks.forEach((cb, i) => {
			const blocoValor = root.querySelector(`.valor_consultado[data-idx="${i}"]`)?.closest(".bloco_valor");

			if (cb.checked && blocoValor) {
				blocoValor.style.display = "block";
			}

			cb.addEventListener("change", () => {
				if (blocoValor) {
					if (cb.checked) {
						const tipoAtual = document.querySelector('input[name="tipoConsulta"]:checked')?.value;
						if (tipoAtual === "bloqueio") {
							blocoValor.style.display = "block";

							if (!permitirDif?.checked && valores.length) {
								const base = valores[0].value;
								if (base) {
									blocoValor.querySelector(".valor_consultado").value = base;
								}
							}
						}
					} else {
						blocoValor.style.display = "none";
					}
				}

				if (!alterandoTodos && checkAll) {
					const boxes = root.querySelectorAll(`input[name="${tipo}"]`);
					const todosMarcados = [...boxes].every(x => x.checked);
					checkAll.checked = todosMarcados;
				}

				// ATENÇÃO VISUAL PARA CONSULTADO
				if (tipo === "consultado") {
					const algumMarcado = [...consultadoChecks].some(x => x.checked);
					const aviso = root.querySelector("#aviso-consultados");

					if (algumMarcado) {
						root.classList.remove("effraim-nao-preenchido");
						if (aviso) aviso.style.display = "none";
					} else {
						root.classList.add("effraim-nao-preenchido");
						if (aviso) aviso.style.display = "block";
					}
				}
			});
		});


		if (checkAll) {
			checkAll.addEventListener("change", () => {
				alterandoTodos = true;
				const boxes = root.querySelectorAll(`input[name="${tipo}"]`);
				boxes.forEach(cb => {
					cb.checked = checkAll.checked;
					cb.dispatchEvent(new Event("change"));
				});
				alterandoTodos = false;
				console.log(`[SISBAJUD] ${tipo} selecionar todos ->`, checkAll.checked);
			});
		}

		if (permitirDif) {
			permitirDif.addEventListener("change", () => {
				console.log(`[SISBAJUD] permitir valores diferentes ->`, permitirDif.checked);
				if (!permitirDif.checked && valores.length) {
					const base = valores[0].value;
					valores.forEach(x => (x.value = base));
				}
			});
		}

		console.log(`[SISBAJUD] Lista pronta (${tipo}) com ${partes.length} itens`);
	});

	return html;
}
