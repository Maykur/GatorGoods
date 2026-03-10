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
    <main style={{ padding: '2rem' }}>
      <h1>Chomp! Page Not Found</h1>
      <p>
        The gators have searched the swamp, but we couldn&apos;t find the page
        you were looking for.
      </p>
      <pre
        aria-hidden="true"
        style={{
          margin: '1.5rem 0',
          padding: '1rem',
          background: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '0.7rem',
          lineHeight: 1.1,
          overflowX: 'auto',
        }}
      >
        {GATOR_404}
      </pre>
      <p>
        <Link to="/">Go back home</Link>
      </p>
    </main>
  );
}
