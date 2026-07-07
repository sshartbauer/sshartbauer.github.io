# Setup: turning on the live feed

The page works right now with placeholder cards. These are the steps to make it pull real headlines automatically once a day. None of it requires touching the design.

## What's already built

- `index.html`: the page itself. Fetches `data/articles.json` on load and renders whatever's there. Falls back to the placeholder cards already baked into the HTML if the file is missing or empty.
- `data/articles.json`: currently empty. This is what the Action overwrites every day.
- `scripts/fetch_feed.py`: pulls headlines from ISW and Kyiv Independent RSS (no signup needed), optionally adds a wire-service query via GNews if you give it a key.
- `requirements.txt`: the two Python packages the script needs.
- `github-workflow-to-move/update-feed.yml`: the daily automation. Needs to move to a specific spot in your repo (see step 1).

## Steps you need to do

### 1. Move the workflow file into place

GitHub only looks for automation files in one exact spot: `.github/workflows/` at the root of the repo. I can't write there directly since my folder access is scoped to this project folder.

Move `github-workflow-to-move/update-feed.yml` to `.github/workflows/update-feed.yml` at your repo root (drag it in Explorer, or `git mv` if you're comfortable with the command line). Once it's moved, you can delete the now-empty `github-workflow-to-move` folder.

Before moving it, open the file and check the three paths inside (`uarfwarupdates/UA/RF War Updates/...`). They're my best guess based on your local folder structure. If this project lives somewhere else in the actual repo, update all three to match.

### 2. Turn on write permission for the Action

The Action needs permission to commit the updated `articles.json` back to the repo. By default, GitHub repos only grant Actions read access.

In your repo on GitHub: **Settings → Actions → General → Workflow permissions → select "Read and write permissions" → Save.**

### 3. Push everything

Commit and push `index.html`, `data/`, `scripts/`, `requirements.txt`, and the relocated `.github/workflows/update-feed.yml`.

### 4. Test it manually

On GitHub: **Actions tab → "Update war updates feed" → Run workflow.** This runs it immediately instead of waiting for the daily schedule, so you can confirm it works. Check the run's logs. If ISW or Kyiv Independent's feed URL has changed since I wrote this, you'll see a warning in the logs telling you which one and where to look.

Once it succeeds, `data/articles.json` will have real headlines in it, and reloading the page will show them instead of the placeholder cards.

### 5. Optional: add AP/Reuters-style wire coverage

This one's optional and has a caveat, read it before deciding.

GNews.io has a free tier (100 requests/day) that can pull a generic wire-service query. I didn't wire this to specifically filter to AP or Reuters because their free tier doesn't reliably support source filtering, so it'll show a mix of outlets covering Ukraine/Russia rather than only AP and Reuters. Also worth knowing: GNews's free tier terms describe it as for development/testing, not production use, so running it on a small personal portfolio site is probably fine in spirit but isn't strictly what the free tier is licensed for. NewsAPI.org's free tier has a similar restriction plus a 24-hour publish delay. If you'd rather skip this gray area entirely, just don't add the key. The page works fine on ISW + Kyiv Independent alone, that's what the "Wire Service" card being absent means.

If you do want it:
1. Sign up for a free key yourself at gnews.io (I can't create accounts on your behalf).
2. In your repo: **Settings → Secrets and variables → Actions → New repository secret**, name it `GNEWS_API_KEY`, paste the key.
3. Re-run the workflow. The wire-service card will start appearing.

### 6. Link the page from your site

I only have access to this project's folder, not your `/tools/` page, so I can't add the link myself. Add a card there pointing to wherever this ends up published (e.g. `https://sshartbauer.github.io/rf-war-updates/` or whatever path you use), matching the same card format as your other tools.

## Adjusting things later

- **Cron schedule**: change the `cron:` line in the workflow. It's currently `0 12 * * *` (daily, 12:00 UTC).
- **How many articles per source**: change `max_items` in `scripts/fetch_feed.py`.
- **Excerpt length**: change `EXCERPT_LENGTH` in the same file.
- **If a feed breaks**: RSS URLs occasionally change. The Action logs will show a warning naming the source; check the site for its current feed link and update the URL in `RSS_SOURCES` in `fetch_feed.py`.
