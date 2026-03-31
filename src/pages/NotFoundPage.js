import { Show } from '@clerk/react';
import { Link } from 'react-router-dom';
import { Button, Card, PageHeader } from '../components/ui';

// prettier-ignore
const GATOR_404 =
  "           _\n" +
  "            \\\n" +
  "             \\\n" +
  "             |\\\n" +
  "             /|     ~ GatorGoods 404 ~\n" +
  "            /'|\n" +
  "          ,' //\n" +
  "        ,'..'/\n" +
  "       /   '/                                                          _...._.---._\n" +
  "     /:   ,'                                                         .' ,--. ,--.  \\\n" +
  "   ,'    ,                                                           | /... /...|  |,..._\n" +
  "  ,'    /                                   _..---------..__         \\\\._O_/  O /  '     \\\n" +
  " .'  _, /                 .---..._       ,-'  __.-.....__   '-  ___.-----._'---'     ,'  |\n" +
  " |-'  (                  |       '--..,'_,-''   '.     '''\"-._( .-.'.--.         _.'   /\n" +
  " |      \\\\                 |  ,.__     /,'  |      |      \\\\     \\\\ | / |  /      ,,'  __ /\n" +
  " |     .'.               /  .'  _)--..'    |       |     '\\\\     \\\\  ..--:      _.--' \\\n" +
  " |   .'  .-.__           |  |,-' _.-\\\\      |       |      |     |''''''''''_.-'   ,' (__...'\n" +
  "  \\\\         ,-'-- =--::|   \\\\-'|    |     |       |      |     | '.....-' .,:-'  |  \\\n" +
  "   `.      /  /      . |   |  |    |     |       |      |     |  \\\\__.-  ..      \\\\   \\\n" +
  "    '.  /  /  /         '|   |  |    [     |       |       |    |    ,       '._    |  |\n" +
  "      `.  /  | .--------'    '-. |   '     |       |       |    |, ______       '--..   \\\n" +
  "        ''.  | \\\\               |-^---''\".  |      |       .'    |.'      ''-..._        \\\n" +
  "           .-..\\\\.__...---....,'-.....--''\"'........_____|.. ''                ''--.... /\n";

export function NotFoundPage() {
  return (
    <section className="w-full space-y-8 motion-safe:animate-fade-in-up">
      <PageHeader
        eyebrow="Error 404"
        title="Chomp! Page not found"
        description="The gators searched the swamp, but this route does not exist. Head back to a known part of the marketplace and keep moving."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to="/" className="no-underline">
              <Button>Go to landing</Button>
            </Link>
            <Show when="signed-in" fallback={
              <Link to="/login" className="no-underline">
                <Button variant="secondary">Open sign in</Button>
              </Link>
            }>
              <Link to="/listings" className="no-underline">
                <Button variant="secondary">Browse listings</Button>
              </Link>
            </Show>
          </div>
        }
      />

      <Card className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gatorOrange">
            Lost but recoverable
          </p>
          <p className="text-sm leading-7 text-app-soft">
            This usually means the URL is outdated, mistyped, or points to a page that is no longer available.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card variant="subtle">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Try next</p>
              <p className="mt-2 text-sm leading-7 text-app-soft">
                Jump back to the landing page or open the marketplace feed.
              </p>
            </Card>
            <Card variant="subtle">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-muted">Still stuck?</p>
              <p className="mt-2 text-sm leading-7 text-app-soft">
                Use the main navigation to re-enter listings, messages, or your profile dashboard.
              </p>
            </Card>
          </div>
        </div>

        <pre
          aria-hidden="true"
          className="overflow-x-auto rounded-[1.5rem] border border-white/10 bg-slate-950/90 p-4 text-[0.65rem] leading-tight text-slate-300"
        >
          {GATOR_404}
        </pre>
      </Card>
    </section>
  );
}
