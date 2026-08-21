import './DevToolsPage.css';

export default function DevToolsPage() {
  return (
    <div className="page devtools-page">
      <header className="page-header">
        <h1 className="page-title">Herramientas de Desarrollo 🛠️</h1>
        <p className="page-subtitle">Solo disponible para el tech lead</p>
      </header>

      <section className="card devtools-card">
        <h2 className="section-title">Estado de la App</h2>
        <dl className="devtools-list">
          <div className="devtools-row">
            <dt>Entorno</dt>
            <dd>{import.meta.env.MODE}</dd>
          </div>
          <div className="devtools-row">
            <dt>Base URL API</dt>
            <dd>{import.meta.env.VITE_API_URL || '/api'}</dd>
          </div>
          <div className="devtools-row">
            <dt>Clerk configurado</dt>
            <dd>{import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ? 'Sí' : 'No'}</dd>
          </div>
        </dl>
      </section>

      <section className="card devtools-card">
        <h2 className="section-title">Herramientas</h2>
        <div className="devtools-grid">
          <button
            className="btn btn-outline devtools-btn"
            onClick={() => window.location.reload()}
          >
            Recargar app
          </button>
          <button
            className="btn btn-outline devtools-btn"
            onClick={() => console.clear()}
          >
            Limpiar consola
          </button>
        </div>
      </section>
    </div>
  );
}
