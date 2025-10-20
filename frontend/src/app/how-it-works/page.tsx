import { Metadata } from 'next';
import HowItWorks from '~/components/HowItWorks';
import { APP_NAME, APP_DESCRIPTION } from '~/lib/constants';

export const metadata: Metadata = {
  title: `How It Works - ${APP_NAME}`,
  description: APP_DESCRIPTION,
};

export default function HowItWorksPage() {
  return <HowItWorks />;
} 