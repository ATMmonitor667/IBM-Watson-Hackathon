import type { ComponentPropsWithoutRef } from "react";

/**
 * AppImage — the one place this project renders a raw <img>, and the one place
 * that decision is explained. Issue #43 / E6.
 *
 * WHY NOT next/image
 *
 * `@next/next/no-img-element` is right in general and wrong for every image
 * this app currently shows. All of them come from sources next/image cannot
 * optimise without configuration that does not exist yet:
 *
 *   • Character uploads are `data:` URLs read from a local File before any
 *     upload happens. next/image cannot optimise a data URL at all — it
 *     requires `unoptimized`, which makes <Image> a more expensive <img>.
 *
 *   • Scene panels and character references will come from Supabase Storage.
 *     next/image needs those hosts declared in `images.remotePatterns` in
 *     next.config.ts, and that value cannot be written until a real Supabase
 *     project exists. A wrong pattern fails at runtime, not at build time.
 *
 *   • The seeded demo art is small local SVG. next/image does not optimise SVG
 *     (it passes it through), so there is nothing to gain.
 *
 * Suppressing the rule in five separate components would scatter that reasoning
 * and guarantee the next person adds a sixth. One wrapper keeps the decision
 * reviewable and gives a single place to swap in <Image> later.
 *
 * WHEN TO REPLACE THIS
 *
 * Once Supabase Storage is live (issue #9 / B1) and the bucket host is known,
 * add `images.remotePatterns` to next.config.ts and change the internals of
 * this component. Every caller keeps working — that is the point of it being a
 * component rather than five disable comments.
 */
type AppImageProps = ComponentPropsWithoutRef<"img"> & {
  /**
   * Required, not optional as it is on <img>.
   *
   * Spreading props through a wrapper hides `alt` from jsx-a11y, so the linter
   * can no longer catch a missing one at the call site. Making it required here
   * moves that check to the type system, which is stricter than the lint rule
   * it replaces — pass `alt=""` deliberately for decorative images.
   */
  alt: string;
};

export function AppImage({ alt, ...rest }: AppImageProps) {
  // eslint-disable-next-line @next/next/no-img-element -- see the note above.
  return <img alt={alt} {...rest} />;
}
