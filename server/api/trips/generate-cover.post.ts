import { defineEventHandler, readBody, createError } from 'h3';
import { requireAuth } from '../../utils/session';
import { useDB } from '../../db/index';
import { aiLogs } from '../../db/schema';
import { nanoid } from 'nanoid';
import { isDemoProvider, logDemoUsage, getDemoMockContent } from '../../utils/ai-provider';
import type { Trip } from '../../../types/Trips';

export default defineEventHandler(async (event) => {
  const sessionAuth = await requireAuth(event);
  const userId = sessionAuth.user.id;
  const body = await readBody(event);
  const { name, destination, flights, itinerary } = body;

  if (!destination) {
    throw createError({ statusCode: 400, message: 'Missing destination for cover generation' });
  }

  const db = useDB();
  const aiLogId = nanoid();

  // Demo 模式：回傳預設圖片並模擬記錄
  if (isDemoProvider()) {
    const testImageUrl = getDemoMockContent('cover_url');
    
    await logDemoUsage({
      userId,
      usageType: 'image'
    });

    return { 
      success: true, 
      url: testImageUrl, 
      promptUsed: `Demo Prompt for ${destination}`,
      warning: 'Demo 模式下的示範圖片'
    };
  }

  try {
    // --- STEP 1: 暫時用假提示詞（不呼叫 API）---
    // TODO: 之後要接回真實的提示詞生成 API
    const mockPrompt = `A beautiful, high-quality landscape view of ${destination}, showing its iconic landmarks and scenery, vibrant colors, cinematic lighting, professional photography. No text, letters, numbers, logos, or signs anywhere in the scene.`;
    
    // 記錄日誌（提示詞生成）
    await db.insert(aiLogs).values({
      id: aiLogId,
      userId,
      type: 'cover_prompt_generation',
      model: 'test-mode',
      prompt: `Destination: ${destination}`,
      systemInstruction: '測試模式：不呼叫 API，使用預設提示詞',
      response: mockPrompt,
      latencyMs: 0,
      createdAt: new Date()
    });

    // --- STEP 2: 回傳測試用假圖片 URL ---
    // TODO: 之後要接回真實的圖片生成 API（如 OpenAI DALL-E、Stable Diffusion 等）
    const testImageUrl = '/uploads/test-cover.jpg'; // 測試用假圖片路徑
    
    // 記錄日誌（圖片生成）
    const aiLogIdImage = nanoid();
    await db.insert(aiLogs).values({
      id: aiLogIdImage,
      userId,
      type: 'cover_image_generation',
      model: 'test-mode',
      prompt: mockPrompt,
      response: testImageUrl,
      latencyMs: 0,
      createdAt: new Date()
    });

    return { 
      success: true, 
      url: testImageUrl, 
      promptUsed: mockPrompt,
      warning: '測試圖片，正式圖片生成功能開發中'
    };

  } catch (error: any) {
    console.error('Cover Generation Error:', error);
    
    await db.insert(aiLogs).values({
      id: aiLogId,
      userId,
      type: 'cover_image_generation',
      model: 'test-mode',
      prompt: `Destination: ${destination}`,
      error: error.message || 'Unknown Error',
      latencyMs: 0,
      createdAt: new Date()
    }).catch(e => console.error('Failed to log error:', e));

    throw createError({
      statusCode: 500,
      message: '生成封面失敗（測試模式）: ' + (error.message || '未知錯誤')
    });
  }
});
