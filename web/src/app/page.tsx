import { Delta } from '@/components/sections/Delta';
import { FinalCta } from '@/components/sections/FinalCta';
import { Footer } from '@/components/sections/Footer';
import { Hero } from '@/components/sections/Hero';
import { Problem } from '@/components/sections/Problem';
import { Tree } from '@/components/sections/Tree';
import { Trust } from '@/components/sections/Trust';

/** Renders the kinetic editorial landing page in the specified section order. */
export default function HomePage() {
  return (
    <main className="landing">
      <Hero />
      <Problem />
      <Tree />
      <Delta />
      <Trust />
      <FinalCta />
      <Footer />
    </main>
  );
}
