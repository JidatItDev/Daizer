import { useState } from "react";
import { Outlet } from "react-router-dom";
import { LiaUsersCogSolid } from "react-icons/lia";
import { AiFillProduct } from "react-icons/ai";
import Sidebar from "../components/common/Sidebar";
import Header from "../components/common/Header";

const UserLayout = () => {
  const menuItems = [
    {
      name: "Wallet Management",
      icon: <LiaUsersCogSolid />,
      path: "dashboard",
    },
    {
      name: "Product Browsing",
      icon: <AiFillProduct />,
      path: "/browse-categories",
    },
  ];

  const isMobile = window.innerWidth < 768;
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    // 🔒 Lock viewport scroll HERE
    <div className="flex w-full h-screen overflow-hidden bg-dashboard-bg gap-5 py-10 px-8">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        menuItems={menuItems}
      />

      {/* Column container */}
      <div className="flex flex-col w-full overflow-hidden gap-5">
        <Header toggleSidebar={toggleSidebar} />

        {/* ✅ THE ONLY SCROLL AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-[33px] bg-white shadow-custom-primary rounded-card">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default UserLayout;
