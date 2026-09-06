export type HeadingLevel = 1 | 2 | 3;

export type ExtractedHeading = {
  level: HeadingLevel;
  text: string;
};

export type ExtractedLink = {
  href: string;
  text: string;
  internal: boolean;
};

export type ExtractedImage = {
  src: string;
  alt: string;
};

export type SiteInspection = {
  sourceUrl: string;
  finalUrl: string;
  fetchedAt: string;
  title: string;
  description: string;
  canonical: string | null;
  language: string | null;
  favicon: string | null;
  ogImage: string | null;
  themeColor: string | null;
  generator: string | null;
  headings: ExtractedHeading[];
  links: ExtractedLink[];
  images: ExtractedImage[];
  colors: string[];
  fonts: string[];
  tech: string[];
  sections: string[];
  wordCount: number;
  response: {
    status: number;
    contentType: string;
    bytes: number;
    redirected: boolean;
  };
};

export type InspectSuccess = {
  ok: true;
  inspection: SiteInspection;
  briefMarkdown: string;
};

export type InspectFailure = {
  ok: false;
  error: string;
};

export type InspectResponse = InspectSuccess | InspectFailure;

export type CloneJob = {
  id: string;
  createdAt: string;
  sourceUrl: string;
  host: string;
  inspection: SiteInspection;
  briefMarkdown: string;
};
