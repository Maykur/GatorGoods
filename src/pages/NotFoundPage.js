import { Link } from 'react-router-dom';

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
    <section className="rounded-3xl border border-slate-800 bg-slate-950/70 px-6 py-8 shadow-lg shadow-black/20 sm:px-8">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-gatorOrange">
        Error 404
      </p>
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Chomp! Page not found
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
        The gators searched the swamp, but this route does not exist.
      </p>
      <pre
        aria-hidden="true"
        className="mt-6 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-4 text-[0.65rem] leading-tight text-slate-300"
      >
        {GATOR_404}
      </pre>
      <p className="mt-6">
        <Link
          to="/"
          className="inline-flex rounded-full bg-gatorOrange px-4 py-2 font-semibold text-white no-underline transition-colors hover:bg-orange-500"
        >
          Go back home
        </Link>
      </p>
    </section>
  );
}
