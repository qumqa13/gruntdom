interface MapPlaceholderProps {
  location: string;
}

export function MapPlaceholder({ location }: MapPlaceholderProps) {
  return (
    <div className="relative h-72 w-full overflow-hidden rounded-xl border border-graphite-100 bg-[linear-gradient(135deg,_#e8f0ea,_#f3f6f2)]">
      {/* dekoracyjna siatka */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(36,85,61,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(36,85,61,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      {/* pinezka */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-40" />
          <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5"
            >
              <path
                fillRule="evenodd"
                d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        </div>
      </div>

      <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/90 px-3 py-2 text-xs text-graphite-700 backdrop-blur">
        <div className="font-medium text-graphite-900">Mapa poglądowa</div>
        <div>
          {location} — integracja z Google Maps / Mapbox w kolejnym etapie.
        </div>
      </div>
    </div>
  );
}
