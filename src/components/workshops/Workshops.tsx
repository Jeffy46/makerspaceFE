import { HashLink } from "react-router-hash-link";

let Workshops = () => {
  return (
    <>
      <div
        id="workshops"
        className="bg-white-100 h-96 p-8 bg-sbu-navy-blue h-fit"
      >
        <div>
          <div className="flex justify-center items-center mb-2">
            <div>
              <h1 className="text-3xl h-auto font-bold text-white ">
                Upcoming Workshops
              </h1>
            </div>
          </div>
        </div>
        <hr className="mb-4 text-white"></hr>
        <div className="grid grid-cols-[70%_30%] gap-6">
          <img
            className="border-8 border-sbu-royal-blue rounded-xl transition-transform duration-300 ease-in-out hover:-translate-y-1"
            src="../public/ex1.png"
            alt="workshop image"
          />
          <div className="gap-6 bg-sbu-navy-blue flex flex-col justify-evenly ">
            <img
              className="w-100 border-8 border-sbu-royal-blue rounded-xl  -rotate-2 transition-transform duration-300 ease-in-out hover:-translate-y-2"
              src="../public/ex1.png"
              alt="workshop image"
            />
            <img
              className="w-100 border-8 border-sbu-royal-blue rounded-xl rotate-3 transition-transform duration-300 ease-in-out hover:-translate-y-2"
              src="../public/ex1.png"
              alt="workshop image"
            />
          </div>
        </div>
        <div className="flex">
          <div className="ml-auto font-bold text-white no-underline hover:underline">
            <HashLink to="/workshops">See More &gt;</HashLink>
          </div>
        </div>
      </div>
    </>
  );
};
export default Workshops;
