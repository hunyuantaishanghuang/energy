import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGenAIClient() {
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to generate publication-grade academic SVG diagram via free gemini-3.8-flash when paid image model is declined
async function generateAcademicSvgFallback(prompt: string, stylePreset: string): Promise<{ imageUrl: string; description: string }> {
  const ai = getGenAIClient();
  const isDark = stylePreset === 'presentation-slide' || stylePreset === 'isometric-blueprint';
  const bg = isDark ? '#0B1120' : '#FFFFFF';
  const fg = isDark ? '#F8FAFC' : '#0F172A';

  const svgPrompt = `你是一位能源系统与气候经济领域的学术期刊制图专家。
请根据以下用户提示词，生成一段完整、精美、结构严谨、可直接渲染的 SVG 学术架构图代码（viewBox="0 0 1200 675"，背景色 ${bg}，主文字色 ${fg}）：
用户需求：${prompt}

设计要求：
1. 只输出纯 <svg ...>...</svg> 代码，不要包含 markdown 代码块包裹或其它解释文字。
2. 包含清晰的学术标题栏、模块化分层框、双向反馈箭头（使用 marker-end）、关键公式或参数标注（如 policy_adj、技术转型倍率、CO2达峰闭环）。
3. 配色专业克制（采用 #0284c7 清洁蓝、#059669 生态绿、#d97706 煤电琥珀橙、#6366f1 智库紫），所有中文标注字号适中、绝不重叠。`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: svgPrompt,
  });

  const rawText = response.text || '';
  const svgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgMatch) {
    const svgString = svgMatch[0];
    const base64Svg = Buffer.from(svgString, 'utf-8').toString('base64');
    return {
      imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
      description: '已通过免费学术引擎 (gemini-3.8-flash) 生成可无损缩放的科研矢量图解 (SVG)',
    };
  }
  throw new Error('未能生成有效的学术矢量图解');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '25mb' }));

  // Enable CORS for all assets and media elements
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.header('Access-Control-Allow-Headers', '*');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Dedicated video streaming handler with HTTP 206 Partial Content (Range) support
  const handleVideoStreaming = (req: express.Request, res: express.Response) => {
    const candidatePaths = [
      path.join(__dirname, 'public', 'video.mp4'),
      path.join(__dirname, 'public', 'assets', 'video.mp4'),
      path.join(__dirname, 'public', 'assets', 'aistudio', '_______________________87599efc.mp4'),
    ];

    let videoPath = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        videoPath = p;
        break;
      }
    }

    if (!videoPath) {
      res.status(404).send('Video asset not found');
      return;
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    res.header('Access-Control-Allow-Origin', '*');
    res.header('Accept-Ranges', 'bytes');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(videoPath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': 'video/mp4',
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      });
      fs.createReadStream(videoPath).pipe(res);
    }
  };

  app.get('/api/video', handleVideoStreaming);
  app.get('/video.mp4', handleVideoStreaming);
  app.get('/assets/video.mp4', handleVideoStreaming);
  app.get('/assets/aistudio/_______________________87599efc.mp4', handleVideoStreaming);

  // Serve all static files from public directory with proper MIME types and CORS
  const publicDir = path.join(__dirname, 'public');
  app.use(
    express.static(publicDir, {
      setHeaders: (res, filePath) => {
        res.set('Access-Control-Allow-Origin', '*');
        if (filePath.endsWith('.mp4')) {
          res.set('Accept-Ranges', 'bytes');
          res.set('Content-Type', 'video/mp4');
        }
      },
    })
  );

  // 1. Academic Diagram Generation (Tries gemini-3.1-flash-lite-image, seamlessly falls back to gemini-3.8-flash SVG engine when paid key is declined)
  app.post('/api/ai/generate-diagram', async (req, res) => {
    try {
      const { prompt, aspectRatio = '16:9', stylePreset = 'academic-vector' } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: '请输入有效的学术图解描述提示词' });
        return;
      }

      const ai = getGenAIClient();

      try {
        const stylePromptMap: Record<string, string> = {
          'academic-vector':
            'Clean academic journal schematic diagram, flat vector scientific illustration on crisp light neutral background, high legibility, structured flow arrows, nature energy journal figure aesthetic: ',
          'isometric-blueprint':
            'Clean scientific isometric technical rendering, sleek engineering blueprint style, precise power grid and renewable energy cross-sections, studio lighting: ',
          'presentation-slide':
            'High-resolution academic keynote presentation slide graphic, modern data visualization layout, crisp iconography for wind, solar, thermal power and carbon market mechanisms: ',
        };

        const fullPrompt = `${stylePromptMap[stylePreset] || stylePromptMap['academic-vector']}${prompt}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: fullPrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as '1:1' | '3:4' | '4:3' | '9:16' | '16:9',
            },
          },
        });

        let imageUrl = '';
        let description = '';
        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          } else if (part.text) {
            description += part.text;
          }
        }

        if (imageUrl) {
          res.json({
            imageUrl,
            description: description || '学术图解生成完成',
          });
          return;
        }
      } catch {
        // Paid image model unavailable or declined — use free gemini-3.8-flash vector diagram generator
      }

      const fallbackResult = await generateAcademicSvgFallback(prompt, stylePreset);
      res.json(fallbackResult);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '图解生成服务调用失败';
      console.error('Error in /api/ai/generate-diagram:', message);
      res.status(500).json({ error: message });
    }
  });

  // 2. Video Keyframe Editing & Academic Remastering
  app.post('/api/ai/edit-frame', async (req, res) => {
    try {
      const { imageBase64, localAssetPath, prompt } = req.body;
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: '请输入图像编辑或优化指令' });
        return;
      }

      let base64Data = '';
      let mimeType = 'image/jpeg';

      if (imageBase64 && typeof imageBase64 === 'string') {
        const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
        if (match) {
          mimeType = match[1];
          base64Data = match[2];
        } else {
          base64Data = imageBase64;
        }
      } else if (localAssetPath && typeof localAssetPath === 'string') {
        const safeRelPath = localAssetPath.replace(/^\/+/, '');
        const fullPath = path.join(__dirname, 'public', safeRelPath);
        if (fs.existsSync(fullPath)) {
          const fileBuffer = fs.readFileSync(fullPath);
          base64Data = fileBuffer.toString('base64');
          mimeType = fullPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
        }
      }

      if (!base64Data) {
        res.status(400).json({ error: '未提供有效的源图像或视频截帧数据' });
        return;
      }

      const ai = getGenAIClient();

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType,
                },
              },
              {
                text: `Based on this academic presentation video frame, ${prompt}. Keep the core scientific meaning and structure accurate, clear, and publication-ready.`,
              },
            ],
          },
        });

        let imageUrl = '';
        let description = '';
        const parts = response.candidates?.[0]?.content?.parts || [];
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            imageUrl = `data:${mime};base64,${part.inlineData.data}`;
          } else if (part.text) {
            description += part.text;
          }
        }

        if (imageUrl) {
          res.json({
            imageUrl,
            description: description || '视频截帧学术化重绘完成',
          });
          return;
        }
      } catch {
        // Multimodal vector reconstruction fallback via free gemini-3.8-flash
      }

      const svgVisionResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            {
              text: `请仔细识别这张学术汇报视频截帧中的所有文字、图表结构、流程图元素或能源图标，并按照用户的优化指令（"${prompt}"），将其重绘为一段高分辨率、排版严谨、文字清晰可读的纯 SVG 科研矢量图代码（viewBox="0 0 1200 675"）。只输出纯 <svg ...>...</svg> 代码，不要任何其它包裹内容。`,
            },
          ],
        },
      });

      const rawSvg = svgVisionResponse.text || '';
      const match = rawSvg.match(/<svg[\s\S]*?<\/svg>/i);
      if (match) {
        const b64 = Buffer.from(match[0], 'utf-8').toString('base64');
        res.json({
          imageUrl: `data:image/svg+xml;base64,${b64}`,
          description: '已通过免费多模态视觉引擎 (gemini-3.8-flash) 将视频截帧重构为无损学术矢量图 (SVG)',
        });
        return;
      }

      res.status(500).json({ error: '未能完成截帧矢量重构，请重试或使用本地高清画布重制模式。' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '图像编辑服务调用失败';
      console.error('Error in /api/ai/edit-frame:', message);
      res.status(500).json({ error: message });
    }
  });

  // 3. Academic Commentary & Defense Q&A Generator (Uses free gemini-3.8-flash)
  app.post('/api/ai/explain-chapter', async (req, res) => {
    try {
      const { chapterTitle, scenarioName, question, contextData } = req.body;
      const ai = getGenAIClient();

      const promptText = `你是一位能源经济与碳中和系统仿真领域的资深学术顾问。
当前汇报章节：${chapterTitle || '“评估—预测—优化”三层分析框架与宏观能源结构演化'}
当前仿真情景：${scenarioName || '基准情景 (BAU)'}
参考数据指标：${JSON.stringify(contextData || {})}
用户提问或讲解需求：${question || '请生成一段专业、精炼、逻辑严密的学术答辩口播讲稿，并列出2个评审专家可能追问的核心问题及标准回答。'}

请直接输出结构清晰的中文学术解析（包含【核心机制阐释】、【定量演化特征】与【评审答辩要点】三部分），语言简练、专业、易读。`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptText,
      });

      res.json({
        explanation: response.text || '暂无生成结果',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '学术讲解生成失败';
      console.error('Error in /api/ai/explain-chapter:', message);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Academic Video & 3D Energy Sandbox Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
