import { githubTarget } from "@/lib/photo-publish";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";
import { profile } from "@/lib/content";
import { PHOTO_LIMITS } from "@/lib/image-validate";
import { Container, PageHeader } from "@/components/ui";
import { PhotoStudio } from "@/components/admin/photo-studio";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Photo Studio", robots: { index: false, follow: false } };

export default async function PhotoStudioPage() {
  if (!verifySession((await cookies()).get(ADMIN_COOKIE)?.value)) redirect("/admin/login");
  return (
    <>
      <PageHeader eyebrow="Admin · Photo Studio" title="Profile photo" description="Upload, crop and preview a new profile photo. Enhancement and publishing only run when you ask, and publishing always needs your confirmation." />
      <Container>
        <PhotoStudio
          current={profile.photo.src}
          limits={{ maxMB: PHOTO_LIMITS.maxBytes / 1048576, minSide: PHOTO_LIMITS.minSide }}
          enhancerConfigured={Boolean(process.env.PHOTO_ENHANCER_URL)}
          publishConfigured={githubTarget() !== null}
        />
      </Container>
    </>
  );
}
