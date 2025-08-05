import React, { useEffect, useRef, useState } from "react";

import { MenuIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { FaUserLarge } from "react-icons/fa6";

interface HeaderProps {
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }: HeaderProps) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleDropdown = () => setDropdownOpen((prev) => !prev);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const logoutHandler = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white  shadow-custom-primary w-full  rounded-card">
      <div className="flex items-center justify-between py-4 px-4 md:px-6 lg:px-16 ">
        <div className="flex items-center   ">
          <button
            onClick={toggleSidebar}
            className="md:hidden text-primary mr-2 text-primary-dark "
          >
            <MenuIcon />
          </button>
          {/* <h1 className={clsx("", "text-ellipsis")}>{"title"}</h1> */}
        </div>
        <div className="flex items-center space-x-4 relative" ref={dropdownRef}>
          <button
            className=" gap-2 3xl:gap-2 rounded-full bg-accent-primary flex items-center justify-between relative font-poppins hover:text-primary  shadow-custom-secondary pr-5"
            onClick={toggleDropdown}
          >
            <div className="bg-[#B1B1B1] text-white p-1  text-lg  3xl:text-xl rounded-full flex items-center h-8 w-8 md:w-9 md:h-9   justify-center ">
              <FaUserLarge />
            </div>
            <p className=" font-medium text-sm 3xl:text-base text-[#B1B1B1] hover:text-black">
              {user?.name.split(" ")[0] || ""}
            </p>
            {/* <ChevronDown className="w-5 h-5 " /> */}
          </button>
          {dropdownOpen && (
            <div className="absolute  right-6 top-6 mt-2 w-40 bg-white border rounded-md shadow-md z-50">
              <button
                onClick={logoutHandler}
                className="w-full text-left px-4 py-2 hover:bg-accent-primary font-medium text-xs  text-gray-700 hover:bg-gray-50"
              >
                Logout
              </button>
              <button
                onClick={() => {
                  navigate("change-password");
                }}
                className="w-full text-left px-4 py-2 hover:bg-accent-primary font-medium text-xs text-gray-700 hover:bg-gray-50"
              >
                Change password
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
