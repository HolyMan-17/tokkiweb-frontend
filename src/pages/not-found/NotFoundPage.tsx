import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/routes';
import { usePageMeta } from '../../hooks/usePageMeta';
import hoppingBunny from '../../assets/hopping_bunny.webp';
import './NotFoundPage.css';

// Branded 404 — unknown URLs used to silently redirect home, hiding broken
// links. Now we keep the URL and show a kawaii dead-end with a way out.
export default function NotFoundPage() {
  usePageMeta({
    title: '404 — Página no encontrada | Tokki Shop',
    noindex: true,
  });

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
      <p className="not-found-brand font-display">Tokki Shop</p>
      <p className="not-found-code font-display">404</p>
      <h1 className="not-found-title">
        La página solicitada no fue encontrada, por favor regresa al inicio
      </h1>
      <Link to={ROUTES.home} className="btn btn-primary btn-lg not-found-btn">
        Volver al inicio
      </Link>
    </main>
  );
}
