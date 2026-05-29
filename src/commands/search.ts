import {
	ActionRowBuilder,
	ChatInputCommandInteraction,
	SlashCommandBuilder,
	StringSelectMenuBuilder,
	type StringSelectMenuInteraction,
} from "discord.js";
import { deliverDownload, deliverDownloadFollowUp } from "../download";
import { errorMessage, formatDuration, truncate } from "../utils";
import { searchYoutube, type DownloadFormat, type SearchHit } from "../ytdlp";

export const SEARCH_MENU_PREFIX = "search:";

export const searchCommand = new SlashCommandBuilder()
	.setName("search")
	.setDescription("Search YouTube and download a result")
	.addStringOption((opt) =>
		opt.setName("query").setDescription("Search term").setRequired(true),
	)
	.addIntegerOption((opt) =>
		opt
			.setName("pick")
			.setDescription("Download result #1–10 without the menu")
			.setMinValue(1)
			.setMaxValue(10),
	)
	.addStringOption((opt) =>
		opt
			.setName("format")
			.setDescription("Output format")
			.addChoices(
				{ name: "Video (MP4)", value: "video" },
				{ name: "Audio (MP3)", value: "audio" },
			),
	);

function resultsText(results: SearchHit[], query: string, format: DownloadFormat): string {
	const lines = results.map((hit, i) => {
		const title = truncate(hit.title ?? hit.id, 72);
		const meta = hit.channel ? ` · ${truncate(hit.channel, 28)}` : "";
		return `**${i + 1}.** ${title}${meta} \`${formatDuration(hit.duration)}\``;
	});
	const hint =
		format === "audio"
			? "Pick below for **MP3**, or `/search query:… pick:3 format:audio`."
			: "Pick below, or `/search query:… pick:3`.";

	return [`Results for **${query}**:`, "", ...lines, "", hint].join("\n");
}

function selectRow(results: SearchHit[], format: DownloadFormat) {
	const menu = new StringSelectMenuBuilder()
		.setCustomId(`${SEARCH_MENU_PREFIX}${format}`)
		.setPlaceholder("Choose a video…")
		.addOptions(
			results.slice(0, 10).map((hit, i) => ({
				label: truncate(hit.title ?? hit.id, 100),
				description: truncate(
					[hit.channel, formatDuration(hit.duration)].filter(Boolean).join(" · "),
					100,
				),
				value: hit.url.slice(0, 100),
				default: i === 0,
			})),
		);
	return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export async function handleSearch(interaction: ChatInputCommandInteraction): Promise<void> {
	const query = interaction.options.getString("query", true).trim();
	const pick = interaction.options.getInteger("pick");
	const format = (interaction.options.getString("format") ?? "video") as DownloadFormat;

	await interaction.deferReply({ ephemeral: true });

	try {
		const results = await searchYoutube(query);
		if (results.length === 0) {
			await interaction.editReply(`No results for **${query}**.`);
			return;
		}

		if (pick != null) {
			const hit = results[pick - 1];
			if (!hit) {
				await interaction.editReply(`Only ${results.length} result(s) — pick 1–${results.length}.`);
				return;
			}
			await deliverDownload(interaction, {
				userId: interaction.user.id,
				url: hit.url,
				format,
				label: hit.title ?? "YouTube",
			});
			return;
		}

		await interaction.editReply({
			content: resultsText(results, query, format),
			components: [selectRow(results, format)],
		});
	} catch (err) {
		await interaction.editReply(`Search failed: ${errorMessage(err)}`);
	}
}

export async function handleSearchSelect(interaction: StringSelectMenuInteraction): Promise<void> {
	const format = interaction.customId.slice(SEARCH_MENU_PREFIX.length) as DownloadFormat;
	const url = interaction.values[0];
	if (!url) {
		await interaction.reply({ content: "Nothing selected.", ephemeral: true });
		return;
	}

	await interaction.deferUpdate();
	await deliverDownloadFollowUp(interaction, {
		userId: interaction.user.id,
		url,
		format: format === "audio" ? "audio" : "video",
		label: "YouTube",
	});
}
