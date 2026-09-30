type Announcement = {
  id: number;
  date: string; // ISO date, e.g. "2025-10-24"
  title: string;
  body: string;
};

// Placeholder content - replace with real data (or fetch it).
const announcements: Announcement[] = [
  {
    id: 1,
    date: "2025-10-24",
    title: "New Resin Printers in The Space",
    body: "We've just installed two new Formlabs resin printers. Training sessions start next week.",
  },
  {
    id: 2,
    date: "2025-10-20",
    title: "Guest Speaker: Sustainable Making",
    body: "Join us in the Innovation Lab for a talk by alumni engineer Sarah Chen on recycled filaments.",
  },
  {
    id: 3,
    date: "2025-10-20",
    title: "Guest Speaker: Sustainable Making",
    body: "Join us in the Innovation Lab for a talk by alumni engineer Sarah Chen on recycled filaments.",
  },
  {
    id: 4,
    date: "2025-10-20",
    title: "Guest Speaker: Sustainable Making",
    body: "Join us in the Innovation Lab for a talk by alumni engineer Sarah Chen on recycled filaments.",
  },
  {
    id: 5,
    date: "2025-10-20",
    title: "Guest Speaker: Sustainable Making",
    body: "Join us in the Innovation Lab for a talk by alumni engineer Sarah Chen on recycled filaments.",
  },
  {
    id: 6,
    date: "2025-10-20",
    title: "Guest Speaker: Sustainable Making",
    body: "Join us in the Innovation Lab for a talk by alumni engineer Sarah Chen on recycled filaments.",
  },
];

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

let Announcements = () => {
  return (
    <section
      id="announcements"
      aria-labelledby="announcements-heading"
      className="bg-white/20 px-6 py-12 md:px-8 md:py-16"
    >
      <div className="container mx-auto">
        <div className="border-b border-gray-200 pb-4 mb-8 bg-white border-b-4 border-r-4">
          <h2
            id="announcements-heading"
            className="flex items-center text-3xl md:text-4xl font-bold text-sbu-navy-blue"
          >
            <i
              className="fa-solid fa-bullhorn mr-3 text-sbu-bright-red"
              aria-hidden="true"
            ></i>
            Announcements
          </h2>
        </div>

        <div
          role="status"
          className="mb-8 flex items-start border-l-4 border-yellow-400 bg-yellow-50 p-4 shadow-sm"
        >
          <i
            className="fa-solid fa-exclamation-circle mt-0.5 mr-3 text-yellow-600"
            aria-hidden="true"
          ></i>
          <p className="text-sm text-yellow-800">
            <span className="font-bold">Holiday Hours:</span> All labs will
            close at 4 PM this Friday for the holiday weekend.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {announcements.map((a) => (
            <article
              key={a.id}
              className="border-b-4 border-r-4 border-gray-200 bg-white p-5 shadow-sm"
            >
              <time dateTime={a.date} className="text-sm text-gray-500">
                {formatDate(a.date)}
              </time>
              <h3 className="mt-1 text-lg font-bold text-sbu-navy-blue">
                {a.title}
              </h3>
              <p className="mt-2 text-gray-600">{a.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
export default Announcements;
