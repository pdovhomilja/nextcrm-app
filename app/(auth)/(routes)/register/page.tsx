import { RegisterComponent } from "./components/RegisterComponent";

type Props = {};

const RegistrPage = (props: Props) => {
  return (
    <div>
      <div className="py-10">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
          Welcome to NextCRM
        </h1>
      </div>
      <RegisterComponent />
    </div>
  );
};

export default RegistrPage;
