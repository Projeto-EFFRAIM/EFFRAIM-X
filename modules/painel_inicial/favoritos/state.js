import { carregarConfiguracoes } from "../../utils/configuracoes.js";

export const FAVORITOS_PATH = "painel_favoritos";
export const FAVORITOS_LIMITE_TOTAL = 50;

export async function obterFavoritos() {
	const cfg = await carregarConfiguracoes();
	const fav = cfg[FAVORITOS_PATH];
	if (fav) return fav;
	return { pastas: [], itens_soltos: [] };
}

export async function salvarFavoritos(fav) {
	const cfg = await carregarConfiguracoes();
	cfg[FAVORITOS_PATH] = fav;
	await chrome.storage.sync.set({ effraim_configuracoes: cfg });
}

function ensurePath(fav, pathParts) {
	let node = fav;
	for (const part of pathParts) {
		if (!node.pastas) node.pastas = [];
		let next = node.pastas.find(p => p.nome === part);
		if (!next) {
			next = { id: crypto.randomUUID(), nome: part, itens: [], pastas: [] };
			node.pastas.push(next);
		}
		node = next;
	}
	return node;
}

function contarPastasRecursivo(pastas = []) {
	let total = 0;
	(pastas || []).forEach(p => {
		total += 1;
		total += contarPastasRecursivo(p.pastas || []);
	});
	return total;
}

function contarItensRecursivo(pastas = []) {
	let total = 0;
	(pastas || []).forEach(p => {
		total += (p.itens || []).length;
		total += contarItensRecursivo(p.pastas || []);
	});
	return total;
}

export function contarFavoritosEPastas(fav) {
	if (!fav) return 0;
	const itensRaiz = (fav.itens_soltos || []).length;
	const itensPastas = contarItensRecursivo(fav.pastas || []);
	const qtdPastas = contarPastasRecursivo(fav.pastas || []);
	return itensRaiz + itensPastas + qtdPastas;
}

function contarPastasNovasNecessarias(fav, pathParts = []) {
	let node = fav;
	let novas = 0;
	for (const part of pathParts) {
		if (!node.pastas) node.pastas = [];
		let next = node.pastas.find(p => p.nome === part);
		if (!next) {
			novas += 1;
			next = { id: "__placeholder__", nome: part, itens: [], pastas: [] };
		}
		node = next;
	}
	return novas;
}

function excedeLimiteFavoritos(fav, incremento = 0) {
	return (contarFavoritosEPastas(fav) + Math.max(0, incremento)) > FAVORITOS_LIMITE_TOTAL;
}

export async function isFavorito(secaoId, itemId) {
	const fav = await obterFavoritos();
	if (fav.itens_soltos?.some(it => it.secaoId === secaoId && it.id === itemId)) return true;
	const walk = folder => {
		if (folder.itens?.some(it => it.secaoId === secaoId && it.id === itemId)) return true;
		return (folder.pastas || []).some(walk);
	};
	return (fav.pastas || []).some(walk);
}

export async function adicionarFavorito(meta, path = []) {
	const caminho = Array.isArray(path) ? path.slice(0, 2) : [];
	const fav = await obterFavoritos();

	const bucketExistente = caminho.length === 0
		? { itens: fav.itens_soltos || [] }
		: obterBucket(fav, caminho);
	const jaExisteNoDestino = !!bucketExistente?.itens?.some(it => it.secaoId === meta.secaoId && it.id === meta.id);
	const pastasNovas = caminho.length ? contarPastasNovasNecessarias(fav, caminho) : 0;
	const incremento = pastasNovas + (jaExisteNoDestino ? 0 : 1);
	if (excedeLimiteFavoritos(fav, incremento)) {
		return { ok: false, motivo: "limite" };
	}

	let bucket;
	if (caminho.length === 0) {
		if (!fav.itens_soltos) fav.itens_soltos = [];
		bucket = fav.itens_soltos;
	} else {
		const folder = ensurePath(fav, caminho);
		if (!folder.itens) folder.itens = [];
		bucket = folder.itens;
	}

	if (!bucket.some(it => it.secaoId === meta.secaoId && it.id === meta.id)) {
		bucket.push(meta);
		if (!bucket.ordenacao_manual && bucket.sort) {
			bucket.sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));
		}
		await salvarFavoritos(fav);
		return { ok: true, adicionado: true };
	}
	return { ok: true, adicionado: false };
}

export async function removerFavorito(secaoId, itemId) {
	const fav = await obterFavoritos();
	let changed = false;

	if (fav.itens_soltos) {
		const len = fav.itens_soltos.length;
		fav.itens_soltos = fav.itens_soltos.filter(it => !(it.secaoId === secaoId && it.id === itemId));
		if (fav.itens_soltos.length !== len) changed = true;
	}

	const removeInFolder = folder => {
		if (folder.itens) {
			const len = folder.itens.length;
			folder.itens = folder.itens.filter(it => !(it.secaoId === secaoId && it.id === itemId));
			if (folder.itens.length !== len) changed = true;
		}
		if (folder.pastas) folder.pastas.forEach(removeInFolder);
	};
	(fav.pastas || []).forEach(removeInFolder);

	if (changed) await salvarFavoritos(fav);
	return changed;
}

export async function reordenarItens(path, novaOrdemIds) {
	const fav = await obterFavoritos();
	const bucket = path.length === 0 ? { itens: fav.itens_soltos } : obterBucket(fav, path);
	if (!bucket || !bucket.itens) return false;
	const mapa = new Map(bucket.itens.map(it => [it.id, it]));
	const novaLista = [];
	novaOrdemIds.forEach(id => {
		if (mapa.has(id)) novaLista.push(mapa.get(id));
	});
	bucket.itens
		.filter(it => !mapa.has(it.id) && !novaOrdemIds.includes(it.id))
		.forEach(it => novaLista.push(it));
	bucket.itens = novaLista;
	if (path.length === 0) {
		fav.itens_soltos = bucket.itens;
	} else {
		bucket.ordenacao_manual = true;
	}
	await salvarFavoritos(fav);
	return true;
}

export async function reordenarPastas(path, novaOrdemNomes) {
	const fav = await obterFavoritos();
	const bucket = path.length === 0 ? fav : obterBucket(fav, path);
	if (!bucket || !bucket.pastas) return false;
	const mapa = new Map(bucket.pastas.map(p => [p.nome, p]));
	const nova = [];
	novaOrdemNomes.forEach(n => { if (mapa.has(n)) nova.push(mapa.get(n)); });
	bucket.pastas = nova;
	await salvarFavoritos(fav);
	return true;
}

function obterBucket(fav, path = []) {
	let node = fav;
	for (const nome of path) {
		if (!node.pastas) return null;
		node = node.pastas.find(p => p.nome === nome);
		if (!node) return null;
	}
	return node;
}

export async function moverItem(meta, fromPath, toPath) {
	const fav = await obterFavoritos();

	const origem = fromPath.length === 0 ? { itens: fav.itens_soltos } : obterBucket(fav, fromPath);
	if (!origem || !origem.itens) return false;
	const item = origem.itens.find(it => it.id === meta.id && it.secaoId === meta.secaoId);
	if (!item) return false;
	origem.itens = origem.itens.filter(it => !(it.id === meta.id && it.secaoId === meta.secaoId));
	if (fromPath.length === 0) fav.itens_soltos = origem.itens;

	let destino;
	if (toPath.length === 0) {
		fav.itens_soltos = fav.itens_soltos || [];
		destino = { itens: fav.itens_soltos };
	} else {
		destino = obterBucket(fav, toPath) || ensurePath(fav, toPath);
		if (!destino.itens) destino.itens = [];
	}
	destino.itens.push(item);

	await salvarFavoritos(fav);
	return true;
}

export async function removerPasta(path, moverParaRaiz = false) {
	const fav = await obterFavoritos();
	const parentPath = path.slice(0, -1);
	const pastaNome = path[path.length - 1];
	const parent = path.length === 1 ? fav : obterBucket(fav, parentPath);
	if (!parent || !parent.pastas) return false;
	const idx = parent.pastas.findIndex(p => p.nome === pastaNome);
	if (idx < 0) return false;
	const pasta = parent.pastas[idx];
	parent.pastas.splice(idx, 1);

	if (moverParaRaiz) {
		fav.itens_soltos = fav.itens_soltos || [];
		if (pasta.itens) fav.itens_soltos.push(...pasta.itens);
		fav.pastas = fav.pastas || [];
		if (pasta.pastas) fav.pastas.push(...pasta.pastas);
	}

	await salvarFavoritos(fav);
	return true;
}

export async function criarPastaRaiz(nome) {
	const nomeLimpo = String(nome || "").trim();
	if (!nomeLimpo) return { ok: false, motivo: "nome-vazio" };

	const fav = await obterFavoritos();
	fav.pastas = fav.pastas || [];
	if (fav.pastas.some(p => p.nome === nomeLimpo)) {
		return { ok: true, criado: false, jaExiste: true };
	}
	if (excedeLimiteFavoritos(fav, 1)) {
		return { ok: false, motivo: "limite" };
	}

	fav.pastas.push({ id: crypto.randomUUID(), nome: nomeLimpo, itens: [], pastas: [] });
	await salvarFavoritos(fav);
	return { ok: true, criado: true };
}

export async function criarSubpasta(pathPai, nome) {
	const pai = Array.isArray(pathPai) ? pathPai.slice(0, 2) : [];
	const nomeLimpo = String(nome || "").trim();
	if (!nomeLimpo) return { ok: false, motivo: "nome-vazio" };
	// suporte apenas raiz > nivel1 > nivel2
	if (pai.length !== 1) return { ok: false, motivo: "nivel-invalido" };

	const fav = await obterFavoritos();
	const bucketPai = obterBucket(fav, pai);
	if (!bucketPai) return { ok: false, motivo: "pai-inexistente" };
	bucketPai.pastas = bucketPai.pastas || [];

	if (bucketPai.pastas.some(p => p.nome === nomeLimpo)) {
		return { ok: true, criado: false, jaExiste: true };
	}
	if (excedeLimiteFavoritos(fav, 1)) {
		return { ok: false, motivo: "limite" };
	}

	bucketPai.pastas.push({ id: crypto.randomUUID(), nome: nomeLimpo, itens: [], pastas: [] });
	await salvarFavoritos(fav);
	return { ok: true, criado: true };
}
