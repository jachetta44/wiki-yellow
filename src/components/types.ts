export type Golfer = {
  wikiTitle: string;
  displayName: string;
  acceptedAnswers?: string[];
  lifeline: string;
};

export type MetaInfo = {
  height: string | null;
  weight: string | null;
  heightWeight: string | null;
  tourWins: string | null;
  nationality: string | null;
  topRanking: string | null;
  topRankingYear: number | null;
  imageUrl: string | null;
  infoboxFound: boolean;
  bornYear: number | null;
  turnedPro: string | null;
  college: string | null;
  proWinsTotal: string | null;
  amateurWins: string | null;
};
