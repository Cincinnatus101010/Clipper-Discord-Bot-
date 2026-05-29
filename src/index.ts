import {
	ActivityType,
	Client,
	Events,
	GatewayIntentBits,
	type Interaction,
} from "discord.js";
import { config } from "./config";
import { handleDownload } from "./commands/download";
import { SEARCH_MENU_PREFIX, handleSearch, handleSearchSelect } from "./commands/search";
import { errorMessage } from "./utils";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

function guildAllowed(guildId: string | null): boolean {
	return !config.discordGuildId || guildId === config.discordGuildId;
}

client.once(Events.ClientReady, (ready) => {
	console.log(`Logged in as ${ready.user.tag}`);
	ready.user.setPresence({
		activities: [{ name: "/download", type: ActivityType.Listening }],
		status: "online",
	});
});

client.on(Events.InteractionCreate, async (interaction: Interaction) => {
	if (!guildAllowed(interaction.guildId)) {
		if (interaction.isRepliable()) {
			await interaction.reply({ content: "This bot is not enabled here.", ephemeral: true });
		}
		return;
	}

	try {
		if (interaction.isStringSelectMenu() && interaction.customId.startsWith(SEARCH_MENU_PREFIX)) {
			await handleSearchSelect(interaction);
			return;
		}

		if (!interaction.isChatInputCommand()) return;

		switch (interaction.commandName) {
			case "download":
				await handleDownload(interaction);
				break;
			case "search":
				await handleSearch(interaction);
				break;
		}
	} catch (err) {
		console.error(err);
		if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
			await interaction.reply({ content: errorMessage(err), ephemeral: true });
		}
	}
});

await client.login(config.discordToken);
