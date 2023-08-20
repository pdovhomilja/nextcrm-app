const LoadingComponent = () => {
  return (
    <div className="flex w-full h-full items-center justify-center gap-5">
      <span className="border px-4 py-2 rounded-full animate-spin">N</span>
      <span className="animate-pulse">Loading ...</span>
    </div>
  );
};

export default LoadingComponent;
