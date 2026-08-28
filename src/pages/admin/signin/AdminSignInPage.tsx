import { SignIn } from '@clerk/react';
import { ADMIN_ROUTES } from '../../../lib/routes';
import { CLERK_PUBLISHABLE_KEY, ADMIN_DEV_BYPASS } from '../../../lib/auth';
import hoppingBunny from '../../../assets/hopping_bunny.gif';
import './AdminSignInPage.css';

export default function AdminSignInPage() {
  if (!CLERK_PUBLISHABLE_KEY || ADMIN_DEV_BYPASS) {
    return (
      <div className="admin-signin-page">
        <img src={hoppingBunny} alt="Tokki el conejo" className="admin-signin-logo" width={120} height={146} />
        <h1 className="admin-signin-title">Tokki Shop Admin</h1>
        <p className="admin-signin-sub">Modo de desarrollo activo (Clerk omitido)</p>
        <a href={ADMIN_ROUTES.root} className="admin-btn admin-btn--primary" style={{ marginTop: '1rem', textDecoration: 'none' }}>
          Ir al Panel de Administración
        </a>
      </div>
    );
  }

  return (
    <div className="admin-signin-page">
      <img src={hoppingBunny} alt="Tokki el conejo" className="admin-signin-logo" width={120} height={146} />
      <h1 className="admin-signin-title">Tokki Shop Admin</h1>
      <p className="admin-signin-sub">Inicia sesión para acceder al panel</p>
      <SignIn
        routing="hash"
        forceRedirectUrl={ADMIN_ROUTES.root}
        fallbackRedirectUrl={ADMIN_ROUTES.root}
      />
    </div>
  );
}
