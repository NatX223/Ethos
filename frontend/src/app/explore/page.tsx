import { Metadata } from 'next';
import { ExplorePage } from '~/components/ExplorePage';
import { APP_NAME, APP_DESCRIPTION } from '~/lib/constants';

export const metadata: Metadata = {
  title: `Explore Timelines - ${APP_NAME}`,
  description: APP_DESCRIPTION,
};

export default function ExplorePageRoute() {
  return <ExplorePage />;
} 