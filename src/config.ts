import { join } from "node:path";
import { tmpdir } from "node:os";

function required(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing required env var: ${name}`);
	return value;
}

const maxAttachmentMb = Number(process.env.MAX_ATTACHMENT_MB ?? "25");

export const config = {
	discordToken: required("DISCORD_BOT_TOKEN"),
	discordClientId: required("DISCORD_CLIENT_ID"),
	discordGuildId: process.env.DISCORD_GUILD_ID?.trim() || null,
	ytdlpPath: process.env.YTDLP_PATH?.trim() || "yt-dlp",
	cookiesFromBrowser: process.env.YTDLP_COOKIES_FROM_BROWSER?.trim(),
	cookiesFile: process.env.YTDLP_COOKIES_FILE?.trim(),
	dailyLimit: Number(process.env.DAILY_DOWNLOAD_LIMIT ?? "5"),
	maxAttachmentBytes: maxAttachmentMb * 1024 * 1024,
	maxAttachmentMb,
	downloadDir: process.env.DOWNLOAD_DIR?.trim() || join(tmpdir(), "clipper-discord-bot"),
	quotaFile: join(process.cwd(), "data", "quota.json"),
} as const;
