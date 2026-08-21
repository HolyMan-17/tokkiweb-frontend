import { SignIn } from '@clerk/react';
import { ADMIN_PATH } from '../../../lib/auth';
import hoppingBunny from '../../../assets/hopping_bunny.gif';
import './AdminSignInPage.css';

export default function AdminSignInPage() {
  return (
    <div className="admin-signin-page">
      <img src={hoppingBunny} alt="Tokki el conejo" className="admin-signin-logo" width={500} height={605} />
      <h1 className="admin-signin-title">Tokki Shop Admin</h1>
      <p className="admin-signin-sub">Inicia sesión para acceder al panel</p>
      <SignIn
        routing="hash"
        forceRedirectUrl={ADMIN_PATH}
        fallbackRedirectUrl={ADMIN_PATH}
      />
    </div>
  );
}
