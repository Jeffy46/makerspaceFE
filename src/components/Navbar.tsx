import { useState } from "react";
import { HashLink } from "react-router-hash-link";
let Navbar = () => {
  let [isMenuOpen, setIsMenuOpen] = useState(false);
  return (
    // Navigation
    <nav className="bg-sbu-red text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <i className="fa-solid fa-tools text-2xl"></i>
          <span className="font-bold text-xl tracking-tight">
            SBU Maker Portal
          </span>
        </div>
        <div className="hidden md:flex space-x-8 text-sm font-medium">
          <HashLink
            className="hover:text-gray-200 transition"
            smooth
            to={"/#spaces"}
          >
            Spaces
          </HashLink>
          <HashLink
            className="hover:text-gray-200 transition"
            smooth
            to={"/#announcements"}
          >
            Announcements
          </HashLink>
          <HashLink
            className="hover:text-gray-200 transition"
            smooth
            to={"/#map-section"}
          >
            Map
          </HashLink>
          <HashLink className="hover:text-gray-200 transition" to={"/workshop"}>
            Workshops
          </HashLink>
          <HashLink
            className="hover:text-gray-200 transition"
            to={"/leaderboard"}
          >
            Top Makers
          </HashLink>
        </div>
        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden focus:outline-none focus:ring-2 focus:ring-white rounded"
          aria-label={
            isMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <i
            className={`fa-solid ${
              isMenuOpen ? "fa-xmark" : "fa-bars"
            } text-xl`}
            aria-hidden="true"
          ></i>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden flex flex-col space-y-4 pt-4"
        >
          <HashLink smooth to="/#spaces">
            Spaces
          </HashLink>

          <HashLink smooth to="/#announcements">
            Announcements
          </HashLink>

          <HashLink smooth to="/#map-section">
            Map
          </HashLink>

          <HashLink to="/leaderboard">Top Makers</HashLink>

          <HashLink to="/workshop">Workshops</HashLink>
        </div>
      )}
    </nav>
  );
};
export default Navbar;
