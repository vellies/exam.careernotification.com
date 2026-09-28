import { Mail, Phone, Clock } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Contact Us | VR TEST BATCH" };

// TODO: replace with your real contact details.
const CONTACT = {
  email: "support@example.com",
  phone: "+91 00000 00000",
  hours: "Monday – Saturday, 10:00 AM – 6:00 PM IST",
};

export default function ContactPage() {
  const items = [
    { icon: Mail, label: "Email", value: CONTACT.email, href: `mailto:${CONTACT.email}` },
    { icon: Phone, label: "Phone", value: CONTACT.phone, href: `tel:${CONTACT.phone.replace(/\s/g, "")}` },
    { icon: Clock, label: "Support hours", value: CONTACT.hours },
  ];

  return (
    <PageShell
      eyebrow="Get in touch"
      title="Contact Us"
      description="Questions about a test series, a payment or your account? Reach out and we'll get back to you."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map(({ icon: Icon, label, value, href }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5">
            <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <p className="mt-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {label}
            </p>
            {href ? (
              <a href={href} className="mt-1 block text-sm font-medium hover:text-primary">
                {value}
              </a>
            ) : (
              <p className="mt-1 text-sm font-medium">{value}</p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">
        For payment queries, please include the phone number and payment reference you used when
        requesting access so we can find your purchase quickly.
      </p>
    </PageShell>
  );
}
