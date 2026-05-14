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
 *     panel open on click. Same top-left anchor on every viewport
 *     — the pill is small enough that it doesn't conflict with the
 *     mobile bottom-sheet expanded state.
 *   - **Expanded (≥768 px / desktop, M3 C1-C5):** anchored top-left
 *     in place of the pill. Paper-toned chrome with line-toned
 *     border + soft shadow, ~280 px wide. Top row carries the
 *     pill-equivalent count + an `×` close button. Body groups
 *     layer rows into 3 editorial sections (Dane / Otoczenie /
 *     Analiza terenu).
 *   - **Expanded (<768 px / mobile, M3 C6):** anchored to the
 *     bottom of the viewer container as a full-width bottom-sheet.
 *     Top corners rounded (`rounded-t-md`), bottom flush with the
 *     viewer edge. Capped at `max-h-[70vh]` with
 *     `overflow-y-auto overscroll-contain` so the panel scrolls
 *     internally without chaining into page scroll. Same chrome,
 *     header, and section grouping as desktop — the breakpoint is
 *     purely a positioning + sizing variant, not a content variant.
 *     Dismissal works through the same click-outside + Escape
 *     listeners as desktop; no separate backdrop, matching the
 *     "informational chrome, not app-like control center"
 *     constraint.
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
import type { LayerSectionKey, OverlayLayer } from "@/lib/overlays/types";

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
 * C4 — section editorial order + titles. The order itself is the
 * information architecture: plot-self (`dane`) reads first as the
 * page's foreground subject, navigable context (`otoczenie`) second
 * as anchoring, and derived analysis (`analiza`) third as
 * interpretation built on top of the other two. Empty sections are
 * hidden by the grouping helper so a future section key without any
 * registered layers (e.g. M4 `"sąsiedzi"` neighbour-envelopes
 * registered behind a Phase B feature flag) doesn't render a bare
 * header.
 */
const SECTION_ORDER: ReadonlyArray<LayerSectionKey> = [
  "dane",
  "otoczenie",
  "analiza",
];
const SECTION_TITLES: Record<LayerSectionKey, string> = {
  dane: "Dane działki",
  otoczenie: "Otoczenie",
  analiza: "Analiza terenu",
};

/** Grouped section payload consumed by the panel's section iterator. */
export interface LayerPanelSection {
  readonly key: LayerSectionKey;
  readonly title: string;
  readonly layers: ReadonlyArray<OverlayLayer>;
}

/**
 * Group a flat layer list into editorial-ordered sections. Pure
 * function — exported so the C4 grouping behaviour (section order
 * stability, empty-section filtering, per-section layer order) is
 * unit-testable in vitest's `node` env without a DOM. Per-section
 * layer order is the input list's insertion order (matches
 * `LayerRegistry.getAll()`).
 */
export function groupLayersIntoSections(
  layers: ReadonlyArray<OverlayLayer>,
): LayerPanelSection[] {
  return SECTION_ORDER
    .map((key) => ({
      key,
      title: SECTION_TITLES[key],
      layers: layers.filter((l) => l.section === key),
    }))
    .filter((group) => group.layers.length > 0);
}

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
  //
  // C6 — responsive positioning. Collapsed pill anchors at top-left
  // on every viewport. Expanded panel splits at the Tailwind `md:`
  // breakpoint (768 px) — the same threshold the M3 brief calls
  // out for the mobile bottom-sheet. Below 768 px the wrapper
  // releases its top-left anchor and re-anchors to the bottom edge
  // of the viewer container (`inset-x-0 bottom-0`); the inner card
  // takes full width with top-rounded corners. At ≥ 768 px the
  // `md:` overrides restore the M3 C1-C5 desktop positioning so no
  // visual regression lands for the existing ack.
  return (
    <div
      ref={panelRef}
      className={
        isExpanded
          ? "absolute inset-x-0 bottom-0 z-[17] md:inset-x-auto md:bottom-auto md:left-3 md:top-3"
          : "absolute left-3 top-3 z-[17]"
      }
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
        // C6 — responsive card. Mobile (<768 px): full-width
        // bottom-sheet, top corners rounded, capped at 70vh with
        // internal scroll + overscroll-contain so the panel
        // doesn't chain into page scroll. Desktop (≥768 px):
        // restores the M3 C1-C5 280 px fully-rounded card. No
        // separate mobile backdrop — click-outside + Escape are
        // the only dismissals, consistent with the desktop branch.
        <div
          className="w-full max-h-[70vh] overflow-y-auto overscroll-contain rounded-t-md border border-line bg-paper shadow-card md:w-[280px] md:max-h-none md:overflow-visible md:rounded-md"
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
            {/* C4 — data-driven 3-section grouping. Sections render in
                editorial order (dane → otoczenie → analiza); empty
                sections are filtered out upstream by
                `groupLayersIntoSections` so a future feature-flagged
                section without any layers doesn't render a bare
                header. Bucket #1 editorial call: pure whitespace
                between sections (no line divider) — the JetBrains
                Mono headers in clay/70 are visual anchor enough, and
                a line divider here would push the panel toward the
                app-like control-center posture the brief rules out.
                Row indentation: none — layers read as editorial peers
                under their section header, alignment-matched to the
                header's left edge. */}
            {groupLayersIntoSections(layers).map((group, idx) => (
              <section
                key={group.key}
                className={idx > 0 ? "mt-5" : ""}
                data-testid={`layer-panel-section-${group.key}`}
              >
                <h3 className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-clay/70">
                  {group.title}
                </h3>
                {group.layers.map((layer) => (
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
 *
 * Locked variant (M3 C3 — `layer.locked === true`): renders as a
 * `<div>` (not button), shows an em-dash glyph in `clay/50` instead
 * of `●`/`○`, surfaces an italic "zawsze widoczne" disclosure under
 * the layer name, and carries `aria-disabled` + `tabIndex=-1` so
 * keyboard nav skips the row. The em-dash glyph closes the dot
 * vocabulary (●/○) with a third quiet member that reads as "fixed
 * / line drawn through" rather than a third interactive state —
 * deliberately NOT a 🔒 emoji (forbidden by the no-fallback
 * constraints) and NOT a new icon family.
 */
function LayerRow({
  layer,
  onToggle,
}: {
  layer: OverlayLayer;
  onToggle: () => void;
}) {
  if (layer.locked) {
    return (
      <div
        className="flex w-full items-center justify-between rounded-xs py-1.5 pl-1 pr-2"
        aria-disabled
        tabIndex={-1}
        data-testid={`layer-panel-row-${layer.id}`}
        data-locked="true"
      >
        <span className="flex flex-col">
          <span className="text-[13px] text-ink-body">{layer.name}</span>
          <span className="mt-0.5 font-mono text-[10px] italic tracking-[0.04em] text-ink-faint">
            zawsze widoczne
          </span>
        </span>
        <span
          className="font-mono text-[11px] text-clay/50"
          aria-hidden
          data-testid={`layer-panel-row-glyph-${layer.id}`}
        >
          —
        </span>
      </div>
    );
  }
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
