import type { Metadata } from 'next';
import { fetchApi } from '@/lib/api-client';
import { Form } from '@/lib/types';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const form = await fetchApi<Form>(`/forms/${slug}/`);
    if (form && form.title) {
      return {
        title: form.title,
        description:
          form.description || `Submit your response for ${form.title} on the SRKR Coding Club platform.`,
        openGraph: {
          title: form.title,
          description: form.description || `Official registration form for ${form.title}.`,
          images: form.image_url ? [{ url: form.image_url }] : ['/icon.png'],
        },
        twitter: {
          card: 'summary_large_image',
          title: form.title,
          description: form.description || `Official registration form for ${form.title}.`,
          images: form.image_url ? [form.image_url] : ['/icon.png'],
        },
      };
    }
  } catch {}

  const readableTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    title: `${readableTitle} — Registration`,
    description: `Official registration form for ${readableTitle} on the SRKR Coding Club platform.`,
  };
}

export default function DynamicFormLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
