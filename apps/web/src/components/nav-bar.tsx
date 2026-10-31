import { Link } from 'react-router';

interface NavBarProps {
  /** Sem sessão, a barra mostra "Entrar" e "Criar conta"; com sessão, só o nome do app (hipótese). */
  anonymous: boolean;
}

/** Barra de navegação (`nav-bar` do DESIGN.md) no topo da rota raiz e da página de erro. */
export function NavBar({ anonymous }: NavBarProps) {
  return (
    <header>
      <nav aria-label="Principal" className="nav-bar">
        <Link to="/" className="nav-link">
          App
        </Link>
        {anonymous ? (
          <div className="flex items-center gap-3">
            <Link to="/entrar" className="btn-secondary">
              Entrar
            </Link>
            <Link to="/cadastro" className="btn-primary">
              Criar conta
            </Link>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
