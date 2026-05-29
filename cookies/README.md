# Session cookies (optional)

Some sites (TikTok, Instagram) need logged-in cookies. For Docker, export a Netscape cookie file and save it here as **`ytdlp.txt`**, then set in `.env`:

```env
YTDLP_COOKIES_FILE=/app/cookies/ytdlp.txt
```

This file is gitignored — never commit it.

**Export on your Mac:**

```bash
yt-dlp --cookies-from-browser chrome --cookies cookies/ytdlp.txt "https://www.google.com/robots.txt"
```

(Quit Chrome first.)
