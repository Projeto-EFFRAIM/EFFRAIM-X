const CHUNK_SIZE = 3000;
const MAX_CHUNKS = 3;

function keyChunk(baseKey, idx) {
	return `${baseKey}__${idx}`;
}

function legacyMetaKey(baseKey) {
	return `${baseKey}__meta`;
}

function legacyChunkKey(baseKey, idx) {
	return `${baseKey}__chunk_${idx}`;
}

async function syncGet(keys) {
	return new Promise((resolve) => chrome.storage.sync.get(keys, resolve));
}

async function syncSet(obj) {
	return new Promise((resolve) => chrome.storage.sync.set(obj, resolve));
}

async function syncRemove(keys) {
	return new Promise((resolve) => chrome.storage.sync.remove(keys, resolve));
}

function obterSlotsFixos(baseKey) {
	return [keyChunk(baseKey, 0), keyChunk(baseKey, 1), keyChunk(baseKey, 2)];
}

function serializarEmSlots(raw) {
	const slots = ["", "", ""];
	let i = 0;
	for (; i < MAX_CHUNKS; i += 1) {
		const ini = i * CHUNK_SIZE;
		const fim = ini + CHUNK_SIZE;
		slots[i] = raw.slice(ini, fim);
	}
	return slots;
}

function excedeLimite(raw) {
	return raw.length > (CHUNK_SIZE * MAX_CHUNKS);
}

async function lerFormatoLegado(baseKey) {
	const metaKey = legacyMetaKey(baseKey);
	const metaObj = await syncGet(metaKey);
	const meta = metaObj?.[metaKey];
	if (!meta || !Number.isInteger(meta.chunks) || meta.chunks <= 0) return null;

	const keys = [];
	for (let i = 0; i < meta.chunks; i += 1) keys.push(legacyChunkKey(baseKey, i));
	const chunksObj = await syncGet(keys);
	let raw = "";
	for (let i = 0; i < meta.chunks; i += 1) raw += String(chunksObj[legacyChunkKey(baseKey, i)] || "");
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

async function removerFormatoLegado(baseKey) {
	const metaKey = legacyMetaKey(baseKey);
	const metaObj = await syncGet(metaKey);
	const meta = metaObj?.[metaKey];
	const count = Number.isInteger(meta?.chunks) ? meta.chunks : 0;
	const keys = [metaKey];
	for (let i = 0; i < count; i += 1) keys.push(legacyChunkKey(baseKey, i));
	await syncRemove(keys);
}

export async function writeChunkedObject(baseKey, data) {
	const raw = JSON.stringify(data ?? {});
	if (excedeLimite(raw)) {
		const err = new Error("sync_fixed_chunks_limit_exceeded");
		err.code = "sync_fixed_chunks_limit_exceeded";
		err.details = {
			baseKey,
			size: raw.length,
			max: CHUNK_SIZE * MAX_CHUNKS,
			maxChunks: MAX_CHUNKS
		};
		throw err;
	}

	const slots = serializarEmSlots(raw);
	const keys = obterSlotsFixos(baseKey);
	const payload = {
		[keys[0]]: slots[0],
		[keys[1]]: slots[1],
		[keys[2]]: slots[2]
	};
	await syncSet(payload);
}

export async function readChunkedObject(baseKey) {
	const keys = obterSlotsFixos(baseKey);
	const obj = await syncGet(keys);
	const raw = `${obj[keys[0]] || ""}${obj[keys[1]] || ""}${obj[keys[2]] || ""}`;
	if (raw) {
		try {
			return JSON.parse(raw);
		} catch {
			return null;
		}
	}

	// fallback legado: lê formato antigo, tenta migrar para 3 slots e limpa legado.
	const legado = await lerFormatoLegado(baseKey);
	if (!legado) return null;
	try {
		await writeChunkedObject(baseKey, legado);
		await removerFormatoLegado(baseKey);
	} catch (e) {
		console.warn("[EFFRAIM] Nao foi possivel migrar storage legado para 3 chaves fixas.", e);
	}
	return legado;
}

export async function removeChunkedObject(baseKey) {
	const keys = obterSlotsFixos(baseKey);
	await syncRemove(keys);
	await removerFormatoLegado(baseKey);
}

export function obterLimiteChunkStorage() {
	return {
		chunkSize: CHUNK_SIZE,
		maxChunks: MAX_CHUNKS,
		maxBytes: CHUNK_SIZE * MAX_CHUNKS
	};
}
