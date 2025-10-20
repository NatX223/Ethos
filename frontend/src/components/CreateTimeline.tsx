'use client';

import { useCallback, useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '~/components/ui/Button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { useSession } from 'next-auth/react';
import { signIn, getCsrfToken } from 'next-auth/react';
import sdk from '@farcaster/frame-sdk';
import { HelpCircle, X, Check, Image, Info, Circle } from 'lucide-react';
import { Tooltip } from '~/components/ui/tooltip';
import { TemplatePreview } from './timeline/TemplatePreview';
import { TimelineTemplate } from '~/types/timeline';
import { useRouter } from 'next/navigation';
import { useConnect, useAccount, useWalletClient, useDisconnect } from 'wagmi';
import { config } from '~/components/providers/WagmiProvider';
import { createPublicClient, http, Address, Hex, parseEther } from 'viem';
import { ArrowLeftIcon } from 'lucide-react';
import { base } from 'viem/chains';
import { setApiKey, createCoin, DeployCurrency, InitialPurchaseCurrency, getCoinCreateFromLogs, ValidMetadataURI } from '@zoralabs/coins-sdk';
import { useUserProfile } from '~/components/providers/UserProfileContext';

// Set up Zora API key
setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY!);

interface Tag {
  id: string;
  text: string;
}

interface UserProfile {
  username: string;
  display_name: string;
  pfp_url: string;
  fid: string;
}

interface Cast {
  hash: string;
  text: string;
  timestamp: string;
  author: {
    username: string;
    display_name: string;
    pfp_url: string;
  };
  embeds: Array<{
    url: string;
    metadata?: {
      image?: {
        width_px: number;
        height_px: number;
      };
    };
  }>;
}

interface TimelinePreview {
  id: string;
  name: string;
  template: string;
  creator: {
    username: string;
    display_name: string;
    pfp_url: string;
  };
  casts: Cast[];
  stats: {
    supporterAllocation: string;
    totalSupporters: number;
  };
  tags: string[];
  keywords: string[];
  createdAt: string;
}

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

export function CreateTimeline() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { connect, connectors } = useConnect();
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();
  const { userProfile, setUserProfile } = useUserProfile();
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string>('');
  const [timelineName, setTimelineName] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [keywords, setKeywords] = useState<Tag[]>([]);
  const [supporterAllocation, setSupporterAllocation] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timelinePreview, setTimelinePreview] = useState<TimelinePreview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Create public client
  const publicClient = createPublicClient({
    chain: config.chains[0], // Using the first chain from config (base)
    transport: http("https://mainnet.base.org")
  });

  // Fetch user profile when authenticated, only if not already cached
  useEffect(() => {
    if (userProfile) return;
    const fetchUserProfile = async () => {
      if (!session?.user?.fid) return;
      try {
        const response = await fetch(`/api/user-profile?fid=${session.user.fid}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch user profile: ${response.status}`);
        }
        const data = await response.json();
        if (data.user) {
          setUserProfile({
            username: data.user.username || '',
            display_name: data.user.display_name || '',
            pfp_url: data.user.pfp_url || '',
            fid: session.user.fid,
          });
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };
    if (status === "authenticated") {
      fetchUserProfile();
    }
  }, [session, status, userProfile, setUserProfile]);

  const handleSignIn = useCallback(async () => {
    try {
      const nonce = await getCsrfToken();
      if (!nonce) throw new Error("Unable to generate nonce");
      
      const result = await sdk.actions.signIn({ nonce });
      await signIn("credentials", {
        message: result.message,
        signature: result.signature,
        redirect: false,
      });
      // Instead of connecting directly, show wallet modal
      setShowWalletModal(true);
    } catch (error) {
      console.error('Sign in error:', error);
    }
  }, [connect, connectors]);

  const handleWalletSelect = (index: number) => {
    if (connectors[index]) {
      connect({ connector: connectors[index] });
      setShowWalletModal(false);
    }
  };

  const handleDisconnect = useCallback(() => {
    disconnect();
  }, [disconnect]);

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTag = (type: 'tags' | 'keywords', value: string) => {
    if (!value.trim()) return;
    
    let text = value.trim();
    
    // Handle quoted phrases
    if (text.startsWith('"') && text.endsWith('"')) {
      text = text.slice(1, -1).trim();
    } else if (text.includes('"')) {
      return;
    }
    
    const newTag = {
      id: Math.random().toString(36).substr(2, 9),
      text: text
    };
    
    if (type === 'tags') {
      setTags([...tags, newTag]);
      setTagInput('');
    } else {
      setKeywords([...keywords, newTag]);
      setKeywordInput('');
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, type: 'tags' | 'keywords') => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault();
      handleAddTag(type, e.currentTarget.value);
    }
  };

  const removeTag = (id: string, type: 'tags' | 'keywords') => {
    if (type === 'tags') {
      setTags(tags.filter(tag => tag.id !== id));
    } else {
      setKeywords(keywords.filter(keyword => keyword.id !== id));
    }
  };

  const createZoraCoin = async (metadataUrl: string, timelineName: string, rewardManager: string) => {
    if (!walletClient || !address) {
      console.error('Wallet client or address not available');
      throw new Error('Wallet not connected');
    }

    try {
      const coinParams = {
        name: timelineName,
        symbol: timelineName.substring(0, 3).toUpperCase(),
        uri: metadataUrl as ValidMetadataURI,
        owners: [address as Address],
        payoutRecipient: rewardManager as Address,
        platformReferrer: rewardManager as Address,
        chainId: base.id,
        currency: DeployCurrency.ZORA,
        initialPurchase: { 
          currency: InitialPurchaseCurrency.ETH,
          amount: parseEther("0.0005"),
        },
      };

      console.log('Creating coin with params:', coinParams);
      console.log('connected chain', publicClient.chain)
      const result = await createCoin(coinParams, walletClient, publicClient, {
        gasMultiplier: 120,
      });

      console.log('Coin creation transaction hash:', result.hash);
      console.log('Coin creation result:', result);

      // Get coin address from logs
      const coinDeployment = getCoinCreateFromLogs(result.receipt);
      console.log('Deployed coin address:', coinDeployment?.coin);

      if (!coinDeployment?.coin) {
        throw new Error('Failed to get coin address from deployment logs');
      }

      return coinDeployment.coin;
    } catch (error) {
      console.error('Error in createZoraCoin:', error);
      throw error;
    }
  };

  const handleCreateTimeline = async () => {
    if (!session || !timelineName || !selectedTemplate) return;
    setErrorMsg(null);
    setIsLoading(true);
    try {
      // Prepare FormData with cover image and timeline data
      const formData = new FormData();
      if (coverImage) {
        formData.append('coverImage', coverImage);
      }
      const timelineData = {
        name: timelineName,
        template: selectedTemplate,
        authorAddress: address,
        creator: {
          fid: session.user.fid,
          username: userProfile?.username || session.user.fid.toString(),
          display_name: userProfile?.display_name || '',
          pfp_url: userProfile?.pfp_url || ''
        },
        tags: tags.map(t => t.text),
        keywords: keywords.map(k => k.text),
        supporterAllocation: supporterAllocation || '0'
      };
      formData.append('timelineData', JSON.stringify(timelineData));
      // Call backend API to handle uploads and timeline creation
      const response = await fetch('/api/timelines/create', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Failed to create timeline');
      const { timelineId, metadataUrl, rewardManager } = await response.json();
      // Create Zora coin
      const coinAddress = await createZoraCoin(metadataUrl, timelineName, rewardManager);
      // Update timeline with coin address
      const updateResponse = await fetch(`/api/timelines/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timelineId, coinAddress }),
      });
      if (!updateResponse.ok) throw new Error('Failed to update timeline with coin address');
      // Redirect to the timeline page
      router.push(`/timeline/${timelineId}`);
    } catch (error: any) {
      setErrorMsg(error.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
      <ArrowLeftIcon className="w-7 h-7 text-primary absolute top-6 left-6 cursor-pointer" onClick={() => router.back()} />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm p-8"
        >
          {/* Farcaster Connect Section */}
          {status !== "authenticated" ? (
            <div className="text-center space-y-4 mb-8">
              <h2 className="text-2xl font-bold font-clash">Connect your Farcaster Account</h2>
              <p className="text-gray-600">To create a timeline, please connect your Farcaster account.</p>
              <Button onClick={handleSignIn} variant="primary" className="!w-auto">
                Connect Farcaster
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between mb-8">
              <div 
                className={`flex items-center space-x-3 ${isConnected ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={isConnected ? handleDisconnect : undefined}
              >
                <div className="h-10 w-10 rounded-full overflow-hidden">
                  {userProfile?.pfp_url ? (
                    <img 
                      src={userProfile.pfp_url} 
                      alt={userProfile.display_name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/20" />
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {userProfile?.display_name || 'Loading...'}
                  </p>
                  <p className="text-sm text-gray-500">
                    @{userProfile?.username || session?.user?.fid}
                  </p>
                </div>
                <div className="flex items-center">
                  <Circle 
                    className={`h-2 w-2 ${isConnected ? 'text-green-500' : 'text-red-500'}`} 
                    fill={isConnected ? 'currentColor' : 'currentColor'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cover Image Upload */}
          <div className="space-y-2 mb-6">
            <Label htmlFor="cover-image">Cover Image</Label>
            <div className="flex flex-col items-center">
              <label
                htmlFor="cover-image"
                className={`relative w-full md:w-1/2 aspect-[16/9] rounded-xl border-2 border-dashed border-gray-300 hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center ${
                  coverPreview ? 'bg-transparent' : 'bg-gray-50'
                }`}
              >
                {coverPreview ? (
                  <div className="w-full h-full rounded-xl overflow-hidden">
                    <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <Image className="h-8 w-8 text-gray-400" />
                    <span className="text-sm text-gray-500">Click to upload cover image</span>
                  </div>
                )}
                <input
                  id="cover-image"
                  type="file"
                  accept=".png,.jpeg,.jpg,.gif"
                  onChange={handleCoverImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Timeline Name */}
          <div className="space-y-2 mb-6">
            <Label htmlFor="timeline-name">Timeline Name</Label>
            <Input
              id="timeline-name"
              placeholder="e.g. My 2024 Reflections"
              value={timelineName}
              onChange={(e) => setTimelineName(e.target.value)}
            />
          </div>

          {/* Tags Input */}
          <div className="space-y-2 mb-6">
            <Label htmlFor="tags">Tags</Label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="tags"
                  placeholder="Type and press enter to add tags"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => handleTagInputKeyDown(e, 'tags')}
                />
                <Button
                  variant="secondary"
                  onClick={() => handleAddTag('tags', tagInput)}
                  disabled={!tagInput.trim()}
                  className="w-20"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-primary text-white text-sm"
                  >
                    {tag.text}
                    <button
                      onClick={() => removeTag(tag.id, 'tags')}
                      className="ml-2 hover:bg-primary/80 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Keywords Input */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center space-x-2">
              <Label htmlFor="keywords">Keywords</Label>
              <Tooltip content="Keywords/hashtags contained in your casts that will be curated and used in creating this timeline">
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </Tooltip>
            </div>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  id="keywords"
                  placeholder="Type and press enter to add keywords"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => handleTagInputKeyDown(e, 'keywords')}
                />
                <Button
                  variant="secondary"
                  onClick={() => handleAddTag('keywords', keywordInput)}
                  disabled={!keywordInput.trim()}
                  className="w-20"
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywords.map(keyword => (
                  <span
                    key={keyword.id}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-primary text-white text-sm"
                  >
                    {keyword.text}
                    <button
                      onClick={() => removeTag(keyword.id, 'keywords')}
                      className="ml-2 hover:bg-primary/80 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Supporter Allocation */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center space-x-2">
              <Label htmlFor="allocation">Supporter Allocation</Label>
              <Tooltip content="This is the allocation of trading fees not allocation of tokens">
                <HelpCircle className="h-4 w-4 text-gray-400" />
              </Tooltip>
            </div>
            <div className="relative">
              <Input
                id="allocation"
                type="number"
                min="0"
                max="50"
                value={supporterAllocation}
                onChange={(e) => setSupporterAllocation(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="template">Template</Label>
              <Tooltip content="Choose a layout style for your timeline">
                <Info className="h-4 w-4 text-gray-400" />
              </Tooltip>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {['pulse-thread', 'snapcast', 'branching-memory'].map((template) => (
                <TemplatePreview
                  key={template}
                  template={template as TimelineTemplate}
                  isSelected={selectedTemplate === template}
                  onSelect={(template) => setSelectedTemplate(template)}
                />
              ))}
            </div>
          </div>
          
          <div className="mt-8" />

          {/* Create Button */}
          <Button
            variant="primary"
            className="w-full"
            disabled={!session || !timelineName || !selectedTemplate || isLoading}
            // disabled={!timelineName || !selectedTemplate || isLoading}
            onClick={handleCreateTimeline}
          >
            {isLoading ? 'Creating...' : 'Create Timeline'}
          </Button>         

          {/* Timeline Preview */}
          {timelinePreview && (
            <div className="mt-8 space-y-6">
              <div className="border-t pt-8">
                <h2 className="text-2xl font-bold mb-6">Timeline Preview</h2>
                
                {/* Timeline Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <img
                      src={timelinePreview.creator.pfp_url}
                      alt={timelinePreview.creator.display_name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold">{timelinePreview.creator.display_name}</h3>
                      <p className="text-sm text-gray-500">@{timelinePreview.creator.username}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Created {new Date(timelinePreview.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Timeline Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Supporter Allocation</p>
                    <p className="text-lg font-semibold">{timelinePreview.stats.supporterAllocation}%</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500">Total Supporters</p>
                    <p className="text-lg font-semibold">{timelinePreview.stats.totalSupporters}</p>
                  </div>
                </div>

                {/* Tags and Keywords */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {timelinePreview.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                  {timelinePreview.keywords.map((keyword, index) => (
                    <span key={index} className="px-3 py-1 bg-accent2/10 text-accent2 rounded-full text-sm">
                      {keyword}
                    </span>
                  ))}
                </div>

                {/* Casts */}
                <div className="space-y-4">
                  {timelinePreview.casts.map((cast) => (
                    <div key={cast.hash} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <img
                          src={cast.author.pfp_url}
                          alt={cast.author.display_name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{cast.author.display_name}</span>
                            <span className="text-gray-500">@{cast.author.username}</span>
                            <span className="text-gray-400 text-sm">
                              {new Date(cast.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-1 text-gray-700">{cast.text}</p>
                          {cast.embeds.length > 0 && (
                            <div className="mt-2">
                              {cast.embeds.map((embed, index) => (
                                <img
                                  key={index}
                                  src={embed.url}
                                  alt=""
                                  className="max-w-full rounded-lg"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-xs text-center relative">
            <h2 className="text-lg font-bold mb-4">Choose a Wallet</h2>
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowWalletModal(false)}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="space-y-4">
              <Button className="w-full" variant="secondary" onClick={() => handleWalletSelect(0)}>
                Farcaster Wallet
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => handleWalletSelect(1)}>
                Coinbase Wallet
              </Button>
              <Button className="w-full" variant="secondary" onClick={() => handleWalletSelect(2)}>
                MetaMask
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 