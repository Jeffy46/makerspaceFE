import { faScrewdriverWrench } from "@fortawesome/free-solid-svg-icons/faScrewdriverWrench";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { HashLink } from "react-router-hash-link";
let Navbar = () => {
  let [isMenuOpen, setIsMenuOpen] = useState(false);
  let closeMenu = () => setIsMenuOpen(false);
  return (
    // Navigation
    <nav className="bg-sbu-red text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <HashLink to="/">
          <div className="flex items-center space-x-2">
            <FontAwesomeIcon icon={faScrewdriverWrench} className="text-2xl" />

            <span className="font-bold text-xl tracking-tight">
              SBU Maker Portal
            </span>
          </div>
        </HashLink>

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
            to={"/workshops"}
          >
            Workshops
          </HashLink>
        </div>
        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden -mr-2 p-2 focus:outline-none focus:ring-2 focus:ring-white rounded "
          aria-label={
            isMenuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={isMenuOpen}
          aria-controls="mobile-menu"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-6 w-6 fill-none stroke-current stroke-2"
            strokeLinecap="round"
          >
            {isMenuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden flex flex-col border-t border-white/20 px-6 pb-3 pt-1 text-base font-medium"
        >
          <HashLink
            className="block py-3 hover:text-gray-200 transition"
            smooth
            to="/#spaces"
            onClick={closeMenu}
          >
            Spaces
          </HashLink>

          <HashLink
            className="block py-3 hover:text-gray-200 transition"
            smooth
            to="/#announcements"
            onClick={closeMenu}
          >
            Announcements
          </HashLink>

          <HashLink
            className="block py-3 hover:text-gray-200 transition"
            to="/workshops"
            onClick={closeMenu}
          >
            Workshops
          </HashLink>
        </div>
      )}
    </nav>
  );
};
export default Navbar;
