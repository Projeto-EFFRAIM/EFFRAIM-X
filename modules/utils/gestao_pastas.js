const CHAVES_PADRAO = {
	chavePastas: "pastas",
	chaveItens: "itens",
	chaveItensRaiz: "itens_soltos"
};

function obterChaves(chaves = {}) {
	return { ...CHAVES_PADRAO, ...(chaves || {}) };
}

function criarNoPasta(nome, chaves) {
	const { chavePastas, chaveItens } = obterChaves(chaves);
	return {
		id: crypto.randomUUID(),
		nome,
		[chaveItens]: [],
		[chavePastas]: []
	};
}

export function obterBucketPorCaminho(arvore, caminho = [], chaves = {}) {
	const { chavePastas } = obterChaves(chaves);
	let node = arvore;
	for (const nome of caminho) {
		node = node?.[chavePastas]?.find(p => p.nome === nome);
		if (!node) return null;
	}
	return node;
}

export function garantirCaminhoPastas(arvore, caminho = [], chaves = {}) {
	const { chavePastas } = obterChaves(chaves);
	let node = arvore;
	for (const nome of caminho) {
		if (!node[chavePastas]) node[chavePastas] = [];
		let next = node[chavePastas].find(p => p.nome === nome);
		if (!next) {
			next = criarNoPasta(nome, chaves);
			node[chavePastas].push(next);
		}
		node = next;
	}
	return node;
}

export function listarCaminhosPastas(arvore, chaves = {}) {
	const { chavePastas } = obterChaves(chaves);
	const caminhos = [];
	const walk = (pasta, caminho = []) => {
		const atual = [...caminho, pasta.nome];
		caminhos.push(atual);
		(pasta[chavePastas] || []).forEach(subpasta => walk(subpasta, atual));
	};
	(arvore?.[chavePastas] || []).forEach(pasta => walk(pasta, []));
	return caminhos;
}

export function coletarItensPastaRecursivo(pasta, chaves = {}) {
	const { chavePastas, chaveItens } = obterChaves(chaves);
	let itens = [...(pasta?.[chaveItens] || [])];
	(pasta?.[chavePastas] || []).forEach(subpasta => {
		itens = itens.concat(coletarItensPastaRecursivo(subpasta, chaves));
	});
	return itens;
}

export function reordenarPastasNoCaminho(arvore, caminhoPai = [], novaOrdemNomes = [], chaves = {}) {
	const { chavePastas } = obterChaves(chaves);
	const bucket = caminhoPai.length === 0 ? arvore : obterBucketPorCaminho(arvore, caminhoPai, chaves);
	if (!bucket || !bucket[chavePastas]) return false;
	const mapa = new Map(bucket[chavePastas].map(pasta => [pasta.nome, pasta]));
	const novaOrdem = [];
	novaOrdemNomes.forEach(nome => {
		if (mapa.has(nome)) novaOrdem.push(mapa.get(nome));
	});
	bucket[chavePastas] = novaOrdem;
	return true;
}

export function moverItemEntreCaminhos(arvore, meta, caminhoOrigem = [], caminhoDestino = [], chaves = {}) {
	const { chaveItens, chaveItensRaiz } = obterChaves(chaves);
	const origem = caminhoOrigem.length === 0
		? { [chaveItens]: arvore[chaveItensRaiz] || [] }
		: obterBucketPorCaminho(arvore, caminhoOrigem, chaves);
	if (!origem || !origem[chaveItens]) return false;

	const item = origem[chaveItens].find(
		it => it.id === meta.id && it.secaoId === meta.secaoId
	);
	if (!item) return false;

	origem[chaveItens] = origem[chaveItens].filter(
		it => !(it.id === meta.id && it.secaoId === meta.secaoId)
	);
	if (caminhoOrigem.length === 0) arvore[chaveItensRaiz] = origem[chaveItens];

	let destino;
	if (caminhoDestino.length === 0) {
		arvore[chaveItensRaiz] = arvore[chaveItensRaiz] || [];
		destino = { [chaveItens]: arvore[chaveItensRaiz] };
	} else {
		destino = obterBucketPorCaminho(arvore, caminhoDestino, chaves) || garantirCaminhoPastas(arvore, caminhoDestino, chaves);
		destino[chaveItens] = destino[chaveItens] || [];
	}

	destino[chaveItens].push(item);
	return true;
}

export function removerPastaPorCaminho(arvore, caminho = [], moverConteudoParaRaiz = false, chaves = {}) {
	const { chavePastas, chaveItens, chaveItensRaiz } = obterChaves(chaves);
	if (!Array.isArray(caminho) || caminho.length === 0) return false;

	const caminhoPai = caminho.slice(0, -1);
	const nomePasta = caminho[caminho.length - 1];
	const pai = caminho.length === 1 ? arvore : obterBucketPorCaminho(arvore, caminhoPai, chaves);
	if (!pai || !pai[chavePastas]) return false;

	const idx = pai[chavePastas].findIndex(p => p.nome === nomePasta);
	if (idx < 0) return false;

	const pasta = pai[chavePastas][idx];
	pai[chavePastas].splice(idx, 1);

	if (moverConteudoParaRaiz) {
		arvore[chaveItensRaiz] = arvore[chaveItensRaiz] || [];
		arvore[chavePastas] = arvore[chavePastas] || [];
		if (pasta[chaveItens]?.length) arvore[chaveItensRaiz].push(...pasta[chaveItens]);
		if (pasta[chavePastas]?.length) arvore[chavePastas].push(...pasta[chavePastas]);
	}

	return true;
}

export function renomearPastaPorCaminho(arvore, caminho = [], novoNome = "", chaves = {}) {
	const { chavePastas } = obterChaves(chaves);
	if (!Array.isArray(caminho) || caminho.length === 0) return { ok: false, motivo: "caminho-invalido" };

	const nomeLimpo = String(novoNome || "").trim();
	if (!nomeLimpo) return { ok: false, motivo: "nome-vazio" };

	const caminhoPai = caminho.slice(0, -1);
	const nomeAtual = caminho[caminho.length - 1];
	const pai = caminho.length === 1 ? arvore : obterBucketPorCaminho(arvore, caminhoPai, chaves);
	if (!pai || !pai[chavePastas]) return { ok: false, motivo: "pai-inexistente" };

	const pasta = pai[chavePastas].find(p => p.nome === nomeAtual);
	if (!pasta) return { ok: false, motivo: "pasta-inexistente" };
	if (nomeLimpo === nomeAtual) return { ok: true, alterado: false };
	if (pai[chavePastas].some(p => p.nome === nomeLimpo)) {
		return { ok: false, motivo: "nome-duplicado" };
	}

	pasta.nome = nomeLimpo;
	return { ok: true, alterado: true };
}
