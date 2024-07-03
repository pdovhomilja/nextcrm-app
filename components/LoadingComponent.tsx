import Image from "next/image";
import windroseLogoNoTxt from "../public/images/windroseLogoNoTxt.svg";

const LoadingComponent = () => {
  return (
    <div className="flex w-full h-full items-center justify-center gap-5">
      <span className="px-4 py-2 rounded-full animate-spin"><Image src={windroseLogoNoTxt.src} width={10} height={10} alt="Windrose Logo"/></span>
      <span className="animate-pulse">Loading ...</span>
    </div>
  );
};

export default LoadingComponent;
