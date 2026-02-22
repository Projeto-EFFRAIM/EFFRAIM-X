// ==========================================================
// Leitura de dados do processo (Eproc)
// ==========================================================

export function consulta_dados_processo() {
  const get = s => document.querySelector(s)?.textContent?.trim() || null;
  const valorCausa = consultar_valor_causa_tbl_copiar_excel();

  const capa = {
    numProcesso:
      document.querySelector("#txtNumProcesso")?.value?.trim() ||
      get("#txtNumProcesso"),
    magistrado: get("#txtMagistrado"),
    classe: get("#txtClasse"),
    competencia: get("#txtCompetencia"),
    autuacao: get("#txtAutuacao"),
    localidade: get("#txtLocalidade"),
    situacao: get("#txtSituacao"),
    localizadores: consultar_localizadores_consulta_processual(),
    orgaoJulgador: get("#txtOrgaoJulgador"),
    valorCausa: valorCausa?.texto || null,
    valorCausaNumero: Number.isFinite(valorCausa?.numero) ? valorCausa.numero : null
  };

  const tipos = ["AUTOR", "REU", "INTERESSADO", "MPF", "PERITO"];
  const partes = Object.fromEntries(
    tipos.map(tipo => {
      const seletores = document.querySelectorAll(`.infraNomeParte[data-parte="${tipo}"]`);
      const lista = Array.from(seletores).map((el, i) => ({
        nome: el.textContent?.trim() || null,
        cpf:
          document.querySelector(`#spnCpfParte${tipo[0] + tipo.slice(1).toLowerCase()}${i}`)
            ?.textContent?.trim() || null
      }));
      return [tipo, lista];
    })
  );

  return { capa, partes };
}

function normalizarTextoBuscaProcesso(texto = "") {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function extrairNumeroPtBr(texto = "") {
  const bruto = String(texto || "").trim();
  if (!bruto) return { texto: null, numero: null };

  const m = bruto.match(/(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2}|\d+(?:\.\d+)?)/);
  const textoNum = m?.[1] || null;
  if (!textoNum) return { texto: null, numero: null };

  const normalizado = textoNum.replace(/\./g, "").replace(",", ".");
  const numero = Number.parseFloat(normalizado);
  return {
    texto: textoNum,
    numero: Number.isFinite(numero) ? numero : null
  };
}

function consultar_valor_causa_tbl_copiar_excel() {
  const tabela = document.querySelector("#tblCopiarExcel");
  if (!tabela) return null;

  const linhas = [...tabela.querySelectorAll("tr")];
  for (const tr of linhas) {
    const celulas = [...tr.querySelectorAll("th, td")];
    if (!celulas.length) continue;

    const textos = celulas.map((cel) => String(cel.textContent || "").replace(/\s+/g, " ").trim());
    const linhaTextoNorm = normalizarTextoBuscaProcesso(textos.join(" "));
    if (!linhaTextoNorm.includes("valor da causa")) continue;

    // Prioriza células sem o rótulo, depois a última célula, e por fim a linha toda.
    const candidatosRotuloExcluido = textos.filter((txt) => !normalizarTextoBuscaProcesso(txt).includes("valor da causa"));
    const candidatos = [
      ...candidatosRotuloExcluido.reverse(),
      textos[textos.length - 1],
      ...textos.slice(0, -1).reverse()
    ].filter(Boolean);
    for (const candidato of candidatos) {
      const extraido = extrairNumeroPtBr(candidato);
      if (extraido?.texto) return extraido;
    }

    const extraidoLinha = extrairNumeroPtBr(textos.join(" "));
    if (extraidoLinha?.texto) return extraidoLinha;
  }

  return null;
}

// ==========================================================
// Localizadores do processo (Eproc)
// ==========================================================

function normalizarTextoLocalizador(texto = "") {
  return String(texto)
    .replace(/<[^>]*>/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function limparTextoLocalizador(texto = "") {
  return String(texto)
    .replace(/\s+/g, " ")
    .replace(/[⌛✅⚠️🟣]/g, "")
    .trim();
}

// Consulta processual (acao=processo_selecionar):
// localizadores aparecem em #dvLocalizadoresOrgao, nos anchors id="AbreLocalizadores"
export function consultar_localizadores_consulta_processual() {
  const encontrados = new Set();

  document.querySelectorAll("#dvLocalizadoresOrgao a#AbreLocalizadores").forEach((a) => {
    const txt = String(a.innerHTML || "").replace(/\s+/g, " ").trim();
    if (txt) encontrados.add(txt);
  });

  return Array.from(encontrados);
}

// Lista de processos / tabelas:
// localizadores geralmente aparecem em células de tabela e/ou blocos com input numIdLocalizadorOrgao
export function consultar_localizadores_lista_processos() {
  const encontrados = new Set();

  document.querySelectorAll("input[name='numIdLocalizadorOrgao']").forEach((input) => {
    const txt = limparTextoLocalizador(input.parentElement?.textContent || "");
    if (txt) {
      txt
        .split(/\s-\s/g)
        .map(limparTextoLocalizador)
        .filter(Boolean)
        .forEach((item) => encontrados.add(item));
    }
  });

  document.querySelectorAll("td[id^='tdListaDeProcessosPorLocalizadorDesc'], td[id^='tdMeusLocalizadoresDesc']").forEach((td) => {
    const txt = limparTextoLocalizador(td.textContent || "");
    if (txt) encontrados.add(txt);
  });

  document.querySelectorAll("#fldLocalizadores").forEach((secao) => {
    const txt = limparTextoLocalizador(secao.textContent || "");
    if (txt) {
      txt
        .split(/\s-\s/g)
        .map(limparTextoLocalizador)
        .filter(Boolean)
        .forEach((item) => encontrados.add(item));
    }
  });

  return Array.from(encontrados);
}

export function consultar_localizadores_processo() {
  const daConsulta = consultar_localizadores_consulta_processual();
  if (daConsulta.length) return daConsulta;
  return consultar_localizadores_lista_processos();
}

export function processo_tem_localizador(alvos = []) {
  const lista = consultar_localizadores_processo();
  if (!Array.isArray(alvos) || alvos.length === 0) return lista.length > 0;

  const normalizados = lista.map(normalizarTextoLocalizador);
  const termos = alvos
    .map(normalizarTextoLocalizador)
    .filter(Boolean);

  return termos.some((termo) => normalizados.some((item) => item.includes(termo)));
}
