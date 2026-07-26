import type { ReactNode } from "react";

interface PhoneFrameProps {
  children: ReactNode;
  /** Rendered outside the scroll area, pinned to the top of the frame. */
  header?: ReactNode;
  /** Rendered outside the scroll area, pinned to the bottom of the frame. */
  footer?: ReactNode;
}

/**
 * Full viewport on phones. From `lg` up, a 414 x min(896px, 92vh) rounded
 * handset centred on a warm backdrop, with the app scrolling inside it.
 */
export function PhoneFrame({ children, header, footer }: PhoneFrameProps) {
  return (
    <div className="min-h-dvh bg-canvas lg:grid lg:min-h-dvh lg:place-items-center lg:bg-page lg:p-8">
      <div
        className={[
          "flex h-dvh w-full flex-col overflow-hidden bg-canvas",
          "lg:h-[min(896px,92vh)] lg:w-[414px] lg:rounded-[2.5rem]",
          "lg:border lg:border-line lg:shadow-frame",
        ].join(" ")}
      >
        {header}
        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}
