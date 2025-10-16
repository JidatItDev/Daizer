// // src/contexts/ConfigContext.jsx
// import { createContext, useContext, useEffect, useState } from "react";
// import { useConfig } from "../api/useConfig";
// import type { Config } from "../types/auth/settings.types";

// // const ConfigContext = createContext(null);
// const ConfigContext = createContext<Config | null>(null);

// export const ConfigProvider = ({ children }) => {
//   const { data: configdata } = useConfig();
//   // const [config, setConfig] = useState(null);
//   const [config, setConfig] = useState<Config | null>(null);

//   useEffect(() => {
//     if (configdata) {
//       setConfig(configdata.config);
//     }
//   }, [configdata]);
//   //   const config = configdata?.config;
//   //   console.log("ConfigContext config:", config);

//   useEffect(() => {
//     if (config?.logoUrl) {
//       console.log("called config");
//       let link = document.querySelector("link[rel~='icon']");
//       if (!link) {
//         link = document.createElement("link");
//         link.rel = "icon";
//         document.head.appendChild(link);
//       }
//       link.href = config.logoUrl;
//     }
//   }, [config?.logoUrl, configdata]);

//   return (
//     <ConfigContext.Provider value={config || {}}>
//       {children}
//     </ConfigContext.Provider>
//   );
// };

// export const useConfigContext = () => useContext(ConfigContext);

// src/context/ConfigContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useConfig } from "../api/useConfig";
import type { Config } from "../types/auth/settings.types";

const ConfigContext = createContext<Config | null>(null);

interface ConfigProviderProps {
  children: ReactNode;
}

export const ConfigProvider = ({ children }: ConfigProviderProps) => {
  const { data: configdata } = useConfig();
  const [config, setConfig] = useState<Config | null>(null);

  useEffect(() => {
    if (configdata) {
      setConfig(configdata.config);
    }
  }, [configdata]);

  useEffect(() => {
    if (config?.logoUrl) {
      // Cast to HTMLLinkElement to fix property access
      let link = document.querySelector(
        "link[rel~='icon']"
      ) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = config.logoUrl;
    }
  }, [config?.logoUrl, configdata]);

  // Fix: Remove the empty object fallback since we're using Config | null
  return (
    <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>
  );
};

export const useConfigContext = () => useContext(ConfigContext);
