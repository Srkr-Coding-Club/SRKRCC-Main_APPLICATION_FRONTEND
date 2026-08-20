import { MetadataRoute } from 'next';
import { fetchApi } from '@/lib/api-client';
import { Form } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://srkrcc.com';

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/events`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/hackathons`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/iconcoders`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/codequest`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/career`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/forms`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  let formRoutes: MetadataRoute.Sitemap = [];
  try {
    const forms = await fetchApi<Form[]>('/forms/');
    if (forms && Array.isArray(forms)) {
      formRoutes = forms
        .filter((f) => f.status === 'PUBLISHED')
        .map((f) => ({
          url: `${baseUrl}/forms/${f.slug}`,
          lastModified: f.updated_at ? new Date(f.updated_at) : new Date(),
          changeFrequency: 'weekly' as const,
          priority: 0.7,
        }));
    }
  } catch {
    // Fallback if backend offline during build
  }

  return [...staticRoutes, ...formRoutes];
}
