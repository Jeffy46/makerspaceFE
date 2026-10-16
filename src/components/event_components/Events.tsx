import { useEffect, useState } from "react";
import { type Event } from "../../interfaces/Event";
import { HashLink } from "react-router-hash-link";
import Poster from "./Poster";

let Events = () => {
  let notHomepage = location.pathname.endsWith("/workshops");
  let [events, setEvents] = useState<Event[]>([]);
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
        result = getUpcomingEvents(result).slice(0, 3);
        setEvents(result);
      } catch (err) {
        console.error("Error occurred:", err);
        console.log(`${import.meta.env.VITE_BACKEND_URL}/events`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (!loading && events.length === 0) return null;
  let [featured, ...rest]: (Event | undefined)[] = loading
    ? [undefined, undefined, undefined]
    : events;

  return (
    <section
      id="Events"
      aria-labelledby="Events-heading"
      className={`${notHomepage ? "bg-white/20" : "bg-white/20"} px-6 py-12 md:px-8 md:py-16`}
    >
      <div className="container mx-auto">
        <div
          className={`${notHomepage ? "bg-sbu-medium-gray" : "bg-sbu-light-gray"} flex items-end justify-between gap-4 border-l-0 border-b-4 border-r-4 border-gray-200 mb-8 p-1 flex-col sm:flex-row`}
        >
          <div>
            <h2
              id="Events-heading"
              className={`${notHomepage ? "text-sbu-navy-blue" : "text-sbu-navy-blue"} text-3xl md:text-4xl p-2 font-bold`}
            >
              Upcoming Events
            </h2>
            <p
              className={`${notHomepage ? "text-sbu-navy-blue" : "text-sbu-navy-blue"} p-2 mt-1`}
            >
              Learn a new tool, meet other makers, and bring your project.
            </p>
          </div>
          {notHomepage ? (
            <div></div>
          ) : (
            <HashLink
              to="/workshops"
              className="text-sbu-navy-blue shrink-0 whitespace-nowrap font-bold text-black border-b-2 border-sbu-bright-red pb-0.5 transition hover:text-sbu-bright-red focus:outline-none focus-visible:ring-2 focus-visible:ring-sbu-navy-blue mb-2 mr-4"
            >
              See all Events
            </HashLink>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[7fr_3fr]">
          <Poster
            e={featured}
            notHomepage={notHomepage}
            featured
            loading={loading}
          />
          <div className="grid grid-cols-1 gap-6">
            {rest.map((e, i) => (
              <Poster
                key={e?.event_id ?? i}
                e={e}
                notHomepage={notHomepage}
                loading={loading}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
export default Events;

const getUpcomingEvents = (Events: Event[]): Event[] => {
  return Events.filter((Event) => !Event.has_occurred);
};
