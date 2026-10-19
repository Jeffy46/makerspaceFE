import { HashLink } from "react-router-hash-link";

let Hero = () => {
  return (
    <header className="shadow-lg p-6 md:p-8 border-x-0 border-y bg-hero flex items-center">
      <div className="container mx-auto flex">
        <div className="w-full md:w-2/3 xl:w-1/2 min-h-64 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 md:p-6 ml-auto shadow-lg bg-sbu-navy-blue">
          <div className="flex flex-col p-4">
            <div className="text-4xl md:text-5xl font-bold">
              <h1 className="text-white">Innovate</h1>
              <h1 className="text-white">Create</h1>
              <h1 className="text-sbu-bright-red">Make.</h1>
            </div>
            <p
              className="text-lg text-gray-600 dark:text-gray-300 mb-6"
              id="hero-text"
            ></p>
          </div>
          <div className="flex flex-col justify-center align-center p-4">
            <HashLink
              className="bg-sbu-bright-red text-white font-bold py-3 px-6 shadow transition mb-4 text-center border border-solid border-white hover:bg-white hover:text-sbu-bright-red"
              smooth
              to={"/#spaces"}
            >
              Find a Space
            </HashLink>

            <HashLink
              className="bg-white font-bold py-3 px-6 transition text-center text-sbu-bright-red border border-solid border-sbu-bright-red hover:bg-sbu-bright-red hover:text-white hover:border-black"
              smooth
              to={"/#announcements"}
            >
              Announcements
            </HashLink>
          </div>
        </div>
      </div>
    </header>
  );
};
export default Hero;
