import { useMemo } from "react";
import GlassCard from "./ui/GlassCard";
import quotesData from "../data/quotes.json";
import { getActiveDate } from "../utils/date";

interface Quote {
  text: string;
  author: string;
  source: string;
}

const quotes: Quote[] = quotesData;

function pickQuote(dateStr: string): Quote {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return quotes[hash % quotes.length];
}

export default function MotivationCard() {
  const quote = useMemo(() => pickQuote(getActiveDate()), []);

  return (
    <GlassCard className="mb-6 p-[14px] sm:p-4">
      <figure className="text-center">
        <blockquote className="font-serif text-[16px] italic leading-relaxed text-dash-primary">
          {quote.text}
        </blockquote>
        <figcaption className="mt-1.5 text-xs text-dash-tertiary">
          {quote.author}, <cite>{quote.source}</cite>
        </figcaption>
      </figure>
    </GlassCard>
  );
}
