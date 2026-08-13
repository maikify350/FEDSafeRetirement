import { Suspense } from "react";
import { ReviewSite } from "@/components/ReviewSite";
import { artworks } from "@/data/artworks";

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ReviewSite artworks={artworks} />
    </Suspense>
  );
}
