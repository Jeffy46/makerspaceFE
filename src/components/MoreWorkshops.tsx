import { useEffect, useState } from "react";
import { type Workshop } from "../interfaces/Workshop";
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
  <figure className="group flex flex-col border-2 border-gray-200 bg-sbu-light-gray p-1 shadow-sm">
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
    <figcaption className="mt-2 flex">
      <p className="text-sm font-bold text-sbu-navy-blue">{w.title}</p>
      <span className="ml-auto">
        <Arrow></Arrow>
      </span>
    </figcaption>
  </figure>
);

let MoreWorkshops = () => {
  let [otherWorkshops, setOtherWorkshops] = useState<Workshop[]>([]);
  let [pastWorkshops, setPastWorkshops] = useState<Workshop[]>([]);

  useEffect(() => {
    const tempOtherWorkshops: Workshop[] = [
      {
        event_id: 4,
        title: "Intro to 3D Printing",
        event_date: new Date(),
        event_time: "15:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 5,
        title: "Laser Cutting Workshop",
        event_date: new Date(),
        event_time: "16:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
    ];

    const tempPastWorkshops: Workshop[] = [
      {
        event_id: 6,
        title: "Beginner CAD Workshop",
        event_date: new Date(),
        event_time: "12:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
      {
        event_id: 7,
        title: "Arduino Workshop",
        event_date: new Date(),
        event_time: "14:00:00",
        event_poster_path:
          "https://sbengaged.stonybrook.edu/upload/stonybrook/2026/e3_image_upload_625322_3DPATH_GBM_POSTER_SPRING_26_1_5c5a20f1-9071-4532-b82c-23dec833d8d7_85224354.png",
      },
    ];

    setOtherWorkshops(tempOtherWorkshops);
    setPastWorkshops(tempPastWorkshops);
  }, []);

  return (
    <section
      aria-labelledby="more-workshops-heading"
      className="bg-white/20  px-6 py-8 md:px-8 md:py-12"
    >
      <div className="container mx-auto">
        {otherWorkshops.length > 0 && (
          <div className="border-r-4 border-b-4 border-gray-200 mb-12 bg-sbu-medium-gray">
            <h3 className="text-2xl font-bold text-sbu-navy-blue p-2 pl-4">
              Other Upcoming Workshops
            </h3>

            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 p-4">
              {otherWorkshops.map((w) => (
                <Poster key={w.event_id} w={w} />
              ))}
            </div>
          </div>
        )}

        {pastWorkshops.length > 0 && (
          <div className="border-r-4 border-b-4 border-gray-200 bg-sbu-medium-gray">
            <h3 className="text-2xl font-bold p-2 pl-4 text-sbu-navy-blue">
              Past Workshops
            </h3>

            <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 p-4">
              {pastWorkshops.map((w) => (
                <Poster key={w.event_id} w={w} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default MoreWorkshops;
