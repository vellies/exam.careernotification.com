const FOOTER_COLUMNS: { title: string; links: { label: string; href?: string }[] }[] = [
  {
    title: "Exams",
    links: [{ label: "TNPSC" }, { label: "SSC" }, { label: "Banking" }, { label: "Railway" }],
  },
  {
    title: "Content",
    links: [{ label: "Test Series" }, { label: "Current Affairs" }, { label: "Previous Papers" }, { label: "Daily Quiz" }],
  },
  {
    title: "Company",
    links: [
      { label: "About" },
      { label: "Contact Us", href: "/contact" },
      { label: "Privacy Policy" },
      { label: "Terms and Conditions", href: "/terms" },
    ],
  },
];

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div>
            <p className="text-base font-bold tracking-tight">
              VR TEST BATCH
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Exam-ready practice for TNPSC, SSC, Banking and school syllabus.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-sm font-semibold tracking-wide text-foreground/90">
                {column.title}
              </p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.href ? (
                      <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                        {link.label}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} VR TEST BATCH. All rights
            reserved.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground">
            <Link href="/" className="hover:text-foreground">
              Public Site
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
