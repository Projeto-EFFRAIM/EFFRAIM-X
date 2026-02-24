import {
	obterBucketPorCaminho,
	garantirCaminhoPastas,
	moverItemEntreCaminhos,
	reordenarPastasNoCaminho,
	removerPastaPorCaminho,
	renomearPastaPorCaminho
} from "../../utils/gestao_pastas.js";
import { readChunkedObject, writeChunkedObject } from "../../utils/sync_chunk_storage.js";

export const FAVORITOS_PATH = "painel_favoritos";
const FAVORITOS_SYNC_KEY = "effraim_painel_favoritos_v1";
export const FAVORITOS_LIMITE_TOTAL = 50;
export const COLORIDOS_SILENCIOSOS_LIMITE_TOTAL = 50;

function normalizarEstruturaFavoritos(fav) {
	if (!fav || typeof fav !== "object") return { pastas: [], itens_soltos: [], itens_coloridos: [] };
	fav.pastas = Array.isArray(fav.pastas) ? fav.pastas : [];
	fav.itens_soltos = Array.isArray(fav.itens_soltos) ? fav.itens_soltos : [];
	fav.itens_coloridos = Array.isArray(fav.itens_coloridos) ? fav.itens_coloridos : [];
	fav.pastas_estado_abertas =
		fav.pastas_estado_abertas && typeof fav.pastas_estado_abertas === "object"
			? fav.pastas_estado_abertas
			: {};

	const idsPastas = new Set();
	const normalizarPastasRecursivo = (pastas) => {
		(pastas || []).forEach((pasta) => {
			if (!pasta || typeof pasta !== "object") return;
			if (!pasta.id && typeof crypto?.randomUUID === "function") {
				pasta.id = crypto.randomUUID();
			} else if (!pasta.id) {
				pasta.id = `pasta_${Math.random().toString(36).slice(2, 10)}`;
			}
			idsPastas.add(String(pasta.id));
			pasta.itens = Array.isArray(pasta.itens) ? pasta.itens : [];
			pasta.pastas = Array.isArray(pasta.pastas) ? pasta.pastas : [];
			normalizarPastasRecursivo(pasta.pastas);
		});
	};
	normalizarPastasRecursivo(fav.pastas);

	for (const chave of Object.keys(fav.pastas_estado_abertas)) {
		if (!idsPastas.has(String(chave))) delete fav.pastas_estado_abertas[chave];
	}
	return fav;
}

function normalizarCor(cor) {
	const valor = String(cor || "").trim();
	return valor || null;
}

function obterListaColoridosSilenciosos(fav) {
	fav.itens_coloridos = Array.isArray(fav.itens_coloridos) ? fav.itens_coloridos : [];
	return fav.itens_coloridos;
}

function localizarIndiceColoridoSilencioso(fav, secaoId, itemId) {
	const lista = obterListaColoridosSilenciosos(fav);
	return lista.findIndex(it => it.secaoId === secaoId && it.id === itemId);
}

function removerColoridoSilencioso(fav, secaoId, itemId) {
	const idx = localizarIndiceColoridoSilencioso(fav, secaoId, itemId);
	if (idx < 0) return false;
	obterListaColoridosSilenciosos(fav).splice(idx, 1);
	return true;
}

function upsertColoridoSilencioso(fav, meta, cor) {
	const corNormalizada = normalizarCor(cor);
	const lista = obterListaColoridosSilenciosos(fav);
	const idx = localizarIndiceColoridoSilencioso(fav, meta.secaoId, meta.id);

	if (!corNormalizada) {
		if (idx < 0) return { ok: true, alterado: false, removido: false };
		lista.splice(idx, 1);
		return { ok: true, alterado: true, removido: true };
	}

	if (idx >= 0) {
		lista[idx] = {
			...lista[idx],
			cor_fundo: corNormalizada,
			updatedAt: Date.now()
		};
		return { ok: true, alterado: true, atualizado: true };
	}

	if (lista.length >= COLORIDOS_SILENCIOSOS_LIMITE_TOTAL) {
		return { ok: false, motivo: "limite-coloridos" };
	}

	lista.push({
		secaoId: meta.secaoId,
		id: meta.id,
		cor_fundo: corNormalizada,
		updatedAt: Date.now()
	});
	return { ok: true, alterado: true, criado: true };
}

function localizarItemFavoritoNoArvore(fav, secaoId, itemId) {
	const raiz = fav.itens_soltos?.find(it => it.secaoId === secaoId && it.id === itemId);
	if (raiz) return raiz;
	const walk = (pastas = []) => {
		for (const pasta of pastas) {
			const item = (pasta.itens || []).find(it => it.secaoId === secaoId && it.id === itemId);
			if (item) return item;
			const sub = walk(pasta.pastas || []);
			if (sub) return sub;
		}
		return null;
	};
	return walk(fav.pastas || []);
}

function obterCorEfetivaItemEmMemoria(fav, secaoId, itemId) {
	const itemRaiz = (fav.itens_soltos || []).find(it => it.secaoId === secaoId && it.id === itemId);
	if (itemRaiz?.cor_fundo) return itemRaiz.cor_fundo;

	const walk = (pastas = [], corHerdada = null) => {
		for (const pasta of pastas) {
			const corAtual = pasta.cor_fundo || corHerdada || null;
			const item = (pasta.itens || []).find(it => it.secaoId === secaoId && it.id === itemId);
			if (item) return item.cor_fundo || corAtual || null;
			const sub = walk(pasta.pastas || [], corAtual);
			if (sub) return sub;
		}
		return null;
	};
	const corFavorito = walk(fav.pastas || [], null);
	if (corFavorito) return corFavorito;

	const silencioso = obterListaColoridosSilenciosos(fav).find(it => it.secaoId === secaoId && it.id === itemId);
	return silencioso?.cor_fundo || null;
}

export async function obterFavoritos() {
	const fav = await readChunkedObject(FAVORITOS_SYNC_KEY);
	return normalizarEstruturaFavoritos(fav);
}

export async function salvarFavoritos(fav) {
	try {
		await writeChunkedObject(FAVORITOS_SYNC_KEY, normalizarEstruturaFavoritos(fav));
		return { ok: true };
	} catch (e) {
		if (e?.code === "sync_fixed_chunks_limit_exceeded") {
			return { ok: false, motivo: "limite-storage" };
		}
		throw e;
	}
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
	const fav = normalizarEstruturaFavoritos(await obterFavoritos());

	const bucketExistente = caminho.length === 0
		? { itens: fav.itens_soltos || [] }
		: obterBucketPorCaminho(fav, caminho);
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
		const folder = garantirCaminhoPastas(fav, caminho);
		if (!folder.itens) folder.itens = [];
		bucket = folder.itens;
	}

	if (!bucket.some(it => it.secaoId === meta.secaoId && it.id === meta.id)) {
		const corSilenciosa = obterListaColoridosSilenciosos(fav)
			.find(it => it.secaoId === meta.secaoId && it.id === meta.id)?.cor_fundo;
		const metaComCor = corSilenciosa ? { ...meta, cor_fundo: corSilenciosa } : meta;
		bucket.push(metaComCor);
		removerColoridoSilencioso(fav, meta.secaoId, meta.id);
		if (!bucket.ordenacao_manual && bucket.sort) {
			bucket.sort((a, b) => (a.titulo || "").localeCompare(b.titulo || ""));
		}
		const salvo = await salvarFavoritos(fav);
		if (!salvo?.ok) return salvo;
		return { ok: true, adicionado: true };
	}
	return { ok: true, adicionado: false };
}

export async function removerFavorito(secaoId, itemId) {
	const fav = normalizarEstruturaFavoritos(await obterFavoritos());
	let changed = false;
	let corRemovida = null;

	if (fav.itens_soltos) {
		const len = fav.itens_soltos.length;
		const item = fav.itens_soltos.find(it => it.secaoId === secaoId && it.id === itemId);
		if (item?.cor_fundo) corRemovida = item.cor_fundo;
		fav.itens_soltos = fav.itens_soltos.filter(it => !(it.secaoId === secaoId && it.id === itemId));
		if (fav.itens_soltos.length !== len) changed = true;
	}

	const removeInFolder = folder => {
		if (folder.itens) {
			const len = folder.itens.length;
			const item = folder.itens.find(it => it.secaoId === secaoId && it.id === itemId);
			if (item?.cor_fundo) corRemovida = item.cor_fundo;
			folder.itens = folder.itens.filter(it => !(it.secaoId === secaoId && it.id === itemId));
			if (folder.itens.length !== len) changed = true;
		}
		if (folder.pastas) folder.pastas.forEach(removeInFolder);
	};
	(fav.pastas || []).forEach(removeInFolder);

	if (changed && corRemovida) {
		upsertColoridoSilencioso(fav, { secaoId, id: itemId }, corRemovida);
	}
	if (changed) {
		const salvo = await salvarFavoritos(fav);
		if (!salvo?.ok) return false;
	}
	return changed;
}

export async function reordenarItens(path, novaOrdemIds) {
	const fav = normalizarEstruturaFavoritos(await obterFavoritos());
	const bucket = path.length === 0 ? { itens: fav.itens_soltos } : obterBucketPorCaminho(fav, path);
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
	const salvo = await salvarFavoritos(fav);
	if (!salvo?.ok) return false;
	return true;
}

export async function reordenarPastas(path, novaOrdemNomes) {
	const fav = normalizarEstruturaFavoritos(await obterFavoritos());
	const ok = reordenarPastasNoCaminho(fav, path, novaOrdemNomes);
	if (!ok) return false;
	const salvo = await salvarFavoritos(fav);
	if (!salvo?.ok) return false;
	return true;
}

export async function moverItem(meta, fromPath, toPath) {
	const fav = normalizarEstruturaFavoritos(await obterFavoritos());
	const ok = moverItemEntreCaminhos(fav, meta, fromPath, toPath);
	if (!ok) return false;
	const salvo = await salvarFavoritos(fav);
	if (!salvo?.ok) return false;
	return true;
}

export async function removerPasta(path, moverParaRaiz = false) {
	const fav = normalizarEstruturaFavoritos(await obterFavoritos());
	const ok = removerPastaPorCaminho(fav, path, moverParaRaiz);
	if (!ok) return false;
	const salvo = await salvarFavoritos(fav);
	if (!salvo?.ok) return false;
	return true;
}

export async function renomearPasta(path, novoNome) {
	const fav = normalizarEstruturaFavoritos(await obterFavoritos());
	const resultado = renomearPastaPorCaminho(fav, path, novoNome);
	if (!resultado?.ok || !resultado?.alterado) return resultado;
	const salvo = await salvarFavoritos(fav);
	if (!salvo?.ok) return { ok: false, motivo: "limite-storage" };
	return resultado;
}

export async function criarPastaRaiz(nome) {
	const nomeLimpo = String(nome || "").trim();
	if (!nomeLimpo) return { ok: false, motivo: "nome-vazio" };

	const fav = normalizarEstruturaFavoritos(await obterFavoritos());
	fav.pastas = fav.pastas || [];
	if (fav.pastas.some(p => p.nome === nomeLimpo)) {
		return { ok: true, criado: false, jaExiste: true };
	}
	if (excedeLimiteFavoritos(fav, 1)) {
		return { ok: false, motivo: "limite" };
	}

	fav.pastas.push({ id: crypto.randomUUID(), nome: nomeLimpo, itens: [], pastas: [] });
	const salvo = await salvarFavoritos(fav);
	if (!salvo?.ok) return { ok: false, motivo: "limite-storage" };
	return { ok: true, criado: true };
}

export async function criarSubpasta(pathPai, nome) {
	const pai = Array.isArray(pathPai) ? pathPai.slice(0, 2) : [];
	const nomeLimpo = String(nome || "").trim();
	if (!nomeLimpo) return { ok: false, motivo: "nome-vazio" };
	// suporte apenas raiz > nivel1 > nivel2
	if (pai.length !== 1) return { ok: false, motivo: "nivel-invalido" };

	const fav = normalizarEstruturaFavoritos(await obterFavoritos());
	const bucketPai = obterBucketPorCaminho(fav, pai);
	if (!bucketPai) return { ok: false, motivo: "pai-inexistente" };
	bucketPai.pastas = bucketPai.pastas || [];

	if (bucketPai.pastas.some(p => p.nome === nomeLimpo)) {
		return { ok: true, criado: false, jaExiste: true };
	}
	if (excedeLimiteFavoritos(fav, 1)) {
		return { ok: false, motivo: "limite" };
	}

	bucketPai.pastas.push({ id: crypto.randomUUID(), nome: nomeLimpo, itens: [], pastas: [] });
	const salvo = await salvarFavoritos(fav);
	if (!salvo?.ok) return { ok: false, motivo: "limite-storage" };
	return { ok: true, criado: true };
}

export async function colorirPasta(path, cor) {
	const caminho = Array.isArray(path) ? path.filter(Boolean) : [];
	if (!caminho.length) return { ok: false, motivo: "caminho-invalido" };
	const fav = normalizarEstruturaFavoritos(await obterFavoritos());
	const pasta = obterBucketPorCaminho(fav, caminho);
	if (!pasta) return { ok: false, motivo: "pasta-inexistente" };

	const corNormalizada = normalizarCor(cor);
	if (corNormalizada) pasta.cor_fundo = corNormalizada;
	else delete pasta.cor_fundo;

	const salvo = await salvarFavoritos(fav);
	if (!salvo?.ok) return { ok: false, motivo: "limite-storage" };
	return { ok: true, alterado: true };
}

export async function colorirItem(meta, cor) {
	if (!meta?.secaoId || !meta?.id) return { ok: false, motivo: "meta-invalida" };
	const fav = normalizarEstruturaFavoritos(await obterFavoritos());
	const corNormalizada = normalizarCor(cor);
	const itemFavorito = localizarItemFavoritoNoArvore(fav, meta.secaoId, meta.id);
	let alterado = false;

	if (itemFavorito) {
		if (corNormalizada) itemFavorito.cor_fundo = corNormalizada;
		else delete itemFavorito.cor_fundo;
		alterado = true;
		alterado = removerColoridoSilencioso(fav, meta.secaoId, meta.id) || alterado;
		const salvo = await salvarFavoritos(fav);
		if (!salvo?.ok) return { ok: false, motivo: "limite-storage" };
		return { ok: true, alterado, alvo: "favorito" };
	}

	const resSilencioso = upsertColoridoSilencioso(fav, meta, corNormalizada);
	if (!resSilencioso.ok) return resSilencioso;
	if (resSilencioso.alterado) {
		const salvo = await salvarFavoritos(fav);
		if (!salvo?.ok) return { ok: false, motivo: "limite-storage" };
	}
	return { ok: true, alterado: !!resSilencioso.alterado, alvo: "silencioso" };
}

export async function obterCorEfetivaItem(secaoId, itemId) {
	const fav = normalizarEstruturaFavoritos(await obterFavoritos());
	return obterCorEfetivaItemEmMemoria(fav, secaoId, itemId);
}
