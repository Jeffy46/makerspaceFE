import { useEffect, useState } from "react";
import { type Event } from "../../interfaces/Event";
import Poster from "./Poster";
let Arrow = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 10"
    className="inline-block w-6 h-2.5 ml-2 fill-current transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
  >
    <path d="M0 4h20L16 .5 17 0l6.5 5L17 10l-1-.5L20 6H0z" />
  </svg>
);

let MoreEvents = () => {
  let [otherEvents, setOtherEvents] = useState<Event[]>([]);
  let [pastEvents, setPastEvents] = useState<Event[]>([]);
  let [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/events`,
        );
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        let result = await response.json();
        let cur = getUpcomingEvents(result).slice(3);
        let past = getPastEvents(result);
        setOtherEvents(cur);
        setPastEvents(past);
      } catch (err) {
        console.error("Error occurred:", err);
        console.log(`${import.meta.env.VITE_BACKEND_URL}/events`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
  let placeholders: (Event | undefined)[] = [
    undefined,
    undefined,
    undefined,
    undefined,
  ];
  let upcomingToShow = loading ? placeholders : otherEvents;
  let pastToShow = loading ? placeholders : pastEvents;
  return (
    <section className="bg-white/20 px-6 py-8 md:px-8 md:py-12">
      <div className="container mx-auto">
        <section aria-labelledby="other-upcoming-Events-heading">
          {(loading || otherEvents.length > 0) && (
            <div className="border-r-4 border-b-4 border-gray-200 mb-12 bg-sbu-medium-gray">
              <h3 className="text-2xl font-bold text-sbu-navy-blue p-2 pl-4">
                Other Upcoming Events
              </h3>

              <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 p-4">
                {upcomingToShow.map((e, i) => (
                  <Poster
                    key={e?.event_id ?? i}
                    e={e}
                    notHomepage={false}
                    loading={false}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="past-Events-heading">
          {(loading || pastEvents.length > 0) && (
            <div className="border-r-4 border-b-4 border-gray-200 bg-sbu-medium-gray">
              <h3 className="text-2xl font-bold p-2 pl-4 text-sbu-navy-blue">
                Past Events
              </h3>

              <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4 p-4">
                {pastToShow.map((e, i) => (
                  <Poster
                    key={e?.event_id ?? i}
                    e={e}
                    notHomepage={false}
                    loading={false}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default MoreEvents;

const getUpcomingEvents = (Events: Event[]): Event[] => {
  return Events.filter((Event) => !Event.has_occurred);
};

const getPastEvents = (Events: Event[]): Event[] => {
  return Events.filter((Event) => Event.has_occurred);
};
