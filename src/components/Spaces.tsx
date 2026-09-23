let Spaces = () => {
  return (
    <>
      <div id="spaces" className="grid grid-cols-1 sm:grid-cols-2 h-auto">
        <div className="bg-the-space grayscale hover:grayscale-0 hover:border ">
          <h1>The Space</h1>
        </div>
        <div className="bg-innovation-lab grayscale hover:grayscale-0 ">
          Innovation Lab
        </div>
        <div className="bg-tll-lab grayscale hover:grayscale-0">The Space</div>
        <div className="bg-third-space grayscale hover:grayscale-0 ">
          The Space
        </div>
      </div>
    </>
  );
};
export default Spaces;
