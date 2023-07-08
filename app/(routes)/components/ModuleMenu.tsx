"use client";
import React, { useState } from "react";
import MenuItem from "./ui/MenuItem";

type Props = {
  modules: any;
};

const ModuleMenu = ({ modules }: Props) => {
  const [open, setOpen] = useState(true);

  //Console logs
  //console.log(modules, "modules");

  return (
    <div className="flex">
      <div
        className={` ${
          open ? "w-72" : "w-20 "
        } bg-dark-purple h-screen p-5  pt-8 relative duration-300`}
      >
        <div className="flex gap-x-4 items-center">
          <div
            className={`cursor-pointer duration-500 border rounded-full px-4 py-2 ${
              open && "rotate-[360deg]"
            }`}
            onClick={() => setOpen(!open)}
          >
            N
          </div>

          <h1
            className={` origin-left font-medium text-xl duration-200 ${
              !open && "scale-0"
            }`}
          >
            NextCRM
          </h1>
        </div>
        <ul className="pt-6">
          <MenuItem
            icon="home"
            open={open}
            route={"/"}
            menuItem={"Dashboard"}
          />
          {modules.map((menuItem: any) => {
            if (menuItem.enabled === true) {
              return (
                <MenuItem
                  key={menuItem.id}
                  icon={menuItem.icon}
                  open={open}
                  route={menuItem.route}
                  menuItem={menuItem.menuItem}
                />
              );
            } else {
              return null;
            }
          })}
          {/*             <li
              key={Menu.id}
              className={`flex  rounded-md p-2 cursor-pointer hover:bg-light-white text-sm items-center gap-x-4 
          ${Menu.gap ? "mt-9" : "mt-2"}  `}
            >
              <span className={`${!open && "hidden"} origin-left duration-200`}>
                {Menu.name}
              </span>
            </li>
          ))} */}
          <li>
            {/* Admin menu item is allways enabled */}
            <MenuItem
              icon="wrenchScrewdriver"
              open={open}
              route={"/admin"}
              menuItem={"Administrace"}
            />
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ModuleMenu;
