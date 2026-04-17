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
  imageUrl: string | null;
  infoboxFound: boolean;
};
