import { getModules } from "@/actions/get-modules";

import ModuleMenu from "./ModuleMenu";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDictionary } from "@/dictionaries";

const SideBar = async () => {
  const modules = await getModules();
  const session = await getServerSession(authOptions);

  if (!session) return null;

  const userId = session?.user?.id;

  //Get user language
  const lang = session?.user?.userLanguage;

  //Fetch translations from dictionary
  const dict = await getDictionary(lang as "en" | "cz" | "de");

  return <ModuleMenu modules={modules} dict={dict} />;
};
export default SideBar;
