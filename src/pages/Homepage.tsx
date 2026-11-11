import { Hero, Spaces, Events } from "../components";
import Announcements from "../components/Announcements";

let Homepage = () => (
  <main className="relative">
    <Hero></Hero>
    <Events></Events>
    <Spaces></Spaces>
    <Announcements></Announcements>
  </main>
);
export default Homepage;
