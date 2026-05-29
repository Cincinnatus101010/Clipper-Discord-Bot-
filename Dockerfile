FROM oven/bun:1-debian AS base

WORKDIR /app

ARG TARGETARCH

RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		ca-certificates \
		curl \
		ffmpeg \
		procps \
	&& case "${TARGETARCH}" in \
		amd64) YTDLP_BIN=yt-dlp_linux ;; \
		arm64) YTDLP_BIN=yt-dlp_linux_aarch64 ;; \
		*) echo "Unsupported architecture: ${TARGETARCH}" && exit 1 ;; \
	esac \
	&& curl -fsSL "https://github.com/yt-dlp/yt-dlp/releases/latest/download/${YTDLP_BIN}" \
		-o /usr/local/bin/yt-dlp \
	&& chmod a+rx /usr/local/bin/yt-dlp \
	&& rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY tsconfig.json ./
COPY src ./src
COPY docker/entrypoint.sh /app/docker/entrypoint.sh

RUN chmod +x /app/docker/entrypoint.sh \
	&& useradd --system --uid 1001 --gid nogroup botuser \
	&& mkdir -p /app/data /tmp/downloads /app/cookies \
	&& chown -R botuser:nogroup /app /tmp/downloads

USER botuser

ENV NODE_ENV=production \
	DOWNLOAD_DIR=/tmp/downloads

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
	CMD pgrep -f "src/index.ts" > /dev/null || exit 1

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["start"]
