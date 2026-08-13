import { PresentationBook } from "@/components/presentation-book";
import { artworks } from "@/data/artworks";

export default function PresentationPage() {
  return <PresentationBook artworks={artworks} />;
}

