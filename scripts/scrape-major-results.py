#!/usr/bin/env python3
"""
Scrape each golfer's Wikipedia page, find their last major win (or best
major finish if they have no wins), look up the static venue, and write
src/data/majorResults.ts.

Run once from the repo root:
  python scripts/scrape-major-results.py

No pip packages required — uses stdlib only.
Strategy: Parse the Major Championship Results table (rows=majors, cols=years)
          to find "Won" entries for last win, or best numeric finish.
"""

from __future__ import annotations
import json
import re
import time
import urllib.request
import urllib.parse
from html.parser import HTMLParser

# ---------------------------------------------------------------------------
# Golfer list — wikiTitle is the Wikipedia page title
# ---------------------------------------------------------------------------
GOLFERS = [
    "Tiger Woods", "Rory McIlroy", "Phil Mickelson", "Jordan Spieth",
    "Henrik Stenson", "Matt Kuchar", "Dustin Johnson", "Brooks Koepka",
    "Lee Westwood", "Rickie Fowler", "Adam Scott (golfer)", "Sergio García",
    "Justin Rose", "Xander Schauffele", "Collin Morikawa", "Viktor Hovland",
    "Tommy Fleetwood", "Louis Oosthuizen", "Hideki Matsuyama",
    "Pádraig Harrington", "Ernie Els", "Vijay Singh", "Justin Thomas",
    "Jon Rahm", "Bryson DeChambeau", "Jason Day", "Francesco Molinari",
    "Shane Lowry", "Wyndham Clark", "Brian Harman", "Keegan Bradley",
    "Webb Simpson", "Jimmy Walker (golfer)", "Jason Dufner", "Zach Johnson",
    "Danny Willett", "Bubba Watson", "Charl Schwartzel", "Trevor Immelman",
    "Geoff Ogilvy", "Paul Lawrie", "Stewart Cink", "Graeme McDowell",
    "Martin Kaymer", "Lucas Glover", "Y. E. Yang", "Ángel Cabrera",
    "Cameron Smith (golfer)", "Gary Woodland", "Patrick Reed", "Gary Player",
    "Arnold Palmer", "Jack Nicklaus", "Colin Montgomerie", "Steve Stricker",
    "Luke Donald", "Ian Poulter", "Paul Casey", "Tony Finau",
    "Patrick Cantlay", "Im Sung-jae", "Will Zalatoris", "John Daly (golfer)",
    "David Duval", "Darren Clarke", "Justin Leonard", "David Toms",
    "Mark O'Meara", "Ben Curtis (golfer)", "Todd Hamilton", "Michael Campbell",
    "Rich Beem", "Shaun Micheel", "Corey Pavin", "Tom Lehman",
    "Mark Calcavecchia", "José María Olazábal", "Bernhard Langer",
    "Fred Couples", "Nick Price", "Greg Norman", "Nick Faldo",
    "Seve Ballesteros", "Lee Trevino", "Tom Watson", "Johnny Miller",
    "Scottie Scheffler", "Max Homa", "Tyrrell Hatton", "Ludvig Åberg",
    "Matt Fitzpatrick", "Thomas Pieters", "Sam Burns", "Sungjae Im",
    "Billy Horschel", "Kurt Kitayama", "Sepp Straka", "Nicolai Højgaard",
    "Ryan Fox", "Min Woo Lee", "Rasmus Højgaard", "Tom Kim",
    "Akshay Bhatia", "Maverick McNealy",
]

# ---------------------------------------------------------------------------
# Static venue lookup
# ---------------------------------------------------------------------------
AUGUSTA = {"course": "Augusta National Golf Club", "location": "Augusta, Georgia"}

US_OPEN = {
    1990: {"course": "Medinah Country Club (No. 3)", "location": "Medinah, Illinois"},
    1991: {"course": "Hazeltine National Golf Club", "location": "Chaska, Minnesota"},
    1992: {"course": "Pebble Beach Golf Links", "location": "Pebble Beach, California"},
    1993: {"course": "Baltusrol Golf Club (Lower)", "location": "Springfield, New Jersey"},
    1994: {"course": "Oakmont Country Club", "location": "Oakmont, Pennsylvania"},
    1995: {"course": "Shinnecock Hills Golf Club", "location": "Southampton, New York"},
    1996: {"course": "Oakland Hills Country Club (South)", "location": "Bloomfield Hills, Michigan"},
    1997: {"course": "Congressional Country Club (Blue)", "location": "Bethesda, Maryland"},
    1998: {"course": "The Olympic Club (Lake)", "location": "San Francisco, California"},
    1999: {"course": "Pinehurst Resort (No. 2)", "location": "Village of Pinehurst, North Carolina"},
    2000: {"course": "Pebble Beach Golf Links", "location": "Pebble Beach, California"},
    2001: {"course": "Southern Hills Country Club", "location": "Tulsa, Oklahoma"},
    2002: {"course": "Bethpage Black", "location": "Farmingdale, New York"},
    2003: {"course": "Olympia Fields Country Club (North)", "location": "Olympia Fields, Illinois"},
    2004: {"course": "Shinnecock Hills Golf Club", "location": "Southampton, New York"},
    2005: {"course": "Pinehurst Resort (No. 2)", "location": "Village of Pinehurst, North Carolina"},
    2006: {"course": "Winged Foot Golf Club (West)", "location": "Mamaroneck, New York"},
    2007: {"course": "Oakmont Country Club", "location": "Oakmont, Pennsylvania"},
    2008: {"course": "Torrey Pines Golf Course (South)", "location": "San Diego, California"},
    2009: {"course": "Bethpage Black", "location": "Farmingdale, New York"},
    2010: {"course": "Pebble Beach Golf Links", "location": "Pebble Beach, California"},
    2011: {"course": "Congressional Country Club (Blue)", "location": "Bethesda, Maryland"},
    2012: {"course": "The Olympic Club (Lake)", "location": "San Francisco, California"},
    2013: {"course": "Merion Golf Club (East)", "location": "Ardmore, Pennsylvania"},
    2014: {"course": "Pinehurst Resort (No. 2)", "location": "Village of Pinehurst, North Carolina"},
    2015: {"course": "Chambers Bay", "location": "University Place, Washington"},
    2016: {"course": "Oakmont Country Club", "location": "Oakmont, Pennsylvania"},
    2017: {"course": "Erin Hills", "location": "Erin, Wisconsin"},
    2018: {"course": "Shinnecock Hills Golf Club", "location": "Southampton, New York"},
    2019: {"course": "Pebble Beach Golf Links", "location": "Pebble Beach, California"},
    2020: {"course": "Winged Foot Golf Club (West)", "location": "Mamaroneck, New York"},
    2021: {"course": "Torrey Pines Golf Course (South)", "location": "San Diego, California"},
    2022: {"course": "The Country Club", "location": "Brookline, Massachusetts"},
    2023: {"course": "Los Angeles Country Club (North)", "location": "Los Angeles, California"},
    2024: {"course": "Pinehurst Resort (No. 2)", "location": "Village of Pinehurst, North Carolina"},
    2025: {"course": "Oakmont Country Club", "location": "Oakmont, Pennsylvania"},
}

THE_OPEN = {
    1990: {"course": "St Andrews Links (Old Course)", "location": "St Andrews, Scotland"},
    1991: {"course": "Royal Birkdale Golf Club", "location": "Southport, England"},
    1992: {"course": "Muirfield", "location": "Gullane, Scotland"},
    1993: {"course": "Royal St George's Golf Club", "location": "Sandwich, England"},
    1994: {"course": "Turnberry Golf Club (Ailsa)", "location": "Turnberry, Scotland"},
    1995: {"course": "St Andrews Links (Old Course)", "location": "St Andrews, Scotland"},
    1996: {"course": "Royal Lytham & St Annes Golf Club", "location": "Lytham St Annes, England"},
    1997: {"course": "Royal Troon Golf Club (Old Course)", "location": "Troon, Scotland"},
    1998: {"course": "Royal Birkdale Golf Club", "location": "Southport, England"},
    1999: {"course": "Carnoustie Golf Links", "location": "Carnoustie, Scotland"},
    2000: {"course": "St Andrews Links (Old Course)", "location": "St Andrews, Scotland"},
    2001: {"course": "Royal Lytham & St Annes Golf Club", "location": "Lytham St Annes, England"},
    2002: {"course": "Muirfield", "location": "Gullane, Scotland"},
    2003: {"course": "Royal St George's Golf Club", "location": "Sandwich, England"},
    2004: {"course": "Royal Troon Golf Club (Old Course)", "location": "Troon, Scotland"},
    2005: {"course": "St Andrews Links (Old Course)", "location": "St Andrews, Scotland"},
    2006: {"course": "Royal Liverpool Golf Club (Hoylake)", "location": "Hoylake, England"},
    2007: {"course": "Carnoustie Golf Links", "location": "Carnoustie, Scotland"},
    2008: {"course": "Royal Birkdale Golf Club", "location": "Southport, England"},
    2009: {"course": "Turnberry Golf Club (Ailsa)", "location": "Turnberry, Scotland"},
    2010: {"course": "St Andrews Links (Old Course)", "location": "St Andrews, Scotland"},
    2011: {"course": "Royal St George's Golf Club", "location": "Sandwich, England"},
    2012: {"course": "Royal Lytham & St Annes Golf Club", "location": "Lytham St Annes, England"},
    2013: {"course": "Muirfield", "location": "Gullane, Scotland"},
    2014: {"course": "Royal Liverpool Golf Club (Hoylake)", "location": "Hoylake, England"},
    2015: {"course": "St Andrews Links (Old Course)", "location": "St Andrews, Scotland"},
    2016: {"course": "Royal Troon Golf Club (Old Course)", "location": "Troon, Scotland"},
    2017: {"course": "Royal Birkdale Golf Club", "location": "Southport, England"},
    2018: {"course": "Carnoustie Golf Links", "location": "Carnoustie, Scotland"},
    2019: {"course": "Royal Portrush Golf Club (Dunluce Links)", "location": "Portrush, Northern Ireland"},
    2021: {"course": "Royal St George's Golf Club", "location": "Sandwich, England"},
    2022: {"course": "St Andrews Links (Old Course)", "location": "St Andrews, Scotland"},
    2023: {"course": "Royal Liverpool Golf Club (Hoylake)", "location": "Hoylake, England"},
    2024: {"course": "Royal Troon Golf Club (Old Course)", "location": "Troon, Scotland"},
    2025: {"course": "Royal Portrush Golf Club (Dunluce Links)", "location": "Portrush, Northern Ireland"},
}

PGA_CHAMP = {
    1990: {"course": "Shoal Creek", "location": "Shoal Creek, Alabama"},
    1991: {"course": "Crooked Stick Golf Club", "location": "Carmel, Indiana"},
    1992: {"course": "Bellerive Country Club", "location": "Town and Country, Missouri"},
    1993: {"course": "Inverness Club", "location": "Toledo, Ohio"},
    1994: {"course": "Southern Hills Country Club", "location": "Tulsa, Oklahoma"},
    1995: {"course": "Riviera Country Club", "location": "Pacific Palisades, California"},
    1996: {"course": "Valhalla Golf Club", "location": "Louisville, Kentucky"},
    1997: {"course": "Winged Foot Golf Club (West)", "location": "Mamaroneck, New York"},
    1998: {"course": "Sahalee Country Club", "location": "Sammamish, Washington"},
    1999: {"course": "Medinah Country Club (No. 3)", "location": "Medinah, Illinois"},
    2000: {"course": "Valhalla Golf Club", "location": "Louisville, Kentucky"},
    2001: {"course": "Atlanta Athletic Club (Highlands)", "location": "Johns Creek, Georgia"},
    2002: {"course": "Hazeltine National Golf Club", "location": "Chaska, Minnesota"},
    2003: {"course": "Oak Hill Country Club (East)", "location": "Pittsford, New York"},
    2004: {"course": "Whistling Straits (Straits)", "location": "Haven, Wisconsin"},
    2005: {"course": "Baltusrol Golf Club (Lower)", "location": "Springfield, New Jersey"},
    2006: {"course": "Medinah Country Club (No. 3)", "location": "Medinah, Illinois"},
    2007: {"course": "Southern Hills Country Club", "location": "Tulsa, Oklahoma"},
    2008: {"course": "Oakland Hills Country Club (South)", "location": "Bloomfield Hills, Michigan"},
    2009: {"course": "Hazeltine National Golf Club", "location": "Chaska, Minnesota"},
    2010: {"course": "Whistling Straits (Straits)", "location": "Haven, Wisconsin"},
    2011: {"course": "Atlanta Athletic Club (Highlands)", "location": "Johns Creek, Georgia"},
    2012: {"course": "Kiawah Island Golf Resort (Ocean)", "location": "Kiawah Island, South Carolina"},
    2013: {"course": "Oak Hill Country Club (East)", "location": "Pittsford, New York"},
    2014: {"course": "Valhalla Golf Club", "location": "Louisville, Kentucky"},
    2015: {"course": "Whistling Straits (Straits)", "location": "Haven, Wisconsin"},
    2016: {"course": "Baltusrol Golf Club (Lower)", "location": "Springfield, New Jersey"},
    2017: {"course": "Quail Hollow Club", "location": "Charlotte, North Carolina"},
    2018: {"course": "Bellerive Country Club", "location": "Town and Country, Missouri"},
    2019: {"course": "Bethpage Black", "location": "Farmingdale, New York"},
    2020: {"course": "TPC Harding Park", "location": "San Francisco, California"},
    2021: {"course": "Kiawah Island Golf Resort (Ocean)", "location": "Kiawah Island, South Carolina"},
    2022: {"course": "Southern Hills Country Club", "location": "Tulsa, Oklahoma"},
    2023: {"course": "Oak Hill Country Club (East)", "location": "Pittsford, New York"},
    2024: {"course": "Valhalla Golf Club", "location": "Louisville, Kentucky"},
    2025: {"course": "Quail Hollow Club", "location": "Charlotte, North Carolina"},
}

MAJOR_DEFS = [
    (re.compile(r"masters", re.I),                       "The Masters",           AUGUSTA),
    (re.compile(r"u\.?s\.?\s*open", re.I),               "U.S. Open",             US_OPEN),
    (re.compile(r"open championship|british open", re.I),"The Open Championship", THE_OPEN),
    (re.compile(r"pga championship", re.I),               "PGA Championship",      PGA_CHAMP),
]

def classify_major(text: str) -> tuple[str, dict] | None:
    for pat, label, venues in MAJOR_DEFS:
        if pat.search(text):
            return label, venues
    return None

def lookup_venue(tournament: str, year: int) -> dict | None:
    for _, label, venues in MAJOR_DEFS:
        if label == tournament:
            # AUGUSTA is a plain dict (not keyed by year)
            if "course" in venues:
                return venues
            return venues.get(year)
    return None

# ---------------------------------------------------------------------------
# HTML table parser
# ---------------------------------------------------------------------------
class TableExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tables: list[list[list[str]]] = []
        self._table: list[list[str]] | None = None
        self._row: list[str] | None = None
        self._cell_parts: list[str] | None = None
        self._skip = 0

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            t: list[list[str]] = []
            self.tables.append(t)
            self._table = t
        elif tag == "tr" and self._table is not None:
            self._row = []
            self._table.append(self._row)
        elif tag in ("td", "th") and self._row is not None:
            self._cell_parts = []
            self._row.append("")
        elif tag in ("sup", "sub", "style", "script"):
            self._skip += 1

    def handle_endtag(self, tag):
        if tag == "table":
            self._table = None
            self._row = None
            self._cell_parts = None
        elif tag == "tr":
            self._row = None
        elif tag in ("td", "th"):
            if self._row is not None and self._cell_parts is not None:
                self._row[-1] = re.sub(r"\s+", " ", "".join(self._cell_parts)).strip()
            self._cell_parts = None
        elif tag in ("sup", "sub", "style", "script"):
            self._skip = max(0, self._skip - 1)

    def handle_data(self, data):
        if self._cell_parts is not None and self._skip == 0:
            self._cell_parts.append(data)


# ---------------------------------------------------------------------------
# Wikipedia fetch with retry
# ---------------------------------------------------------------------------
def fetch_html(title: str) -> str:
    params = urllib.parse.urlencode({
        "action": "parse", "page": title,
        "prop": "text", "formatversion": "2", "format": "json",
    })
    url = f"https://en.wikipedia.org/w/api.php?{params}"
    headers = {"User-Agent": "wiki-yellow-scraper/1.0 (golf game data builder)"}

    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
            if "error" in data:
                raise ValueError(data["error"].get("info", "Wikipedia API error"))
            return data["parse"]["text"]
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 8 * (2 ** attempt)
                print(f"  429 — waiting {wait}s", end=" ", flush=True)
                time.sleep(wait)
            else:
                raise
    raise RuntimeError(f"Gave up after retries for {title}")


# ---------------------------------------------------------------------------
# Parse the major championship results grid
# ---------------------------------------------------------------------------
def is_won(text: str) -> bool:
    t = text.strip()
    return bool(re.match(r"^(won|1st?)$", t, re.I)) or t == "1"

def parse_position(text: str) -> int:
    s = text.strip().lower()
    if re.match(r"^(won|1st?)$", s) or s == "1":
        return 1
    m = re.match(r"^t?(\d+)$", s)
    return int(m.group(1)) if m else 9999

SKIP_VALS = {"", "dnp", "dnq", "wd", "–", "-", "a", "mdf", "q"}


def find_major_table(tables: list[list[list[str]]]) -> list[list[str]] | None:
    """
    Find the table where:
    - The header row has ≥5 4-digit year columns
    - At least 3 of the first-column values match a major name
    """
    for table in tables:
        if len(table) < 4:
            continue
        header = table[0]
        year_count = sum(1 for h in header if re.search(r"\b(19|20)\d{2}\b", h))
        if year_count < 5:
            continue
        major_hits = sum(
            1 for row in table[1:] if row and classify_major(row[0]) is not None
        )
        if major_hits >= 3:
            return table
    return None


def extract_results(table: list[list[str]]) -> dict | None:
    header = table[0]
    col_years: dict[int, int] = {}
    for i, h in enumerate(header):
        m = re.search(r"\b((19|20)\d{2})\b", h)
        if m:
            col_years[i] = int(m.group(1))

    wins: list[tuple[str, int]] = []
    best_pos = 9999
    best_result: tuple[str, str, int] | None = None

    for row in table[1:]:
        if not row:
            continue
        classified = classify_major(row[0])
        if not classified:
            continue
        tournament, _ = classified

        for col_idx, year in col_years.items():
            if col_idx >= len(row):
                continue
            val = row[col_idx].strip()
            if val.lower() in SKIP_VALS or not val:
                continue

            if is_won(val):
                wins.append((tournament, year))
            else:
                pos = parse_position(val)
                if 1 < pos < best_pos:
                    best_pos = pos
                    best_result = (tournament, val, year)

    if wins:
        wins.sort(key=lambda x: x[1], reverse=True)
        tournament, year = wins[0]
        venue = lookup_venue(tournament, year)
        only_masters = all(t == "The Masters" for t, _ in wins)
        return {
            "type": "win",
            "tournament": tournament,
            "year": year,
            "course": venue["course"] if venue else "",
            "location": venue["location"] if venue else "",
            "onlyMasters": only_masters,
        }

    if best_result:
        tournament, position, year = best_result
        venue = lookup_venue(tournament, year)
        return {
            "type": "best",
            "tournament": tournament,
            "year": year,
            "position": position,
            "course": venue["course"] if venue else "",
            "location": venue["location"] if venue else "",
        }

    return None


# ---------------------------------------------------------------------------
# Per-golfer
# ---------------------------------------------------------------------------
def process_golfer(title: str) -> dict:
    html = fetch_html(title)
    extractor = TableExtractor()
    extractor.feed(html)
    table = find_major_table(extractor.tables)
    if table is None:
        return {"type": "none", "note": "no major results table"}
    result = extract_results(table)
    return result or {"type": "none", "note": "no usable results"}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    results: dict[str, dict] = {}
    total = len(GOLFERS)

    for i, title in enumerate(GOLFERS, 1):
        print(f"[{i:>3}/{total}] {title}...", end=" ", flush=True)
        try:
            result = process_golfer(title)
            results[title] = result
            if result["type"] == "win":
                print(f"WIN  {result['tournament']} {result['year']} — {result.get('course', '?')}")
            elif result["type"] == "best":
                print(f"BEST {result['position']} at {result['tournament']} {result['year']} — {result.get('course', '?')}")
            else:
                print(f"none ({result.get('note', '')})")
        except Exception as e:
            print(f"ERROR: {e}")
            results[title] = {"type": "none"}
        time.sleep(1.5)

    # Write TypeScript
    ts_lines = [
        "// AUTO-GENERATED by scripts/scrape-major-results.py — do not edit by hand.",
        "// Re-run the script to refresh data after adding golfers.",
        "",
        "export type MajorResultEntry =",
        "  | { type: 'win';  tournament: string; year: number; course: string; location: string; onlyMasters: boolean }",
        "  | { type: 'best'; tournament: string; year: number; position: string; course: string; location: string }",
        "  | { type: 'none' };",
        "",
        "export const MAJOR_RESULTS: Record<string, MajorResultEntry> = {",
    ]
    for title, data in results.items():
        safe = title.replace("\\", "\\\\").replace('"', '\\"')
        clean = {k: v for k, v in data.items() if k != "note"}
        ts_lines.append(f'  "{safe}": {json.dumps(clean, ensure_ascii=False)},')
    ts_lines += ["};", ""]

    out_path = "src/data/majorResults.ts"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(ts_lines))

    wins  = sum(1 for r in results.values() if r["type"] == "win")
    bests = sum(1 for r in results.values() if r["type"] == "best")
    nones = sum(1 for r in results.values() if r["type"] == "none")
    print(f"\nWrote {out_path}: {wins} wins  {bests} best-finishes  {nones} no-result.")


if __name__ == "__main__":
    main()
