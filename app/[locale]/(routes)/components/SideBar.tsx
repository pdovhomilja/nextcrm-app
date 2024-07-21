import { getModules } from "@/actions/get-modules";

import ModuleMenu from "./ModuleMenu";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDictionary } from "@/dictionaries";

const SideBar = async () => {
  const session = await getServerSession(authOptions);

  if (!session) return null;

  const modules = await getModules();

  if (!modules) return null;

  //Get user language
  const lang = session.user.userLanguage;

  //Fetch translations from dictionary
  const dict = await getDictionary(lang as "en");

  if (!dict) return null;

  return <div className="overflow-auto" style={{ scrollbarColor: "#888", scrollbarWidth: "thin", height: "100vh", overflowX: "hidden" }}><ModuleMenu modules={modules} dict={dict}/></div> ;
};
export default SideBar;
