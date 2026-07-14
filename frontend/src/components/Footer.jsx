import logo from "../assets/logo.png";

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-brand">
        <img src={logo} alt="Orca Profile Manager" />
        <span>Orca Profile Manager</span>
      </div>
      <div className="app-footer-meta">
        <span>by Enzo Pierrot</span>
        <a href="https://github.com/enzoprt/orca-profile-manager" target="_blank" rel="noreferrer">
          GitHub
        </a>
        <span>© {new Date().getFullYear()}</span>
      </div>
    </footer>
  );
}
