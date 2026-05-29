import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { config } from "./config";

interface QuotaEntry {
	date: string;
	used: number;
}

type QuotaStore = Record<string, QuotaEntry>;

function todayUtc(): string {
	return new Date().toISOString().slice(0, 10);
}

async function loadStore(): Promise<QuotaStore> {
	try {
		return JSON.parse(await readFile(config.quotaFile, "utf8")) as QuotaStore;
	} catch {
		return {};
	}
}

async function saveStore(store: QuotaStore): Promise<void> {
	await mkdir(dirname(config.quotaFile), { recursive: true });
	await writeFile(config.quotaFile, JSON.stringify(store, null, 2));
}

function entryFor(store: QuotaStore, userId: string): QuotaEntry {
	const today = todayUtc();
	const entry = store[userId];
	if (!entry || entry.date !== today) return { date: today, used: 0 };
	return entry;
}

export class QuotaExceededError extends Error {
	constructor(used: number) {
		super(`Daily limit reached (${used}/${config.dailyLimit}). Resets at midnight UTC.`);
	}
}

export async function assertQuota(userId: string): Promise<void> {
	const store = await loadStore();
	const entry = entryFor(store, userId);
	if (entry.used >= config.dailyLimit) throw new QuotaExceededError(entry.used);
}

export async function recordDownload(userId: string): Promise<number> {
	const store = await loadStore();
	const entry = entryFor(store, userId);
	entry.used += 1;
	store[userId] = entry;
	await saveStore(store);
	return config.dailyLimit - entry.used;
}
