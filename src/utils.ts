export function truncate(text: string, max: number): string {
	return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function formatDuration(seconds: number | null | undefined): string {
	if (seconds == null || seconds <= 0) return "??:??";
	const total = Math.floor(seconds);
	const m = Math.floor(total / 60);
	const s = total % 60;
	return `${m}:${String(s).padStart(2, "0")}`;
}

export function platformLabel(url: string): string {
	const u = url.toLowerCase();
	if (u.includes("tiktok.com") || u.includes("vm.tiktok.com")) return "TikTok";
	if (u.includes("instagram.com") || u.includes("instagr.am")) return "Instagram";
	if (u.includes("twitch.tv") || u.includes("clips.twitch.tv")) return "Twitch";
	if (u.includes("youtube.com") || u.includes("youtu.be")) return "YouTube";
	return "media";
}

export function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : "Something went wrong.";
}
