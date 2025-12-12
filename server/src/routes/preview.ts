import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

// Simple link preview - extracts basic metadata
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return errorResponse(res, 'URL is required', 400);
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return errorResponse(res, 'Invalid URL', 400);
    }

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TelegramBot/1.0)',
      },
    });

    if (!response.ok) {
      return errorResponse(res, 'Failed to fetch URL', 400);
    }

    const html = await response.text();

    // Extract metadata using regex (simple approach)
    const getMetaContent = (name: string): string | null => {
      const ogMatch = html.match(new RegExp(`<meta[^>]*property=["']og:${name}["'][^>]*content=["']([^"']+)["']`, 'i'));
      if (ogMatch) return ogMatch[1];
      
      const metaMatch = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'));
      if (metaMatch) return metaMatch[1];
      
      return null;
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    
    const preview = {
      url: url,
      title: getMetaContent('title') || (titleMatch ? titleMatch[1].trim() : parsedUrl.hostname),
      description: getMetaContent('description') || '',
      image: getMetaContent('image') || null,
      siteName: getMetaContent('site_name') || parsedUrl.hostname,
    };

    return successResponse(res, preview);
  } catch (error) {
    console.error('Link preview error:', error);
    return errorResponse(res, 'Failed to generate preview', 500);
  }
});

export default router;
