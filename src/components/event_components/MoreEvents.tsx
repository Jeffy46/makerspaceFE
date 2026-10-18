import { useEffect, useState } from "react";
import { type Event } from "../../interfaces/Event";
import Poster from "./Poster";

let MoreEvents = () => {
  let [otherEvents, setOtherEvents] = useState<Event[]>([]);
  let [pastEvents, setPastEvents] = useState<Event[]>([]);
  let [loading, setLoading] = useState(true);
  let notHomepage = location.pathname.endsWith("/workshops");

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
    <section className="bg-white/20 px-6 md:px-8 md:pb-12 pt-0 pb-8">
      
        <div className="container mx-auto">
        {(otherEvents.length > 0) && (<h3
          className="text-2xl font-bold text-sbu-navy-blue p-2 pl-4 bg-sbu-medium-gray mb-8"
          id="other-upcoming-events-heading"
        >
          Other Upcoming Events
        </h3>
        )}
        <section aria-labelledby="other-upcoming-Events-heading">
          {(loading || otherEvents.length > 0) && (
            <div className="mb-12 ">
              <div className="grid grid-cols-1 gap-5  lg:grid-cols-3">
                {upcomingToShow.map((e, i) => (
                  <Poster
                    key={e?.event_id ?? i}
                    e={e}
                    notHomepage={notHomepage}
                    loading={false}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="past-Events-heading">
          {(pastEvents.length > 0) && (<h3
            className="text-2xl font-bold p-2 pl-4 text-sbu-navy-blue bg-sbu-medium-gray mb-8"
            id="past-events-heading"
          >
            Past Events
          </h3>)}
          {(loading || pastEvents.length > 0) && (
            <div className="">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                {pastToShow.map((e, i) => (
                  <Poster
                    key={e?.event_id ?? i}
                    e={e}
                    notHomepage={notHomepage}
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
