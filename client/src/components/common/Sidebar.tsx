import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { IoLogOut } from "react-icons/io5";
import logo from "../../../public/logo.png";
interface MenuItem {
  name: string;
  icon: React.ReactNode;
  path?: string;
}

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  menuItems: MenuItem[];
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  toggleSidebar,
  menuItems,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleItemClick = () => {
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  const logoutHandler = () => {
    logout();
    navigate("/login");
  };

  return (
    <div
      className={`transition-all duration-300 flex flex-col  bg-white  ${
        isOpen ? "min-w-60 w-full max-w-72 " : "min-w-20"
      }   shadow-custom-primary    absolute md:relative z-50 max-h-[90%] md:max-h-full md:h-[calc(100vh - 80px)] pt-6  rounded-card   ${
        isOpen ? " " : "hidden md:flex "
      }`}
    >
      <div className={`flex items-center justify-center py-4`}>
        <div className="flex items-center justify-center gap-4">
          <img
            src={logo}
            alt="Daizer-logo"
            className="md:h-10 h-8 lg:h-12 object-contain"
          />
          {isOpen && (
            <h2 className="font-jaffna  text-[24px] md:text-[26px] 3xl:text-[28px] text-primary-dark">
              Daizer Cards
            </h2>
          )}
        </div>
      </div>
      <div className="flex items-center w-8 h-8 justify-center absolute -right-4 top-9 lg:top-28 rounded-full border border-primary bg-white/50">
        <button
          onClick={toggleSidebar}
          className="focus:outline-none text-primary-dark "
        >
          {isOpen ? (
            <div>
              <span className="hidden md:block">
                <ChevronLeft />
              </span>
              <span className=" md:hidden">
                <X />
              </span>
            </div>
          ) : (
            <div className="hidden md:block">
              <span className="hidden md:block">
                <ChevronRight />
              </span>
              <span className=" md:hidden">
                <X />
              </span>
            </div>
          )}
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto  mt-6 lg:mt-10  flex flex-col  justify-between pl-5 ">
        <li>
          {menuItems.map((item) =>
            item.path ? (
              <NavLink
                to={item.path}
                key={item.name}
                onClick={() => handleItemClick()}
              >
                {({ isActive }) => (
                  <div className="relative my-1 3xl:my-5 ">
                    <div
                      className={`${
                        isActive
                          ? `p-[3px] pl-[4px]  ${
                              isOpen
                                ? "bg-[linear-gradient(to_right,_#1e3a8a_20%,_#f1f1f1_90%,_#F1F1F1_90%)] "
                                : "bg-[linear-gradient(to_right,_#1e3a8a_20%,_#f1f1f1_75%,_#F1F1F1_90%)]  "
                            }  rounded-tl-full rounded-bl-full`
                          : ""
                      }`}
                    >
                      <div
                        className={`relative flex items-center cursor-pointer px-6  pl-3 py-2 3xl:py-3 text-primary-dark/80 hover:text-primary-dark rounded-tl-full rounded-bl-full ${
                          isActive ? "bg-dashboard-bg text-primary-dark" : ""
                        }
        `}
                      >
                        {/* Icon */}
                        <span
                          className={`flex-shrink-0 text:sm lg:text-lg 3xl:text-xl p-1.5 lg:p-2  3xl:p-3 ${
                            isActive
                              ? "bg-primary-dark text-white rounded-full"
                              : ""
                          }`}
                        >
                          {item.icon}
                        </span>

                        {/* Label */}
                        {isOpen && (
                          <span className="ml-3 whitespace-nowrap overflow-hidden overflow-ellipsis text-xs 3xl:text-sm font-poppins font-medium">
                            {item.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Inverted border elements - only show when active */}
                    {isActive && (
                      <>
                        <div className="absolute -top-[24px] right-0 w-6 h-6 bg-dashboard-bg">
                          <div className="absolute bottom-0 right-0 w-6 h-6 rounded-bl-card" />
                          <div className="absolute bottom-0 right-0 w-6 h-6 bg-sidebar-bg bg-white rounded-br-card" />
                        </div>
                        <div className="absolute -bottom-[20px] right-0 w-5 h-5 bg-dashboard-bg">
                          <div className="absolute top-0 right-0 w-5 h-5 rounded-tl-card" />
                          <div className="absolute top-0 right-0 w-5 h-5 bg-sidebar-bg bg-white rounded-tr-card" />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </NavLink>
            ) : null
          )}
        </li>

        <li>
          <div
            className={`relative px-6 py-2 flex items-center cursor-pointer text-primary-dark/80 hover:text-primary  my-5`}
            onClick={logoutHandler}
          >
            <span className="flex-shrink-0 text-xl">
              <IoLogOut />
            </span>
            {isOpen && (
              <span className="ml-3 whitespace-nowrap overflow-hidden overflow-ellipsis font-poppins font-normal text-base text-primary-dark/80">
                Logout
              </span>
            )}
          </div>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
