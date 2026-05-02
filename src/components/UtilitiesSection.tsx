import type { Utilities } from "@/types/plot";

interface UtilitiesSectionProps {
  utilities: Utilities;
}

const items: {
  key: keyof Utilities;
  label: string;
  icon: JSX.Element;
}[] = [
  {
    key: "electricity",
    label: "Prąd",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" />
      </svg>
    ),
  },
  {
    key: "water",
    label: "Woda",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12 2.25c-.414 0-.75.336-.75.75v.75a.75.75 0 01-1.5 0V3a.75.75 0 00-1.5 0v10.5a5.25 5.25 0 1010.5 0V3a.75.75 0 00-1.5 0v.75a.75.75 0 01-1.5 0V3a.75.75 0 00-.75-.75h-3z" />
      </svg>
    ),
  },
  {
    key: "gas",
    label: "Gaz",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M12.963 2.286a.75.75 0 00-1.071-.136 9.742 9.742 0 00-3.539 6.176 7.547 7.547 0 01-1.705-1.715.75.75 0 00-1.152-.082A9 9 0 1015.68 4.534a7.46 7.46 0 01-2.717-2.248z" />
      </svg>
    ),
  },
  {
    key: "sewage",
    label: "Kanalizacja",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M3 6.75A.75.75 0 013.75 6h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 6.75zm0 5.25A.75.75 0 013.75 11.25h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 12zm.75 4.5a.75.75 0 000 1.5h16.5a.75.75 0 000-1.5H3.75z" />
      </svg>
    ),
  },
  {
    key: "internet",
    label: "Internet",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M21.721 12.752a9.711 9.711 0 00-.945-5.003 12.754 12.754 0 01-4.339 2.708 18.991 18.991 0 01-.214 4.772 17.165 17.165 0 005.498-2.477zM14.634 15.55a17.324 17.324 0 00.332-4.647c-.952.227-1.945.347-2.966.347-1.021 0-2.014-.12-2.966-.347a17.515 17.515 0 00.332 4.647 17.385 17.385 0 005.268 0zM9.772 17.119a18.963 18.963 0 004.456 0A17.182 17.182 0 0112 21.724a17.18 17.18 0 01-2.228-4.605zM7.777 15.23a18.87 18.87 0 01-.214-4.774 12.753 12.753 0 01-4.34-2.708 9.711 9.711 0 00-.944 5.004 17.165 17.165 0 005.498 2.478zM21.356 14.752a9.765 9.765 0 01-7.478 6.817 18.64 18.64 0 001.988-4.718 18.627 18.627 0 005.49-2.098zM2.644 14.752c1.682.971 3.53 1.688 5.49 2.099a18.64 18.64 0 001.988 4.718 9.765 9.765 0 01-7.478-6.816zM13.878 2.43a9.755 9.755 0 016.116 3.986 11.267 11.267 0 01-3.746 2.504 18.63 18.63 0 00-2.37-6.49zM12 2.276a17.152 17.152 0 012.805 7.121c-.897.23-1.837.353-2.805.353-.968 0-1.908-.122-2.805-.353A17.151 17.151 0 0112 2.276zM10.122 2.43a18.629 18.629 0 00-2.37 6.49 11.266 11.266 0 01-3.746-2.504 9.754 9.754 0 016.116-3.985z" />
      </svg>
    ),
  },
  {
    key: "road",
    label: "Dojazd",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
        <path d="M8.25 18.75a1.5 1.5 0 01-3 0V5.625a.75.75 0 011.5 0v13.125zM13.5 18.75a1.5 1.5 0 01-3 0V5.625a.75.75 0 011.5 0v13.125zM18.75 18.75a1.5 1.5 0 01-3 0V5.625a.75.75 0 011.5 0v13.125z" />
      </svg>
    ),
  },
];

export function UtilitiesSection({ utilities }: UtilitiesSectionProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(({ key, label, icon }) => {
        const u = utilities[key];
        return (
          <div
            key={key}
            className="rounded-xl border border-graphite-100 bg-white p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    u.available
                      ? "bg-brand-50 text-brand-700"
                      : "bg-graphite-100 text-graphite-500"
                  }`}
                >
                  {icon}
                </span>
                <div>
                  <div className="text-sm font-semibold text-graphite-900">
                    {label}
                  </div>
                  <div
                    className={`text-xs font-medium ${
                      u.available ? "text-brand-700" : "text-graphite-500"
                    }`}
                  >
                    {u.available ? "Dostępne" : "Wymaga rozwiązania"}
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-graphite-600">
              {u.note}
            </p>
          </div>
        );
      })}
    </div>
  );
}
