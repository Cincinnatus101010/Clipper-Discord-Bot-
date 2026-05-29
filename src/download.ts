import {
	AttachmentBuilder,
	type ChatInputCommandInteraction,
	type MessageComponentInteraction,
} from "discord.js";
import { QuotaExceededError, assertQuota, recordDownload } from "./quota";
import { cleanupDownload, downloadMedia, type DownloadFormat } from "./ytdlp";
import { errorMessage } from "./utils";

function successMessage(
	title: string,
	bytes: number,
	format: DownloadFormat,
	remaining: number,
): string {
	const kind = format === "audio" ? "MP3" : "MP4";
	return [
		`**${title}** · ${kind} · ${(bytes / (1024 * 1024)).toFixed(1)} MB`,
		`${remaining} download${remaining === 1 ? "" : "s"} left today`,
	].join("\n");
}

export async function deliverDownload(
	interaction: ChatInputCommandInteraction,
	opts: {
		userId: string;
		url: string;
		format: DownloadFormat;
		start?: string;
		end?: string;
		label: string;
	},
): Promise<void> {
	const { userId, url, format, start, end, label } = opts;

	try {
		await assertQuota(userId);
		if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
		await interaction.editReply(`Downloading **${label}**…`);

		const result = await downloadMedia({ url, format, start, end });
		const remaining = await recordDownload(userId);

		await interaction.editReply({
			content: successMessage(result.title, result.fileSizeBytes, format, remaining),
			files: [new AttachmentBuilder(result.path, { name: result.name })],
		});
		await cleanupDownload(result);
	} catch (err) {
		const text =
			err instanceof QuotaExceededError
				? err.message
				: `Download failed: ${errorMessage(err)}`;
		await interaction.editReply({ content: text });
	}
}

export async function deliverDownloadFollowUp(
	interaction: MessageComponentInteraction,
	opts: {
		userId: string;
		url: string;
		format: DownloadFormat;
		label: string;
	},
): Promise<void> {
	const { userId, url, format, label } = opts;

	try {
		await assertQuota(userId);
		const msg = await interaction.followUp({
			content: `Downloading **${label}**…`,
			ephemeral: true,
			fetchReply: true,
		});

		const result = await downloadMedia({ url, format });
		const remaining = await recordDownload(userId);

		await msg.edit({
			content: successMessage(result.title, result.fileSizeBytes, format, remaining),
			files: [new AttachmentBuilder(result.path, { name: result.name })],
		});
		await cleanupDownload(result);
	} catch (err) {
		const text =
			err instanceof QuotaExceededError
				? err.message
				: `Download failed: ${errorMessage(err)}`;
		await interaction.followUp({ content: text, ephemeral: true });
	}
}
