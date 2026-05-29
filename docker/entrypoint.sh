#!/bin/sh
set -e

case "${1:-start}" in
register)
	exec bun run src/register-commands.ts
	;;
start)
	if [ "${REGISTER_COMMANDS_ON_START:-true}" = "true" ]; then
		bun run src/register-commands.ts
	fi
	exec bun run src/index.ts
	;;
*)
	exec "$@"
	;;
esac
