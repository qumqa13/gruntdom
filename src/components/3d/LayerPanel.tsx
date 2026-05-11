/**
 * ADR-0006 M3 — Layer control panel UI.
 *
 * User-facing toggle UI for the LayerRegistry's 6 active overlays
 * (and any future M4+ additions). Builds on top of the registry's
 * `subscribe` channel from M2.5-B + the dispatcher exhaustiveness
 * from M2.7 — no foundation changes, pure UI + state-binding.
 *
 * Two states:
 *   - **Collapsed (default):** the M2.7 C6 indicator pill, now
 *     clickable. Reads "{n} {pluralized-nakładka}" and toggles the
 *     panel open on click.
 *   - **Expanded:** anchored top-left in place of the pill. Paper-
 *     toned chrome with line-toned border + soft shadow, ~280 px
 *     wide. Top row carries the pill-equivalent count + an `×`
 *     close button. Body groups layer rows into 3 editorial
 *     sections (Dane / Otoczenie / Analiza terenu, landing in C4).
 *
 * Behavioural state (post-C2): row clicks call
 * `registry.setVisible(layer.id, !layer.visible)`. The same
 * `subscribe` channel that drives the count display also drives the
 * row glyph re-render, so the write path and the read path share a
 * single round-trip through the registry — no local React state
 * mirrors the visibility flag at the row level.
 *
 * Editorial constraints (locked by milestone brief):
 *   - NO shadcn / Lucide / emoji / glassmorphism / gradients /
 *     bouncy springs.
 *   - Text glyphs only: ● (visible), ○ (hidden in C2+), × (close),
 *     "—" (locked in C3+).
 *   - Paper / ink / clay / moss palette only.
 *   - JetBrains Mono for section headers + counts; default body
 *     font for layer names (inherits from globals.css).
 *   - All UI strings in Polish.
 *   - Panel is informational chrome, not an app-like control
 *     center — restraint > affordance.
 */

"use client";

import { useEffect, useRef, useState } from "react";

import type { LayerRegistry } from "@/lib/overlays/LayerRegistry";
import type { OverlayLayer } from "@/lib/overlays/types";

/**
 * Polish pluralisation helper for "nakładka" with a "aktywna" agreement.
 *
 *   - 1 → singular nominative ("1 nakładka aktywna")
 *   - 2-4 (except 12-14) → "few" form nominative-plural ("3 nakładki
 *     aktywne")
 *   - everything else (0, 5+, teens 11-19) → genitive-plural ("6
 *     nakładek aktywnych")
 *
 * Exported so the C1 test can verify carve-out branches at n=0 / n=1
 * / n=2 / n=5 / n=11–14 / n=22 without spinning up a viewer.
 */
export function pluralizeNakladka(n: number): string {
  if (n === 1) return "nakładka aktywna";
  const lastDigit = n % 10;
  const lastTwoDigits = n % 100;
  if (
    lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
  ) {
    return "nakładki aktywne";
  }
  return "nakładek aktywnych";
}

const PILL_CLASS_BASE =
  "rounded-xs border border-line/40 bg-paper/95 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-faint";
const PILL_BUTTON_CLASS = `${PILL_CLASS_BASE} cursor-pointer transition-colors duration-150 hover:bg-paper hover:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50`;

/**
 * The 3-section grouping arrives in C4. C1 ships a single placeholder
 * section so the visual shape is testable while toggle wiring is
 * still parked. Order matters editorially: matches the C4 spec
 * (Dane → Otoczenie → Analiza) so the C1 ack pass can already read
 * the intended information architecture.
 */
const PLACEHOLDER_SECTION_TITLES = [
  "Dane działki",
  "Otoczenie",
  "Analiza terenu",
] as const;

export interface LayerPanelProps {
  /**
   * Source of truth. When `null` (pre-init or post-teardown), the
   * panel renders nothing — the viewer's loading skeleton occupies
   * the same screen region.
   */
  registry: LayerRegistry | null;
}

export function LayerPanel({ registry }: LayerPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // Mirror of `registry.getAll()` kept in component state so React
  // re-renders pick up registry mutations (visibility flips in C2,
  // future M4+ additions). The subscribe channel is the bridge; the
  // initial seed happens on mount so the panel doesn't flash empty
  // before the first notification.
  const [layers, setLayers] = useState<OverlayLayer[]>([]);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!registry) {
      setLayers([]);
      return;
    }
    setLayers(registry.getAll());
    const unsubscribe = registry.subscribe(() => {
      setLayers(registry.getAll());
    });
    return unsubscribe;
  }, [registry]);

  // Click-outside + ESC collapse. Listener only attached while
  // expanded so the collapsed pill's own click (which lands on the
  // pill button) doesn't accidentally fire the outside-click branch
  // immediately after expanding.
  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsExpanded(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current && panelRef.current.contains(target)) return;
      setIsExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isExpanded]);

  if (!registry || layers.length === 0) {
    return null;
  }

  const visibleCount = layers.filter((l) => l.visible).length;
  const countLabel = `${visibleCount} ${pluralizeNakladka(visibleCount)}`;

  // Z-stack: above the M2.5-D activation gate (`z-[15]`) + the
  // reset button (`z-[16]`) so the user can toggle layers without
  // first activating the camera; below the loading overlay
  // (`z-[20]`) since layer toggling is meaningless while terrain
  // tiles are still streaming.
  return (
    <div
      ref={panelRef}
      className="absolute left-3 top-3 z-[17]"
      data-testid="layer-panel"
      data-state={isExpanded ? "expanded" : "collapsed"}
    >
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className={PILL_BUTTON_CLASS}
          aria-label="Otwórz panel nakładek"
          aria-expanded="false"
          data-testid="layer-panel-trigger"
        >
          {countLabel}
        </button>
      ) : (
        <div
          className="w-[280px] rounded-md border border-line bg-paper shadow-card"
          role="dialog"
          aria-label="Panel nakładek"
        >
          <header className="flex items-center justify-between border-b border-line-soft px-3 py-2.5">
            <span
              className={PILL_CLASS_BASE}
              data-testid="layer-panel-count"
            >
              {countLabel}
            </span>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex h-6 w-6 items-center justify-center rounded-xs font-mono text-base leading-none text-ink-muted transition-colors duration-150 hover:bg-paper-soft hover:text-ink-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50"
              aria-label="Zamknij panel nakładek"
              data-testid="layer-panel-close"
            >
              ×
            </button>
          </header>
          <div className="px-3 py-3">
            {PLACEHOLDER_SECTION_TITLES.map((title, idx) => (
              <section
                key={title}
                className={idx > 0 ? "mt-4" : ""}
                data-testid={`layer-panel-section-${idx}`}
              >
                <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-clay/70">
                  {title}
                </h3>
                {/* C1 placeholder — all 6 layers stack under the
                    first section so the visual shape is testable
                    without committing to the C4 grouping. C4
                    splits the rows across the three sections. */}
                {idx === 0 &&
                  layers.map((layer) => (
                    <LayerRow
                      key={layer.id}
                      layer={layer}
                      onToggle={() =>
                        registry.setVisible(layer.id, !layer.visible)
                      }
                    />
                  ))}
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Single layer row. Renders as a full-width `<button>` so the entire
 * row is the click target — the visibility glyph is decorative, not
 * an icon button on its own. `aria-pressed` carries the toggle
 * semantic for assistive tech; `aria-label` composes the layer name
 * with a Polish status hint ("widoczne" / "ukryte") so the
 * announcement is self-explanatory without the visual glyph. Glyph
 * choices (●/○) match the editorial dot-indicator language already
 * used in the plakietka status marker at page.tsx line 500 and the
 * viewer's existing typographic vocabulary — no new icon family
 * introduced.
 */
function LayerRow({
  layer,
  onToggle,
}: {
  layer: OverlayLayer;
  onToggle: () => void;
}) {
  const stateHint = layer.visible ? "widoczne" : "ukryte";
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-xs py-1.5 pl-1 pr-2 text-left transition-colors duration-150 hover:bg-paper-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clay/50"
      aria-pressed={layer.visible}
      aria-label={`${layer.name} — ${stateHint}, kliknij aby przełączyć`}
      data-testid={`layer-panel-row-${layer.id}`}
      data-visible={layer.visible ? "true" : "false"}
    >
      <span
        className={`text-[13px] ${layer.visible ? "text-ink-body" : "text-ink-muted"}`}
      >
        {layer.name}
      </span>
      <span
        className={`font-mono text-[11px] ${layer.visible ? "text-clay" : "text-ink-faint"}`}
        aria-hidden
      >
        {layer.visible ? "●" : "○"}
      </span>
    </button>
  );
}
