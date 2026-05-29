import { mkdir, readdir, rm, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "./config";

export type DownloadFormat = "video" | "audio";

export interface SearchHit {
	id: string;
	url: string;
	title?: string;
	channel?: string;
	duration?: number | null;
}

export interface DownloadResult {
	dir: string;
	path: string;
	name: string;
	title: string;
	fileSizeBytes: number;
}

function cookieArgs(): string[] {
	if (config.cookiesFile) return ["--cookies", config.cookiesFile];
	if (config.cookiesFromBrowser) return ["--cookies-from-browser", config.cookiesFromBrowser];
	return [];
}

function ytdlpError(stderr: string): string {
	const lines = stderr
		.split("\n")
		.map((l) => l.trim())
		.filter(Boolean);
	return lines.at(-1) ?? "yt-dlp failed.";
}

async function spawnYtdlp(args: string[], captureStdout = false): Promise<string> {
	const proc = Bun.spawn([config.ytdlpPath, ...args], {
		stdout: captureStdout ? "pipe" : "ignore",
		stderr: "pipe",
	});
	const [exitCode, stderr, stdout] = await Promise.all([
		proc.exited,
		new Response(proc.stderr).text(),
		captureStdout ? new Response(proc.stdout!).text() : Promise.resolve(""),
	]);
	if (exitCode !== 0) throw new Error(ytdlpError(stderr));
	return stdout;
}

export async function searchYoutube(query: string, limit = 10): Promise<SearchHit[]> {
	const stdout = await spawnYtdlp(
		["--flat-playlist", "-j", "--no-warnings", ...cookieArgs(), `ytsearch${limit}:${query}`],
		true,
	);

	const hits: SearchHit[] = [];
	for (const line of stdout.trim().split("\n")) {
		if (!line.trim()) continue;
		const row = JSON.parse(line) as {
			id?: string;
			url?: string;
			title?: string;
			channel?: string;
			uploader?: string;
			duration?: number;
		};
		if (!row.id) continue;
		hits.push({
			id: row.id,
			url: row.url ?? `https://www.youtube.com/watch?v=${row.id}`,
			title: row.title,
			channel: row.channel ?? row.uploader,
			duration: row.duration ?? null,
		});
	}
	return hits;
}

function trimSection(start?: string, end?: string): string | null {
	const s = start?.trim();
	const e = end?.trim();
	if (!s && !e) return null;
	return `*${s || "0"}-${e || "inf"}`;
}

async function largestFile(dir: string): Promise<string> {
	const names = (await readdir(dir, { withFileTypes: true }))
		.filter((e) => e.isFile() && !e.name.endsWith(".part"))
		.map((e) => e.name);
	if (names.length === 0) throw new Error("yt-dlp finished but no output file was found.");

	let best = names[0]!;
	let bestSize = 0;
	for (const name of names) {
		const size = (await stat(join(dir, name))).size;
		if (size > bestSize) {
			bestSize = size;
			best = name;
		}
	}
	return join(dir, best);
}

export async function downloadMedia(opts: {
	url: string;
	format: DownloadFormat;
	start?: string;
	end?: string;
}): Promise<DownloadResult> {
	const { url, format, start, end } = opts;
	const dir = join(config.downloadDir, randomUUID());
	await mkdir(dir, { recursive: true });

	const args = [
		"-o",
		join(dir, "%(title).200B.%(ext)s"),
		"--no-playlist",
		"--no-warnings",
		"--restrict-filenames",
		...cookieArgs(),
	];

	if (format === "audio") {
		args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
	} else {
		args.push(
			"-f",
			"bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best",
			"--merge-output-format",
			"mp4",
		);
	}

	const section = trimSection(start, end);
	if (section) args.push("--download-sections", section, "--force-keyframes-at-cuts");

	args.push(url);

	try {
		await spawnYtdlp(args);
	} catch (err) {
		await rm(dir, { recursive: true, force: true }).catch(() => {});
		throw err;
	}

	const path = await largestFile(dir);
	const { size } = await stat(path);
	const name = basename(path);
	const title = name.replace(/\.[^.]+$/, "");

	if (size > config.maxAttachmentBytes) {
		await rm(dir, { recursive: true, force: true }).catch(() => {});
		throw new Error(
			`File is ${(size / (1024 * 1024)).toFixed(1)} MB — Discord limit is ${config.maxAttachmentMb} MB. Try trim times or audio format.`,
		);
	}

	return { dir, path, name, title, fileSizeBytes: size };
}

export async function cleanupDownload(result: DownloadResult): Promise<void> {
	await rm(result.dir, { recursive: true, force: true }).catch(() => {});
}
