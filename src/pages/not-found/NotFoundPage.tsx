import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/routes';
import hoppingBunny from '../../assets/hopping_bunny.gif';
import './NotFoundPage.css';

// Branded 404 — unknown URLs used to silently redirect home, hiding broken
// links. Now we keep the URL and show a kawaii dead-end with a way out.
export default function NotFoundPage() {
  return (
    <main className="not-found-page animate-fadeIn">
      <img
        className="not-found-bunny"
        src={hoppingBunny}
        alt=""
        aria-hidden="true"
        width={140}
        height={140}
      />
      <p className="not-found-code font-display" aria-hidden="true">404</p>
      <h1 className="not-found-title">¡Oops! Página no encontrada</h1>
      <p className="not-found-text">
        Esta página se perdió como un mochi en la mochila de Tokki.
      </p>
      <Link to={ROUTES.home} className="btn btn-primary btn-lg not-found-btn">
        Volver a la tienda
      </Link>
    </main>
  );
}
