import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Organization Dashboard | TransHere',
    description: 'Manage your organization models',
    robots: 'noindex, nofollow',
};

export default function OrganizationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
