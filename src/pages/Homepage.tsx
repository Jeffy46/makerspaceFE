import { Hero, Spaces, Workshops } from "../components";
import Announcements from "../components/Announcements";

let Homepage = () => (
  <>
    <main className="relative">
      <Hero></Hero>
      <Workshops></Workshops>
      <Spaces></Spaces>
      <Announcements></Announcements>
    </main>
  </>
);
export default Homepage;
