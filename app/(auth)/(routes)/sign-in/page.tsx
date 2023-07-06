import UserAuthForm from "@/components/UserAuthForm";

const SignInPage = () => {
  return (
    <div className="flex text-3xl text-black gap-2">
      <div className="space-x-2">
        <UserAuthForm />
      </div>
    </div>
  );
};

export default SignInPage;
