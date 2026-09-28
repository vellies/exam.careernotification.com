import { PageShell } from "@/components/shared/page-shell";

export const metadata = { title: "Terms and Conditions | VR TEST BATCH" };

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    body: "By creating an account or using VR TEST BATCH, you agree to these Terms and Conditions. If you do not agree, please do not use the service.",
  },
  {
    title: "2. Your account",
    body: "You must provide accurate details when signing up and keep your password confidential. You are responsible for all activity under your account. Accounts may not be shared, and we may suspend or disable accounts that are misused.",
  },
  {
    title: "3. Test series and access",
    body: "Free test series are available to registered users. Paid test series are unlocked for your account after your payment request has been reviewed and approved by us. One approved purchase unlocks all tests in that series, subject to the opening and closing dates shown for the series and for each test.",
  },
  {
    title: "4. Payments",
    body: "Payments are made using the methods shown when you request access. Access is granted only after we verify your payment details, which may take some time. Please keep your payment reference safe and contact us if your request is delayed or declined.",
  },
  {
    title: "5. Acceptable use",
    body: "You agree not to copy, share, resell or publish test questions, answers or other content, not to use automated tools to access the service, and not to attempt to disrupt or gain unauthorised access to the platform.",
  },
  {
    title: "6. Content and intellectual property",
    body: "All questions, tests, explanations and materials on VR TEST BATCH are owned by us or our licensors and are provided for your personal exam preparation only.",
  },
  {
    title: "7. Results and accuracy",
    body: "Tests and results are provided for practice. While we work to keep content accurate, we do not guarantee that it is error-free or that using the service will lead to any particular exam result.",
  },
  {
    title: "8. Limitation of liability",
    body: "To the extent permitted by law, VR TEST BATCH is not liable for any indirect or consequential loss arising from your use of, or inability to use, the service.",
  },
  {
    title: "9. Changes to these terms",
    body: "We may update these terms from time to time. Continued use of the service after changes are published means you accept the updated terms.",
  },
  {
    title: "10. Contact",
    body: "For questions about these terms, please visit our Contact Us page.",
  },
];

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms and Conditions"
      description="Please read these terms carefully before using VR TEST BATCH."
    >
      <div className="max-w-3xl space-y-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-base font-bold tracking-tight">{section.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
