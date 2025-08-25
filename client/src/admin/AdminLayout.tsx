import { useState } from "react";
import { Outlet } from "react-router-dom";
import { LiaUsersCogSolid } from "react-icons/lia";
import { BsFillCreditCardFill } from "react-icons/bs";

import Sidebar from "../components/common/Sidebar";
import Header from "../components/common/Header";

const AdminLayout = () => {
  const menuItems = [
    {
      name: "User Managment",
      icon: <LiaUsersCogSolid />,
      path: "dashboard",
    },
    {
      name: "Pricing Group",
      icon: <BsFillCreditCardFill />,
      path: "pricing-groups",
    },
  ];
  const isMobile = window.innerWidth < 768;
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex  w-full h-screen bg-dashboard-bg gap-5 py-10 px-8">
      <Sidebar
        isOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        menuItems={menuItems}
      />
      <div className="flex flex-col  overflow-hidden w-full gap-5">
        <Header toggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-auto p-[33px] bg-white h-full w-full  shadow-custom-primary  mt-0  rounded-card ">
          {<Outlet />}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
