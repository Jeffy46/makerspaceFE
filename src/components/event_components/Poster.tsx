import { type Event } from "../../interfaces/Event";
import Countdown from "../Countdown";
import loadingGif from "../../assets/loading.gif";

let Arrow = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 10"
    className="inline-block w-6 h-2.5 ml-2 fill-current transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
  >
    <path d="M0 4h20L16 .5 17 0l6.5 5L17 10l-1-.5L20 6H0z" />
  </svg>
);

let Poster = ({
  e,
  featured = false,
  notHomepage,
  loading,
}: {
  e?: Event;
  featured?: boolean;
  notHomepage: boolean;
  loading: boolean;
}) => {
  const ready = !loading && !!e;
  const date = e ? new Date(e.event_time) : null;
  const validDate = date !== null && !Number.isNaN(date.getTime());

  // No link while loading (the old empty href pointed at the current page).
  const Wrapper = ready ? "a" : "div";
  const wrapperProps = ready
    ? { href: e.event_link, target: "_blank", rel: "noopener noreferrer" }
    : { "aria-hidden": true };

  return (
    <Wrapper
      {...wrapperProps}
      className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-sbu-navy-blue"
    >
      <figure
        className={`${notHomepage ? "bg-sbu-light-gray" : "bg-sbu-light-gray"} flex h-full flex-col border border-b-4 border-r-4 border-gray-200 p-3 shadow-sm`}
      >
        <div
          className={`flex items-center relative overflow-hidden bg-gray-100 md:min-h-0 md:flex-1`}
        >
          <div className="h-60 w-full flex items-center">
            <img
              src={ready ? e.event_poster_path : loadingGif}
              alt=""
              className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-60 z-1"
            />
            <img
              className={`lg:aspect-[21/9] transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none z-2 ${
                ready ? "object-cover" : "object-scale-down"
              }`}
              src={ready ? e.event_poster_path : loadingGif}
              alt={
                ready
                  ? `Workshop flyer for event titled ${e.title} poster image`
                  : ""
              }
              loading={featured ? "eager" : "lazy"}
            />
          </div>

          {featured && ready && (
            <span className="absolute left-2 top-2 z-10 bg-sbu-bright-red px-2 py-1 text-sm font-bold text-white">
              Next up
            </span>
          )}
        </div>

        <figcaption className="mt-3 flex items-start gap-3">
          {ready && validDate && (
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center bg-sbu-navy-blue leading-none text-white">
              <span className="text-xs font-semibold">
                {date.toLocaleDateString(undefined, { month: "short" })}
              </span>
              <span className="text-xs font-bold">{date.getDate()}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p
              className={`${featured ? "text-lg" : "text-sm"} line-clamp-2 font-bold leading-snug text-sbu-navy-blue`}
            >
              {e?.title}
            </p>
            {ready && validDate && (
              <time
                dateTime={e.event_time}
                className="mt-0.5 block text-xs text-sbu-navy-blue"
              >
                {`${date.toLocaleDateString(undefined, { weekday: "long" })}, ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
              </time>
            )}
            <div className="mt-1 text-xs text-sbu-navy-blue">
              <Countdown event_time={e?.event_time ?? ""} />
            </div>
          </div>
          {ready && (
            <span className="flex shrink-0 items-center pt-1 text-sbu-navy-blue">
              <Arrow />
              <span className="sr-only">(opens in new tab)</span>
            </span>
          )}
        </figcaption>
      </figure>
    </Wrapper>
  );
};

export default Poster;
