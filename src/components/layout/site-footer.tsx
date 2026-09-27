import Link from "next/link";
import { Mail } from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import {
  FacebookIcon,
  InstagramIcon,
  ThreadsIcon,
  TiktokIcon,
  WhatsappIcon,
} from "@/components/brand/social-icons";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { footerNav, siteConfig, socialLinks } from "@/data/site";

const socialIcons: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  instagram: InstagramIcon,
  whatsapp: WhatsappIcon,
  mail: Mail,
  threads: ThreadsIcon,
  tiktok: TiktokIcon,
  facebook: FacebookIcon,
};

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-line bg-canvas-deep/60">
      <Container className="py-14 lg:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5 lg:col-span-4">
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              {siteConfig.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {socialLinks.map((social) => {
                const Icon = socialIcons[social.icon] ?? Mail;
                const tile =
                  "inline-flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft";
                const label = `${social.label} — ${social.handle}`;

                // Facebook has a page name but no URL yet, so it stays a
                // plain tile rather than a link that goes nowhere.
                if (!social.href) {
                  return (
                    <span key={social.label} className={tile} title={label}>
                      <Icon className="size-[1.125rem]" aria-hidden />
                      <span className="sr-only">{label}</span>
                    </span>
                  );
                }

                const external = social.href.startsWith("http");
                return (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={label}
                    {...(external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className={`${tile} transition-colors hover:border-brand/40 hover:bg-brand-soft hover:text-brand-ink`}
                  >
                    <Icon className="size-[1.125rem]" aria-hidden />
                  </a>
                );
              })}
            </div>
          </div>

          {footerNav.map((group) => (
            <nav key={group.title} className="md:col-span-3 lg:col-span-2" aria-label={group.title}>
              <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink">
                {group.title}
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="md:col-span-12 lg:col-span-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-ink">
              Hubungi Kami
            </h2>
            <div className="mt-4 space-y-3 text-sm text-muted">
              <p>
                <a
                  href={`mailto:${siteConfig.email}`}
                  className="font-semibold text-ink transition-colors hover:text-brand"
                >
                  {siteConfig.email}
                </a>
              </p>
              <p className="leading-relaxed">
                Area kegiatan:{" "}
                <span className="font-semibold text-ink">{siteConfig.serviceArea}</span>
                <br />
                Lokasi berpindah mengikuti jadwal tiap kelas.
              </p>
              <p className="text-xs">{siteConfig.officeHours}</p>
              <p className="text-xs leading-relaxed">
                Pertanyaan paling cepat dijawab lewat direct message Instagram{" "}
                <a
                  href="https://instagram.com/kelasbermain.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-brand hover:underline"
                >
                  @kelasbermain.id
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {siteConfig.name}. Seluruh hak cipta dilindungi.
          </p>
          <p>Dibangun untuk komunitas belajar di Indonesia.</p>
        </div>
      </Container>
    </footer>
  );
}
