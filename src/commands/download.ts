import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { deliverDownload } from "../download";
import { platformLabel } from "../utils";
import type { DownloadFormat } from "../ytdlp";

export const downloadCommand = new SlashCommandBuilder()
	.setName("download")
	.setDescription("Download a video or audio clip from a URL")
	.addStringOption((opt) =>
		opt.setName("url").setDescription("YouTube, Twitch, TikTok, or Instagram link").setRequired(true),
	)
	.addStringOption((opt) =>
		opt
			.setName("format")
			.setDescription("Output format")
			.addChoices(
				{ name: "Video (MP4)", value: "video" },
				{ name: "Audio (MP3)", value: "audio" },
			),
	)
	.addStringOption((opt) =>
		opt.setName("start").setDescription("Trim start — seconds or MM:SS").setRequired(false),
	)
	.addStringOption((opt) =>
		opt.setName("end").setDescription("Trim end — seconds or MM:SS").setRequired(false),
	);

export async function handleDownload(interaction: ChatInputCommandInteraction): Promise<void> {
	const url = interaction.options.getString("url", true).trim();
	const format = (interaction.options.getString("format") ?? "video") as DownloadFormat;
	const start = interaction.options.getString("start") ?? undefined;
	const end = interaction.options.getString("end") ?? undefined;

	await deliverDownload(interaction, {
		userId: interaction.user.id,
		url,
		format,
		start,
		end,
		label: platformLabel(url),
	});
}
