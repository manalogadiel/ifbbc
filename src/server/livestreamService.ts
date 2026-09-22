export interface StreamInfo {
  platform: 'youtube' | 'facebook';
  status: 'live' | 'scheduled' | 'completed';
  title: string;
  subtitle?: string;
  thumbnailUrl: string;
  videoUrl: string;
  embedUrl: string;
  videoId?: string;
  channelName: string;
  channelUrl: string;
  publishedAt?: string;
}

export interface LivestreamsData {
  youtube: StreamInfo;
  facebook: StreamInfo;
  activeStream: 'youtube' | 'facebook' | null;
  lastUpdated: number;
}

const YOUTUBE_CHANNEL_ID = 'UC9l4j8_z3QtkxoIwZvpUXKw';
const YOUTUBE_HANDLE = '@ifbbc';
const FB_PAGE_HANDLE = 'inicbulanfundamental.baptistbiblechurch';

// In-memory cache
let cachedData: LivestreamsData | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds for quick live detection

// Default fallback data for initial paint
const defaultData: LivestreamsData = {
  youtube: {
    platform: 'youtube',
    status: 'completed',
    title: 'Sunday Worship Service',
    subtitle: 'IFBBC Pulpit',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?q=80&w=1200&auto=format&fit=crop',
    videoUrl: `https://www.youtube.com/${YOUTUBE_HANDLE}/streams`,
    embedUrl: `https://www.youtube-nocookie.com/embed/live_stream?channel=${YOUTUBE_CHANNEL_ID}`,
    channelName: 'IFBBC Official',
    channelUrl: `https://www.youtube.com/${YOUTUBE_HANDLE}`,
  },
  facebook: {
    platform: 'facebook',
    status: 'completed',
    title: 'Sunday Divine Worship',
    subtitle: 'IFBBC Worship Service',
    thumbnailUrl: 'https://images.unsplash.com/photo-1510590337019-5ef8d3d32116?q=80&w=1200&auto=format&fit=crop',
    videoUrl: `https://www.facebook.com/${FB_PAGE_HANDLE}/live_videos`,
    embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(`https://www.facebook.com/${FB_PAGE_HANDLE}/live_videos`)}&show_text=false&allowfullscreen=true`,
    channelName: 'Inicbulan Fundamental Baptist Bible Church',
    channelUrl: `https://www.facebook.com/${FB_PAGE_HANDLE}`,
  },
  activeStream: null,
  lastUpdated: Date.now(),
};

async function fetchYouTubeLivestream(): Promise<StreamInfo> {
  const fallback = defaultData.youtube;
  try {
    // 1. Check if official API Key exists
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (apiKey) {
      try {
        const searchRes = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YOUTUBE_CHANNEL_ID}&eventType=live&type=video&key=${apiKey}`
        );
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.items && searchData.items.length > 0) {
            const item = searchData.items[0];
            const videoId = item.id.videoId;
            return {
              platform: 'youtube',
              status: 'live',
              title: item.snippet.title,
              subtitle: 'Live on YouTube',
              thumbnailUrl: item.snippet.thumbnails?.high?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
              embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
              videoId,
              channelName: 'IFBBC Official',
              channelUrl: `https://www.youtube.com/${YOUTUBE_HANDLE}`,
              publishedAt: item.snippet.publishedAt,
            };
          }
        }
      } catch (err) {
        console.warn('[livestreamService] YouTube API error, falling back:', err);
      }
    }

    // 2. Check /live directly to see if currently streaming
    try {
      const liveRes = await fetch(`https://www.youtube.com/${YOUTUBE_HANDLE}/live`, {
        redirect: 'follow',
      });

      if (liveRes.ok) {
        const liveHtml = await liveRes.text();
        const isLiveNow =
          liveHtml.includes('"isLive":true') ||
          liveHtml.includes('"isLiveBroadcast":true') ||
          liveHtml.includes('BADGE_STYLE_TYPE_LIVE_NOW');
        const isScheduled = liveHtml.includes('"upcomingEventData"');

        const liveVideoMatch = liveRes.url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        const liveVideoId = liveVideoMatch
          ? liveVideoMatch[1]
          : (liveHtml.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)?.[1] ?? null);

        if ((isLiveNow || isScheduled) && liveVideoId) {
          let title = 'IFBBC Live Worship Service';
          const titleMatch = liveHtml.match(/<meta name="title" content="([^"]+)">/) || liveHtml.match(/<title>([^<]+)<\/title>/);
          if (titleMatch?.[1]) {
            title = titleMatch[1].replace(' - YouTube', '').trim();
          }

          return {
            platform: 'youtube',
            status: isLiveNow ? 'live' : 'scheduled',
            title,
            subtitle: isLiveNow ? 'Live on YouTube' : 'Scheduled Stream',
            thumbnailUrl: `https://i.ytimg.com/vi/${liveVideoId}/hqdefault.jpg`,
            videoUrl: `https://www.youtube.com/watch?v=${liveVideoId}`,
            embedUrl: `https://www.youtube-nocookie.com/embed/${liveVideoId}?autoplay=1&rel=0`,
            videoId: liveVideoId,
            channelName: 'IFBBC Official',
            channelUrl: `https://www.youtube.com/${YOUTUBE_HANDLE}`,
          };
        }
      }
    } catch (e) {
      console.warn('[livestreamService] /live check failed:', e);
    }

    // 3. Fallback to official YouTube XML RSS feed for the latest broadcast / sermon
    try {
      const rssRes = await fetch(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`
      );
      if (rssRes.ok) {
        const xml = await rssRes.text();
        const entryMatch = xml.match(/<entry>(.*?)<\/entry>/s);
        if (entryMatch) {
          const entry = entryMatch[1];
          const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
          let title = entry.match(/<title>([^<]+)<\/title>/)?.[1] || 'Latest IFBBC Stream';
          title = title.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
          const published = entry.match(/<published>([^<]+)<\/published>/)?.[1];

          if (videoId) {
            return {
              platform: 'youtube',
              status: 'completed',
              title,
              subtitle: 'Latest Service & Message',
              thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
              embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
              videoId,
              channelName: 'IFBBC Official',
              channelUrl: `https://www.youtube.com/${YOUTUBE_HANDLE}`,
              publishedAt: published,
            };
          }
        }
      }
    } catch (e) {
      console.warn('[livestreamService] YouTube RSS feed failed:', e);
    }

    return fallback;
  } catch (error) {
    console.error('[livestreamService] Error fetching YouTube:', error);
    return fallback;
  }
}

async function fetchFacebookLivestream(): Promise<StreamInfo> {
  const fallback = defaultData.facebook;
  try {
    // 0. Check for manual override in environment
    const overrideUrl = process.env.FACEBOOK_LIVE_OVERRIDE_URL || process.env.VITE_FB_LIVE_OVERRIDE_URL;
    if (overrideUrl) {
      return {
        platform: 'facebook',
        status: 'live',
        title: 'IFBBC Live Service',
        subtitle: 'Live on Facebook',
        thumbnailUrl: fallback.thumbnailUrl,
        videoUrl: overrideUrl,
        embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(overrideUrl)}&show_text=false&allowfullscreen=true`,
        channelName: 'Inicbulan Fundamental Baptist Bible Church',
        channelUrl: `https://www.facebook.com/${FB_PAGE_HANDLE}`,
      };
    }

    // 1. Check if Facebook Graph API Token is configured
    const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID || FB_PAGE_HANDLE;

    if (fbToken) {
      try {
        const graphRes = await fetch(
          `https://graph.facebook.com/v19.0/${pageId}/live_videos?fields=id,status,title,description,creation_time,video{source,permalink_url}&access_token=${fbToken}`
        );
        if (graphRes.ok) {
          const data = await graphRes.json();
          if (data.data && data.data.length > 0) {
            const latest = data.data[0];
            const isLive = latest.status === 'LIVE';
            const permalink = latest.video?.permalink_url || `https://www.facebook.com/${FB_PAGE_HANDLE}/live_videos`;
            return {
              platform: 'facebook',
              status: isLive ? 'live' : 'completed',
              title: latest.title || latest.description || 'IFBBC Sunday Service',
              subtitle: isLive ? 'Live on Facebook' : 'Latest Facebook Broadcast',
              thumbnailUrl: fallback.thumbnailUrl,
              videoUrl: permalink,
              embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(permalink)}&show_text=false&allowfullscreen=true`,
              channelName: 'Inicbulan Fundamental Baptist Bible Church',
              channelUrl: `https://www.facebook.com/${FB_PAGE_HANDLE}`,
              publishedAt: latest.creation_time,
            };
          }
        }
      } catch (err) {
        console.warn('[livestreamService] Facebook Graph API error, falling back:', err);
      }
    }

    // 2. Fetch page and live_videos metadata directly
    let title = 'Inicbulan Fundamental Baptist Church';
    let thumbnailUrl = fallback.thumbnailUrl;
    let videoUrl = `https://www.facebook.com/${FB_PAGE_HANDLE}/live_videos`;
    let isLive = false;

    try {
      const pageRes = await fetch(`https://www.facebook.com/${FB_PAGE_HANDLE}`);
      if (pageRes.ok) {
        const html = await pageRes.text();
        const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
        const ogImage = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1];
        if (ogTitle) title = ogTitle.replace(/&amp;/g, '&');
        if (ogImage) thumbnailUrl = ogImage.replace(/&amp;/g, '&');
      }
    } catch {
      // ignore
    }

    try {
      const liveRes = await fetch(`https://www.facebook.com/${FB_PAGE_HANDLE}/live_videos`);
      if (liveRes.ok) {
        const liveHtml = await liveRes.text();
        isLive = liveHtml.includes('"is_live":true') || liveHtml.includes('"broadcast_status":"LIVE"');
        const videoIdMatch = liveHtml.match(/\/videos\/(\d+)/);
        if (videoIdMatch) {
          videoUrl = `https://www.facebook.com/${FB_PAGE_HANDLE}/videos/${videoIdMatch[1]}`;
        }
      }
    } catch {
      // ignore
    }

    const embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoUrl)}&show_text=false&allowfullscreen=true`;

    return {
      platform: 'facebook',
      status: isLive ? 'live' : 'completed',
      title: isLive ? 'IFBBC Live Celebration' : title,
      subtitle: isLive ? 'Live on Facebook' : 'Latest Facebook Video',
      thumbnailUrl,
      videoUrl,
      embedUrl,
      channelName: 'Inicbulan Fundamental Baptist Bible Church',
      channelUrl: `https://www.facebook.com/${FB_PAGE_HANDLE}`,
    };
  } catch (error) {
    console.error('[livestreamService] Error fetching Facebook:', error);
    return fallback;
  }
}

export async function getLivestreamsData(): Promise<LivestreamsData> {
  const now = Date.now();

  // Return cached data if fresh
  if (cachedData && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedData;
  }

  try {
    const [youtube, facebook] = await Promise.all([
      fetchYouTubeLivestream(),
      fetchFacebookLivestream(),
    ]);

    let activeStream: 'youtube' | 'facebook' | null = null;
    if (youtube.status === 'live') {
      activeStream = 'youtube';
    } else if (facebook.status === 'live') {
      activeStream = 'facebook';
    }

    cachedData = {
      youtube,
      facebook,
      activeStream,
      lastUpdated: now,
    };
    lastFetchTime = now;

    return cachedData;
  } catch (err) {
    console.error('[livestreamService] getLivestreamsData error:', err);
    return cachedData || defaultData;
  }
}
