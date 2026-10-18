import { HashLink } from "react-router-hash-link";
import { type Space } from "../interfaces/Space";
let spaces: Space[] = [
  {
    name: "The Space",
    blurb:
      "Located in Room 105 of the Engineering building, The Space is a place where CEAS students can access fabrication tools, electronics, and open project hours after completing training.",
    space_poster_path:
      "https://uploads.knightlab.com/storymapjs/43ef07b73bec477df1dee2dc1d73a88b/maker-spaces-on-campus/_images/space-herrera-kukta-shurz-1.jpg",
    to: "https://www.stonybrook.edu/mach1/the-space/",
  },
  {
    name: "The CAT Lab",
    blurb:
      "Located in room C-2615 of the Melville Library, Stony Brook University's CAT Lab is an interdisciplinary hub where all students can turn ideas into reality using 3D printers, laser cutters, textiles equipment, and VR stations.",
    space_poster_path:
      "https://uploads.knightlab.com/storymapjs/43ef07b73bec477df1dee2dc1d73a88b/maker-spaces-on-campus/_images/IMG_9840.jpeg",
    to: "https://you.stonybrook.edu/catlab/",
  },
  {
    name: "The Third Space",
    blurb:
      "Located in the Staller Center for the Arts, The 3rd Space is a studio for mechatronic arts and digital fabrication where students blend technology and art using physical computing, 3D printers, and creative coding.",

    space_poster_path:
      "https://uploads.knightlab.com/storymapjs/43ef07b73bec477df1dee2dc1d73a88b/maker-spaces-on-campus/_images/IMG_8987.PNG",
    to: "https://www.youvisit.com/tour/map/stonybrook?loc=46:0:d",
  },
];

let ribbons = [
  {
    label: "Map",
    to: "https://www.youvisit.com/tour/map/stonybrook",
    bg: "from-[#0a4fa8] to-[#1d78d6]",
  },
  {
    label: "Workshops",
    to: "/workshops#top",
    bg: "from-[#0a6b7a] to-[#0aa0b5]",
  },
  {
    label: "Top makers",
    to: "/leaderboard#top",
    bg: "from-[#7a0010] to-[#c4161c]",
  },
];

let Arrow = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 10"
    className="inline-block w-6 h-2.5 ml-2 fill-current transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
  >
    <path d="M0 4h20L16 .5 17 0l6.5 5L17 10l-1-.5L20 6H0z" />
  </svg>
);

let SpaceCard = ({ space, raised }: { space: Space; raised: boolean }) => (
  <HashLink to={space.to} target="_blank">
    <div
      className={`group block focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-4 focus-visible:ring-offset-sbu-navy-blue ${
        raised ? "md:-mt-[90px]" : ""
      }`}
    >
      <div className="aspect-[5/4] w-full overflow-hidden bg-white/10">
        {space.space_poster_path && (
          <img
            src={space.space_poster_path}
            alt={space.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none"
          />
        )}
      </div>
      <div className="mt-2 bg-sbu-bright-red py-3 text-center">
        <h3 className="text-2xl font-semibold text-white">{space.name}</h3>
      </div>
      <p className="mt-4 leading-snug text-white/90 text-base">
        {space.blurb}
        <span className="text-white">
          <Arrow />
        </span>
      </p>
    </div>
  </HashLink>
);
let Spaces = () => {
  return (
    <section
      id="spaces"
      aria-labelledby="spaces-heading"
      className="bg-sbu-navy-blue px-6 py-16 md:px-8 md:py-20"
    >
      <div className="container mx-auto">
        <div className="mx-auto max-w-4xl text-center">
          <h2
            id="spaces-heading"
            className="text-5xl font-bold text-white md:text-6xl"
          >
            Visit a Space Around Campus
          </h2>
        </div>

        <div className="mt-12 grid grid-cols-1 items-start gap-8 lg:grid-cols-3 lg:pt-[90px] lg:gap-y-8">
          {spaces.map((s, i) => (
            <SpaceCard key={i} space={s} raised={i === 1 || i == 3} />
          ))}
        </div>
      </div>
    </section>
  );
};
export default Spaces;
