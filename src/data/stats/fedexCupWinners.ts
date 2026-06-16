/**
 * FedEx Cup winners by year. Keyed by wikiTitle so it joins to GOLFERS.
 *
 * Only includes years where the winner is in the modern daily pool and
 * where the fact is well-documented. The clue builder looks up the
 * current golfer's wikiTitle and, if they have one or more entries,
 * surfaces the year(s) as a medium-difficulty stat clue.
 */
export const FEDEX_CUP_WINS: Record<string, number[]> = {
  "Tiger Woods": [2007, 2009],
  "Vijay Singh": [2008],
  "Jim Furyk": [2010],
  "Bill Haas": [2011],
  "Brandt Snedeker": [2012],
  "Henrik Stenson": [2013],
  "Billy Horschel": [2014],
  "Jordan Spieth": [2015],
  "Rory McIlroy": [2016, 2019, 2022],
  "Justin Thomas": [2017],
  "Justin Rose": [2018],
  "Dustin Johnson": [2020],
  "Patrick Cantlay": [2021],
  "Viktor Hovland": [2023],
  "Scottie Scheffler": [2024],
};
