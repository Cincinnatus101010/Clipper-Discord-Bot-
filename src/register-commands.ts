import { REST, Routes } from "discord.js";
import { config } from "./config";
import { downloadCommand } from "./commands/download";
import { searchCommand } from "./commands/search";

const body = [downloadCommand.toJSON(), searchCommand.toJSON()];
const rest = new REST({ version: "10" }).setToken(config.discordToken);

if (config.discordGuildId) {
	await rest.put(Routes.applicationGuildCommands(config.discordClientId, config.discordGuildId), {
		body,
	});
	console.log(`Registered commands on guild ${config.discordGuildId}`);
} else {
	await rest.put(Routes.applicationCommands(config.discordClientId), { body });
	console.log("Registered global commands");
}
