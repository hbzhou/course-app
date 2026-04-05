import logo from "/logo.png";

const Logo = () => {
  return (
    <div className="flex items-center">
      <img className="max-h-10 object-contain" src={logo} alt="Course App Logo" title="Course App" />
    </div>
  );
};

export default Logo;
