import logo from "../assets/logo.png";

export default function Brand({ subtitle }) {
  return (
    <div className="brand">
      <img src={logo} alt="Annemasse Natation" className="brand-logo" />
      {subtitle && (
        <div className="brand-text">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
}
