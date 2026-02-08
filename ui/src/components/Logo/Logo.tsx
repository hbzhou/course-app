import React from "react";
import logo from "/logo.png";

const Logo: React.FC = () => {
  return (
    <div>
      <img className="max-h-10 ml-4" src={logo} alt="logo" />
    </div>
  );
};

export default Logo;
