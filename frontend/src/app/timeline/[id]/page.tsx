import { Metadata } from 'next';
import { TimelineView } from '~/components/timeline/TimelineView';
import { APP_NAME, APP_DESCRIPTION } from '~/lib/constants';

export const metadata: Metadata = {
  title: `Timeline | ${APP_NAME}`,
  description: APP_DESCRIPTION,
};

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TimelineView timelineId={id} />;
}