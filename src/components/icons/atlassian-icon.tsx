import type { SVGProps } from "react";

/**
 * Atlassian brand icon
 * Source: Boxicons v3.0.6 (https://boxicons.com)
 */
export function AtlassianIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      fill="currentColor"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d="M8.3 11.32c-.28-.28-.71-.28-.92.07L3 20.29a.497.497 0 0 0 .42.71h6.22c.21 0 .35-.07.42-.28 1.34-2.76.57-6.92-1.77-9.4ZM11.55 3.26c-2.47 3.96-2.33 8.27-.71 11.52l2.97 5.93c.07.21.28.28.49.28h6.15c.27.03.51-.17.54-.44 0-.09 0-.18-.05-.26L12.4 3.26c-.14-.35-.64-.35-.85 0" />
    </svg>
  );
}

export default AtlassianIcon;
