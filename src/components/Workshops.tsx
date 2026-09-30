import { useEffect, useState } from "react";
import { type Workshop } from "../interfaces/Workshop";
import { HashLink } from "react-router-hash-link";
let Arrow = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 10"
    className="inline-block w-6 h-2.5 ml-2 fill-current transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
  >
    <path d="M0 4h20L16 .5 17 0l6.5 5L17 10l-1-.5L20 6H0z" />
  </svg>
);

let Poster = ({ w, featured = false }: { w: Workshop; featured?: boolean }) => (
  <figure className="group flex flex-col border border-gray-200 bg-white p-3 shadow-sm">
    <div
      className={`overflow-hidden bg-gray-100 ${
        featured
          ? "relative aspect-[16/9] md:aspect-auto md:min-h-0 md:flex-1"
          : ""
      }`}
    >
      <img
        className={`transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none ${
          featured ? "absolute inset-0 h-full w-full " : "block h-auto w-full"
        }`}
        src={w.event_poster_path}
        alt={`${w.title} poster`}
        loading="lazy"
      />
    </div>
    <figcaption className="mt-3 flex">
      <p className="text-xl font-bold text-sbu-navy-blue">{w.title}</p>
      <span className="ml-auto">
        <Arrow></Arrow>
      </span>
    </figcaption>
  </figure>
);

let Workshops = () => {
  let hideShowMore = "/workshop" == location.pathname;
  let [events, setEvents] = useState<Workshop[]>([]);
  useEffect(() => {
    const tempData: Workshop[] = [
      {
        event_id: 1,
        title: "3DPATH General Body Meeting",
        event_date: new Date(),
        event_time: "12:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 2,
        title: "3DPATH General Body Meeting",
        event_date: new Date(),
        event_time: "12:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 3,
        title: "Workshop title",
        event_date: new Date(),
        event_time: "12:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_617315_image_1_30cd9b8e-ee59-4fda-83bb-e380dcda66ce_825225321.png",
      },
    ];

    setEvents(tempData);
  }, []);
  if (events.length === 0) return null;
  let [featured, ...rest] = events;

  return (
    <section
      id="workshops"
      aria-labelledby="workshops-heading"
      className="bg-white px-6 py-12 md:px-8 md:py-16"
    >
      <div className="container mx-auto">
        <div className="flex items-end justify-between gap-4 border-b border-gray-200 pb-4 mb-8">
          <div>
            <h2
              id="workshops-heading"
              className="text-3xl md:text-4xl font-bold text-sbu-navy-blue"
            >
              Upcoming Workshops
            </h2>
            <p className="mt-1 text-gray-600">
              Learn a new tool, meet other makers, and bring your project.
            </p>
          </div>
          {!hideShowMore && (
            <HashLink
              to="/workshop"
              className="shrink-0 font-bold text-sbu-navy-blue border-b-2 border-sbu-bright-red pb-0.5 transition hover:text-sbu-bright-red focus:outline-none focus-visible:ring-2 focus-visible:ring-sbu-navy-blue"
            >
              See all workshops
            </HashLink>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-[7fr_3fr]">
          <Poster w={featured} featured />
          <div className="grid grid-cols-2 gap-6 md:grid-cols-1">
            {rest.map((w) => (
              <Poster key={w.event_id} w={w} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
export default Workshops;
