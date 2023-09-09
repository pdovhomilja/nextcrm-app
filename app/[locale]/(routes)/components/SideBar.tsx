import { getModules } from "@/actions/get-modules";

import ModuleMenu from "./ModuleMenu";

const SideBar = async () => {
  const modules = await getModules();

  return <ModuleMenu modules={modules} />;
};
export default SideBar;
