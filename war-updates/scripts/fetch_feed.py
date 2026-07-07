#!/usr/bin/env python3
"""
Fetches the latest Ukraine-Russia war coverage and writes data/articles.json
for the static page (index.html) to render.

Required sources (no signup needed):
  - ISW (Institute for the Study of War) via their Blogger-hosted RSS mirror
  - Kyiv Independent via their news RSS feed

Optional source:
  - A wire-service query via GNews.io, only run if the GNEWS_API_KEY
    environment variable is set. If it's missing, this source is skipped
    entirely and the script still succeeds using RSS alone.

Run with: python scripts/fetch_feed.py
Dependencies: see requirements.txt (feedparser, requests)
"""

import json
import os
import re
import sys
from datetime import datetime, timezone
from html import unescape

import feedparser
import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_PATH = os.path.join(SCRIPT_DIR, "..", "data", "articles.json")

EXCERPT_LENGTH = 160

# Both of these are known-working as of when this script was written.
# RSS feed URLs do move around occasionally. If one of these starts
# returning zero items, check the source's current feed link and
# update it here.
RSS_SOURCES = [
    {"name": "ISW", "url": "https://iswresearch.org/feeds/posts/default", "max_items": 3},
    {"name": "Kyiv Independent", "url": "https://kyivindependent.com/feed/news/", "max_items": 5},
]

GNEWS_MAX_ITEMS = 5


def clean_excerpt(raw_html):
    """Strip tags/entities from an RSS summary and trim to a card-friendly length."""
    if not raw_html:
        return ""
    text = re.sub("<[^<]+?>", " ", raw_html)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > EXCERPT_LENGTH:
        text = text[:EXCERPT_LENGTH].rsplit(" ", 1)[0] + "…"
    return text


def entry_date(entry):
    for key in ("published_parsed", "updated_parsed"):
        value = entry.get(key)
        if value:
            try:
                return datetime(*value[:6], tzinfo=timezone.utc).strftime("%Y-%m-%d")
            except (TypeError, ValueError):
                pass
    published = entry.get("published", entry.get("updated", ""))
    return published[:10] if published else ""


def fetch_rss(source):
    articles = []
    try:
        parsed = feedparser.parse(source["url"])
    except Exception as e:
        print(f"[warn] failed to fetch {source['name']}: {e}", file=sys.stderr)
        return articles

    if not parsed.entries:
        reason = getattr(parsed, "bozo_exception", "no entries returned")
        print(f"[warn] {source['name']} feed returned nothing ({reason}). "
              f"The feed URL may have changed, check {source['url']} in a browser.",
              file=sys.stderr)
        return articles

    for entry in parsed.entries[: source["max_items"]]:
        summary = entry.get("summary", entry.get("description", ""))
        articles.append({
            "source": source["name"],
            "headline": unescape(entry.get("title", "Untitled")).strip(),
            "url": entry.get("link", "#"),
            "excerpt": clean_excerpt(summary),
            "date": entry_date(entry),
        })
    return articles


def fetch_gnews():
    api_key = os.environ.get("GNEWS_API_KEY")
    if not api_key:
        print("[info] GNEWS_API_KEY not set, skipping the wire-service query. "
              "This is fine, it just means the Wire Service card stays out of the feed.")
        return []

    url = "https://gnews.io/api/v4/search"
    params = {
        "q": "Ukraine Russia war",
        "lang": "en",
        "sortby": "publishedAt",
        "max": GNEWS_MAX_ITEMS,
        "apikey": api_key,
    }
    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"[warn] GNews request failed, skipping wire-service query: {e}", file=sys.stderr)
        return []

    articles = []
    for item in data.get("articles", [])[:GNEWS_MAX_ITEMS]:
        published = item.get("publishedAt", "")
        articles.append({
            "source": item.get("source", {}).get("name", "Wire Service"),
            "headline": (item.get("title") or "Untitled").strip(),
            "url": item.get("url", "#"),
            "excerpt": clean_excerpt(item.get("description", "")),
            "date": published[:10] if published else "",
        })
    return articles


def main():
    all_articles = []
    for source in RSS_SOURCES:
        all_articles.extend(fetch_rss(source))
    all_articles.extend(fetch_gnews())

    # Newest first where dates are comparable strings (YYYY-MM-DD).
    all_articles.sort(key=lambda a: a.get("date", ""), reverse=True)

    output = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "articles": all_articles,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(all_articles)} articles to {os.path.abspath(OUTPUT_PATH)}")

    if not all_articles:
        # Not a hard failure (the page falls back to placeholder content
        # gracefully) but worth a visible signal in the Action logs.
        print("[warn] No articles were fetched from any source this run.", file=sys.stderr)


if __name__ == "__main__":
    main()
