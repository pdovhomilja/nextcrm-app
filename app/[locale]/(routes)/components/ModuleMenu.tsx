"use client";
import React, { useState } from "react";
import MenuItem from "./ui/MenuItem";
import CrmMenu from "./menu-items/Crm";
import ProjectModuleMenu from "./menu-items/Projects";
import SecondBrainModuleMenu from "./menu-items/SecondBrain";
import InvoicesModuleMenu from "./menu-items/Invoices";
import ReportsModuleMenu from "./menu-items/Reports";
import DocumentsModuleMenu from "./menu-items/Documents";
import ChatGPTModuleMenu from "./menu-items/ChatGPT";
import EmployeesModuleMenu from "./menu-items/Employees";
import DataboxModuleMenu from "./menu-items/Databoxes";

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
            {process.env.NEXT_PUBLIC_APP_NAME}
          </h1>
        </div>
        <ul className="pt-6">
          <MenuItem
            icon="home"
            open={open}
            route={"/"}
            menuItem={"Dashboard"}
          />
          {modules.find(
            (menuItem: any) => menuItem.name === "crm" && menuItem.enabled
          ) ? (
            <CrmMenu open={open} />
          ) : null}
          {modules.find(
            (menuItem: any) => menuItem.name === "projects" && menuItem.enabled
          ) ? (
            <ProjectModuleMenu open={open} />
          ) : null}
          {modules.find(
            (menuItem: any) =>
              menuItem.name === "secondBrain" && menuItem.enabled
          ) ? (
            <SecondBrainModuleMenu open={open} />
          ) : null}
          {modules.find(
            (menuItem: any) => menuItem.name === "employee" && menuItem.enabled
          ) ? (
            <EmployeesModuleMenu open={open} />
          ) : null}
          {modules.find(
            (menuItem: any) => menuItem.name === "invoice" && menuItem.enabled
          ) ? (
            <InvoicesModuleMenu open={open} />
          ) : null}
          {modules.find(
            (menuItem: any) => menuItem.name === "reports" && menuItem.enabled
          ) ? (
            <ReportsModuleMenu open={open} />
          ) : null}
          {modules.find(
            (menuItem: any) => menuItem.name === "documents" && menuItem.enabled
          ) ? (
            <DocumentsModuleMenu open={open} />
          ) : null}
          {modules.find(
            (menuItem: any) => menuItem.name === "databox" && menuItem.enabled
          ) ? (
            <DataboxModuleMenu open={open} />
          ) : null}
          {modules.find(
            (menuItem: any) => menuItem.name === "openai" && menuItem.enabled
          ) ? (
            <ChatGPTModuleMenu open={open} />
          ) : null}

          {/*  {modules.map((menuItem: any) => {
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
          })} */}
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
