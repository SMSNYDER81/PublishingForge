/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { 
  FileText, Search, Tag, Calendar, Clock, ArrowLeft, CheckCircle2, 
  Settings, Copy, Check, Sparkles, Share2, Globe, Eye, Code, 
  BookOpen, ChevronRight, BarChart2, Lightbulb, AlertCircle, RefreshCw
} from 'lucide-react';

// Static SEO High-Value Blog Posts
interface BlogPost {
  title: string;
  slug: string;
  category: 'Formatting' | 'Design' | 'Marketing';
  date: string;
  readingTime: string;
  tags: string[];
  metaTitle: string;
  metaDesc: string;
  summary: string;
  content: string[];
}

const STATIC_BLOG_POSTS: BlogPost[] = [
  {
    title: "Unlocking KDP Bleed vs. No Bleed: The Print-Ready Guide",
    slug: "kdp-bleed-vs-no-bleed-print-guide",
    category: "Formatting",
    date: "May 28, 2026",
    readingTime: "5 min read",
    tags: ["KDP", "Bleed Settings", "Trim Size", "Paperback Formatting"],
    metaTitle: "KDP Bleed vs No Bleed: Standard Paperback Trim Math | PublishingForge",
    metaDesc: "Master KDP bleed size calculations. Compare bleed and no-bleed options with exact safe zone trim math, gutter margin formulas, and how to avoid manuscript rejection.",
    summary: "Getting your bleed setup wrong is the #1 cause of paperback submission failures on Kindle Direct Publishing. Learn the exact margin guidelines to pass KDP review on your first attempt.",
    content: [
      "When preparing a manuscript for Amazon KDP (Kindle Direct Publishing), one of the most critical decisions is selecting between **Bleed** and **No Bleed**. This single choice dictates how your interior PDF is designed, your target page size dimensions during generation, and whether the print system wraps your images perfectly from seam to seam.",
      "### What is Book Bleed?",
      "In print publishing, 'bleed' refers to images or background elements that extend beyond the edge of the physical book page. When books are printed, they are pressed onto large sheet rolls and then mechanically trimmed down to your target size (e.g., 6 x 9 inches). Because blades can sway up to 1/8th of an inch, any graphic that is meant to touch the page border must overflow slightly. This prevents ugly white hairline strips from forming on the margins.",
      "### Bleed vs. No Bleed: Core Rules",
      "1. **No Bleed (Strictly Text)**: Select No Bleed if your book is composed entirely of black-and-white prose, novels, or memoirs where no elements or background tints touch the physical page edge. All text stays securely contained within standard margin offsets.",
      "2. **Bleed (Full Bleed Images)**: Choose Bleed if you are designing a children’s picture book, a photo collection, a cookbook, or a notebook containing lines, tables, or decorative elements that stretch all the way to the side. Your images must stretch exactly **0.125 inches (1/8 inch)** past the top, bottom, and outer edges during output.",
      "### The Margin & Trim Math for 6x9 Books",
      "If you choose **No Bleed**, your PDF layout page size matches your trim size precisely: **6.0\" x 9.0\"**.",
      "If you choose **Bleed**, you must enlarge your document width by **0.125\"** and your document height by **0.25\"** (0.125\" each for the top and bottom borders). This means your total PDF page dimensions must be set to **6.125\" x 9.25\"**.",
      "### The Gutter Margin Formula",
      "Gutter margins (inside margins nearest to the binding fold) must scale proportionally to your page count in order to prevent text from sliding into the darkness of the book spine bind fold. Follow this safe guideline:\n- **24 to 150 Pages**: 0.375 inch inside margin\n- **151 to 300 Pages**: 0.500 inch inside margin\n- **301 to 500 Pages**: 0.625 inch inside margin\n- **501+ Pages**: 0.750 inch inside margin",
      "Using an automated formatter like **PublishingForge** ensures your gutter margins dynamically bind to these official specifications, guaranteeing a flawless, comfortable reading experience."
    ]
  },
  {
    title: "How to Compute Book Spine Thickness: Cream vs. White Paper Formula",
    slug: "calculate-book-spine-thickness-formulas",
    category: "Design",
    date: "May 22, 2026",
    readingTime: "4 min read",
    tags: ["Spine Width", "Cover Design", "White vs Cream Paper", "IngramSpark"],
    metaTitle: "How to Calculate KDP Cover Spine Width: Cream, White & Color Paper Guide",
    metaDesc: "Calculate KDP paperback spine size with absolute precision. Compute cream vs white paper page multipliers, safe spine text margins, and hardcover wrap offsets.",
    summary: "A misaligned book spine looks amateurish and is rejected by major POD distributors. Master the simple math behind page multipliers and safe spine margins.",
    content: [
      "Designing a wrapper cover is far more challenging than a simple storefront mockup because you must account for the **spine width**, layout fold lines, and wrap-around bleed. If your cover is even 1/32nd of an inch off, your title spine text will spill over onto the front or back cover.",
      "To size your spine, you must know your exact **final page count** and the specific **paper color density** you have chosen on your platform. Here is the blueprint for calculating spine widths under KDP and IngramSpark metrics.",
      "### The Spine Width Mathematical Equations",
      "The spine width is calculated by multiplying your total page count by the single-sheet thickness index (often referred to as 'PPI' or pages-per-inch metric).",
      "#### 1. Black & White Paperback on White Paper\n- **KDP Multiplier**: 0.002252 inches per page\n- **Formula**: `Page Count * 0.002252 inches`\n- *Example (200 pages)*: `200 * 0.002252 = 0.4504 inches`",
      "#### 2. Black & White Paperback on Cream Paper\n- **KDP Multiplier**: 0.0025 inches per page\n- **Formula**: `Page Count * 0.0025 inches`\n- *Example (200 pages)*: `200 * 0.0025 = 0.50 inches` (Note how cream paper is significantly thicker, increasing your spine thickness by 11%)",
      "#### 3. Standard Color Print (Premium Color vs. Standard Color)\n- **KDP Premium Color Multiplier**: 0.002347 inches per page\n- **KDP Standard Color Multiplier**: 0.00222 inches per page",
      "### Amazon KDP Spine Text Limitations",
      "Can your book cover have written text on the spine? On Amazon KDP, your paperback **must be at least 79 pages long** to support printed spine text. If your book is 78 pages or fewer, KDP requires a completely solid background block on the spine area with zero characters to prevent alignment shift errors.",
      "### Core Safety Margins",
      "Once you calculate your core spine width block, ensure all typography is padded with at least **0.0625 inches (1/16 inch)** of clear space on both the left and right borders of the spine fold lines. This safeguard isolates your title and author lettering from the mechanical shifting that occurs during production assembly."
    ]
  },
  {
    title: "10 Direct Amazon KDP SEO Strategies to Skyrocket Kindle & Paperback Sales",
    slug: "amazon-kdp-seo-keyword-rankings",
    category: "Marketing",
    date: "May 15, 2026",
    readingTime: "6 min read",
    tags: ["Keywords", "KDP SEO", "Book Marketing", "Amazon Metadata"],
    metaTitle: "10 Kindle SEO Strategies: Master KDP Keywords and Categories in 2026",
    metaDesc: "How to use Amazon SEO and targeted backend search keywords to double your organic book views. Learn keyword stuffing rules, competitor evaluation, and metadata formatting.",
    summary: "Amazon functions as a massive, intentional search engine. Discover how to write descriptive book titles, configure the '7 backend keywords slots', and structure high-converting blurbs that rank.",
    content: [
      "Writing a magnificent book is only half the battle. If your target audience cannot find your title on the Amazon Kindle store, your launch will stall. The secret to organic discoverability lies in mastering **Amazon KDP Search Engine Optimization (SEO)**.",
      "Here are the top 10 practical strategies that best-selling indie authors leverage to secure top spots on relevant search result pages.",
      "### 1. Maximize the 7 Backend Keyword Slots",
      "When uploading your manuscript metadata inside KDP, Amazon gives you exactly 7 keyword fields. Rather than writing a single word in each box (e.g. 'mystery'), you are allowed to pack each box with **up to 50 characters (including spaces)**! Optimize these fields by using long-tail search phrases (e.g., 'cozy academic mystery thriller with cats').",
      "### 2. Bypass Title Tag Stuffing",
      "Amazon has cracked down heavily on titles that resemble keyword soup (e.g., 'Fantasy novel: A story of wizards, elves, magic wand, sorcerer, book 1'). Keep your title clean and weave any descriptive SEO phrases into your subtitle naturally (e.g., 'The Hearth of Forgotten Tongues: An Epic Dark Fantasy Novel').",
      "### 3. Mine Customer Review Vocabulary",
      "Examine high-ranking competitor books in your sub-genre. Go into the 3-star and 4-star reviews to find exact phrases readers use to describe what they loved (or missed) about those books. Terms like 'hard magic system' or 'fast-paced suspense with dual POVs' are high-converting search keywords.",
      "### 4. Create a High-Contrast Bold Hook in the Blurb",
      "Amazon indexing scrapers index your book blurb search descriptions. However, human buyers decide through emotion. Your first 3 lines of your blurb must contain a powerful, narrative hook formatted in bold (`<b>` tag) to command attention before the buyer hits 'Read more'.",
      "### 5. Check Category Nodes & Sales Velocities",
      "Do not just target ultra-broad categories like 'Fiction / Historical'. Dive into granular leaf niches (such as 'Renaissance Historical Fiction' or 'Post-Apocalypse Hard Sci-Fi'). Winning a best-seller badge in a niche category requires far fewer daily sales, boosting your book's relative search rank across all of Amazon."
    ]
  }
];

export default function BlogSection() {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Formatting' | 'Design' | 'Marketing'>('All');
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // SERP and Metadata Simulator State
  const [simTitle, setSimTitle] = useState<string>("Unlocking KDP Bleed: The Print-Ready Volume Guide");
  const [simDesc, setSimDesc] = useState<string>("Master Amazon KDP paperback trim sizes, bleed margins, and paper colors. Get calculated safe margins to format ready-to-print PDFs.");
  const [simSlug, setSimSlug] = useState<string>("kdp-bleed-safe-zone-calculator");

  // Content Optimizer tool states
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [draftContent, setDraftContent] = useState<string>("");
  const [seoResult, setSeoResult] = useState<{
    wordCount: number;
    paragraphs: number;
    readabilityGrade: string;
    keywordDensity: { word: string; count: number; rawPercent: number; score: 'Good' | 'Needs Improvement' }[];
    seoScore: number;
    checklist: { label: string; passed: boolean; tip: string }[];
  } | null>(null);

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);

  // Filter posts based on Category
  const filteredPosts = useMemo(() => {
    if (activeCategory === 'All') return STATIC_BLOG_POSTS;
    return STATIC_BLOG_POSTS.filter(p => p.category === activeCategory);
  }, [activeCategory]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Run Real-Time SEO & Readability Assessment
  const handleAnalyzeSEO = () => {
    if (!draftContent.trim() && !draftTitle.trim()) {
      return;
    }

    const words = draftContent.trim().split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const titleWords = draftTitle.trim().split(/\s+/).filter(w => w.length > 0).length;
    const paragraphs = draftContent.split(/\n+/).filter(p => p.trim().length > 0).length;

    // Approximate basic Flesch-Kincaid style readability based on average word length and sentence lengths
    const sentences = draftContent.split(/[.!?]+/).filter(s => s.trim().length > 0).length || 1;
    const avgSentenceLength = wordCount / sentences;
    let readabilityGrade = "Grade 9-10 (Standard Reading)";
    if (avgSentenceLength > 18) {
      readabilityGrade = "Grade 12+ (Advanced / Academic)";
    } else if (avgSentenceLength < 10) {
      readabilityGrade = "Grade 5-6 (Simple & Direct)";
    }

    // Core publishing search phrases to inspect density
    const targetKeywords = [
      { key: 'kdp', test: /\bkdp\b/gi, label: 'KDP' },
      { key: 'bleed', test: /\bbleed\b/gi, label: 'Bleed' },
      { key: 'spine', test: /\bspine\b/gi, label: 'Spine' },
      { key: 'formatting', test: /\bformatting\b/gi, label: 'Formatting' },
      { key: 'amazon', test: /\bamazon\b/gi, label: 'Amazon' },
      { key: 'cover', test: /\bcover\b/gi, label: 'Cover' },
      { key: 'book', test: /\bbook\b/gi, label: 'Book' },
    ];

    const keywordDensity = targetKeywords.map(kw => {
      const matchPattern = draftContent.match(kw.test);
      const count = matchPattern ? matchPattern.length : 0;
      const rawPercent = wordCount > 0 ? (count / wordCount) * 100 : 0;
      return {
        word: kw.label,
        count,
        rawPercent: parseFloat(rawPercent.toFixed(2)),
        score: (rawPercent >= 0.5 && rawPercent <= 3.0) ? 'Good' as const : 'Needs Improvement' as const
      };
    });

    // SEO Optimization Checklist rules
    const checklist = [
      {
        label: "Title Length",
        passed: draftTitle.length >= 30 && draftTitle.length <= 60,
        tip: "Title should be between 30 and 60 characters for maximum search engine click rates."
      },
      {
        label: "Title Keywords Included",
        passed: /kdp|book|cover|spine|format|publishing|trim/gi.test(draftTitle),
        tip: "Incorporate high-search volume terms in your heading such as 'KDP', 'Book Spine', or 'Formatting'."
      },
      {
        label: "Minimum Length Check",
        passed: wordCount >= 300,
        tip: "Articles under 300 words are considered 'thin content' by search crawlers. Shoot for 400-800 words."
      },
      {
        label: "Keyword Richness",
        passed: keywordDensity.filter(k => k.count > 0).length >= 3,
        tip: "Try to sprinkle in at least 3 distinct primary industry keywords with natural variations."
      },
      {
        label: "Formatting Segments",
        passed: paragraphs >= 3,
        tip: "Incorporate multiple subheaders or white space breaks (3+ paragraphs) for mobile screen readability."
      }
    ];

    // Compute aggregate composite score
    const passedChecksCount = checklist.filter(c => c.passed).length;
    const computedScore = Math.min(100, Math.round((passedChecksCount / checklist.length) * 100));

    setSeoResult({
      wordCount,
      paragraphs,
      readabilityGrade,
      keywordDensity,
      seoScore: computedScore,
      checklist
    });
  };

  // Automated AI Article optimizer triggering the main /api/ai/optimize
  const handleAIBlogImprove = async () => {
    if (!draftTitle.trim() && !draftContent.trim()) {
      setAiFeedback("Please provide a title or draft text to trigger AI refinement.");
      return;
    }
    setAiLoading(true);
    setAiFeedback(null);

    const userKey = localStorage.getItem('user_gemini_api_key') || undefined;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (userKey) {
      headers['X-Gemini-API-Key'] = userKey;
    }

    try {
      const response = await fetch('/api/ai/optimize', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'blurb', // we recycle custom prompt behavior in backend blurb or send custom request
          text: draftContent,
          genre: 'Self-Publishing Instruction',
          tone: 'Highly Professional & Authoritative',
          targetAudience: 'Self-Publishing Authors on Amazon KDP',
          extraPrompt: `This is a Draft Blog Post of a self-publishing support guide. 
          The title is: "${draftTitle}". Please rewrite or optimize this text as an SEO-friendly, high-relevance blog segment. 
          Provide a strong keyword-rich hook header, 3 distinct structured, readable paragraphs, and bullet points if appropriate. 
          Return ONLY the optimized body text block in high-fidelity markdown format.`
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to contact Gemini SEO engine");
      }

      if (data.setupNeeded) {
        setAiFeedback("Gemini API key is not configured. Please add your GEMINI_API_KEY in the AI assistant sidebar panel to enable live AI upgrades.");
      } else if (data.success && data.result) {
        setDraftContent(data.result);
        setAiFeedback("Success! Draft optimized using Gemini AI with rich subheadings!");
        // Re-run the local metrics to reflect the new AI-optimized texts
        setTimeout(() => {
          handleAnalyzeSEO();
        }, 300);
      } else {
        throw new Error(data.error || "An error occurred during AI content generation.");
      }
    } catch (err: any) {
      console.error(err);
      setAiFeedback(err.message || "Unable to generate AI content recommendation.");
    } finally {
      setAiLoading(false);
    }
  };

  // Fast Populate Templates for Optimizer
  const loadOptimizerPreset = (type: 'formatting' | 'marketing') => {
    if (type === 'formatting') {
      setDraftTitle("Calculating Safe Trim Margins for Self-Published Paperbacks");
      setDraftContent("Many indie authors do not understand how margins and bleed work during the physical book production process. Margins are the borders around your text blocks. If you set margins too programmatically narrow, the printing presses might slice off parts of your text.\n\nYou must calculate gutters. Gutter margins are added to the fold binding. If you are printing 150 pages, KDP recommends 0.5 inches of space. Keep pages clean with beautiful layouts!");
    } else {
      setDraftTitle("How to Select Your Amazon Author Core Subheadings");
      setDraftContent("Amazon is a major search query hub, meaning book marketing counts on matching customer keywords. Do not just use broad classifications. Look for localized keyword trends that fit your book. Analyze competitor listings, check reviews for recurring descriptive terminology, and input these in your cover blurbs!");
    }
    // Auto clear previous score until run is pressed
    setSeoResult(null);
  };

  // Generate Automated JSON-LD structured data block for core selected posts or simulator settings
  const liveJSONLDSchema = useMemo(() => {
    const titleVal = selectedPost ? selectedPost.metaTitle : simTitle;
    const descVal = selectedPost ? selectedPost.metaDesc : simDesc;
    const urlVal = selectedPost 
      ? `https://publishingforge.com/blog/${selectedPost.slug}` 
      : `https://publishingforge.com/blog/${simSlug}`;
    
    const schemaObj = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": titleVal,
      "description": descVal,
      "url": urlVal,
      "datePublished": selectedPost?.date || "2026-05-28",
      "author": {
        "@type": "Organization",
        "name": "PublishingForge Editorial Board"
      },
      "publisher": {
        "@type": "Organization",
        "name": "PublishingForge Suite",
        "logo": {
          "@type": "ImageObject",
          "url": "https://publishingforge.com/assets/logo.png"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": urlVal
      }
    };

    return JSON.stringify(schemaObj, null, 2);
  }, [selectedPost, simTitle, simDesc, simSlug]);

  return (
    <div id="blog-workspace-container" className="max-w-6xl mx-auto px-4 py-2">
      
      {/* Blog Hero Banner */}
      <div className="bg-slate-900 text-slate-100 rounded-xl p-8 mb-10 relative overflow-hidden border border-slate-800 shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/60 p-1 px-2 rounded border border-indigo-500/35">
            Resource Library &amp; Rich SEO Sandbox
          </span>
          <h1 className="text-4xl font-serif font-extrabold text-white mt-4 tracking-tight">
            The Publishing<span className="text-indigo-400 font-sans">Forge</span> Authority Blog
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Exceed standard search engine guidelines with our curated, print-optimized advice database, live Google/Social mockup previews, and automated schema-ready Structured Metadata markup tools.
          </p>
        </div>
      </div>

      {/* Main Core Router: Reading view vs Navigation Hub */}
      {selectedPost ? (
        <div id="blog-single-reader" className="grid lg:grid-cols-3 gap-8 items-start animate-in fade-in duration-200">
          
          {/* Main article content column */}
          <div className="lg:col-span-2 space-y-6">
            <button 
              onClick={() => setSelectedPost(null)}
              className="flex items-center gap-1 text-xs font-mono font-bold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog Directory
            </button>

            <article className="bg-white rounded-xl border border-slate-200 p-8 shadow-xs">
              <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
                <span className="bg-indigo-50 text-indigo-700 font-mono font-extrabold px-2.5 py-1 rounded-full uppercase">
                  {selectedPost.category}
                </span>
                <span className="text-slate-400 flex items-center gap-1 font-mono">
                  <Calendar className="w-3.5 h-3.5" /> {selectedPost.date}
                </span>
                <span className="text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" /> {selectedPost.readingTime}
                </span>
              </div>

              <h2 className="text-3xl font-serif font-bold text-slate-900 leading-tight">
                {selectedPost.title}
              </h2>
              <p className="text-md font-serif italic text-slate-600 mt-3 border-l-3 border-indigo-500 pl-4 py-1">
                {selectedPost.summary}
              </p>

              {/* Core Content paragraphs */}
              <div className="mt-8 space-y-5 text-slate-700 leading-relaxed text-sm font-sans">
                {selectedPost.content.map((paragraph, idx) => {
                  if (paragraph.startsWith('###')) {
                    return (
                      <h4 key={idx} className="text-lg font-serif font-bold text-slate-900 mt-6 mb-2">
                        {paragraph.replace('###', '').trim()}
                      </h4>
                    );
                  }
                  if (paragraph.startsWith('####')) {
                    return (
                      <h5 key={idx} className="text-sm font-mono font-bold text-slate-800 mt-4 mb-2">
                        {paragraph.replace('####', '').trim()}
                      </h5>
                    );
                  }
                  if (paragraph.startsWith('-')) {
                    return (
                      <ul key={idx} className="list-disc list-inside pl-4 space-y-1 my-2">
                        {paragraph.split('\n').map((li, lIdx) => (
                          <li key={lIdx}>{li.replace('-', '').trim()}</li>
                        ))}
                      </ul>
                    );
                  }
                  
                  // Simple strong bold markers replacement
                  const formattedText = paragraph.split('**').map((chunk, cIdx) => {
                    return cIdx % 2 === 1 ? <strong className="text-slate-900 font-extrabold" key={cIdx}>{chunk}</strong> : chunk;
                  });

                  return <p key={idx}>{formattedText}</p>;
                })}
              </div>

              {/* Tags block */}
              <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-2">
                {selectedPost.tags.map(tag => (
                  <span key={tag} className="text-xs bg-slate-50 border border-slate-200/60 px-2 py-1 rounded text-slate-500 font-mono">
                    #{tag}
                  </span>
                ))}
              </div>
            </article>

            {/* Back directory button again */}
            <div className="pt-4">
              <button 
                onClick={() => setSelectedPost(null)}
                className="bg-slate-950 text-slate-200 px-4 py-2 rounded font-mono hover:bg-indigo-600 text-xs font-bold transition-all inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to Core Directory
              </button>
            </div>
          </div>

          {/* Right sidebar showing technical SEO credentials */}
          <div className="space-y-6">
            
            {/* Meta Tags Details Inspector */}
            <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 p-5 shadow-xs">
              <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-850 pb-2.5">
                <Globe className="w-4 h-4 shrink-0" />
                <span>Search Engine Meta Credentials</span>
              </div>
              
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Crawl Page Title tag</span>
                  <div className="bg-slate-950 p-2 text-slate-300 rounded border border-slate-800 select-all leading-normal break-words">
                    {selectedPost.metaTitle}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Crawl Meta Description</span>
                  <div className="bg-slate-950 p-2.5 text-slate-400 rounded border border-slate-800 leading-relaxed select-all">
                    {selectedPost.metaDesc}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">XML Canonical URL</span>
                  <div className="bg-slate-950 p-2 text-slate-500 rounded border border-slate-800 select-all font-mono text-[10px]">
                    https://publishingforge.com/blog/{selectedPost.slug}
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Live Search Engine Snippet Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center gap-2 text-slate-500 font-mono text-xs font-bold uppercase tracking-wider mb-4">
                <Eye className="w-4 h-4 text-slate-400" />
                <span>SERP Google Search Result</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-2xs font-sans text-xs">
                <span className="text-[11px] text-slate-500 font-mono block mb-0.5 max-w-full truncate">https://publishingforge.com &rsaquo; blog &rsaquo; {selectedPost.slug}</span>
                <span className="text-base text-blue-800 hover:underline font-medium leading-tight block mb-1">
                  {selectedPost.metaTitle}
                </span>
                <p className="text-slate-600 leading-normal">
                  <span className="text-slate-400 font-mono text-[10px] font-bold mr-1">{selectedPost.date} —</span>
                  {selectedPost.metaDesc}
                </p>
              </div>
            </div>

            {/* XML Schema structured schema generator */}
            <div className="bg-slate-950 text-slate-100 rounded-xl border border-slate-850 p-5 shadow-xs">
              <div className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-wider mb-4 border-b border-slate-850 pb-2">
                <span className="flex items-center gap-2 text-indigo-400">
                  <Code className="w-4 h-4 shrink-0" />
                  JSON-LD Structured Schema
                </span>
                <button
                  onClick={() => handleCopy(liveJSONLDSchema, 'schema')}
                  className="p-1 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded transition-colors text-[10px] flex items-center gap-1 font-mono"
                >
                  {copiedText === 'schema' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              
              <p className="text-[10px] text-slate-400 leading-normal mb-3 font-mono">
                Google searches parse this structured markup to grant search result page "Rich Snippets" or book badges. Drop this script immediately in your page's <code className="text-indigo-300 font-extrabold">&lt;head&gt;</code>.
              </p>
              
              <pre className="p-3 bg-slate-900 rounded font-mono text-[10px] text-slate-300 overflow-x-auto max-h-48 leading-relaxed whitespace-pre font-light">
                {liveJSONLDSchema}
              </pre>
            </div>

          </div>

        </div>
      ) : (
        <div id="blog-directory-dashboard" className="space-y-12">
          
          {/* Main filters and static post card catalog */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-2xl font-serif font-bold text-slate-900 leading-snug">
                  Curated Self-Publishing Bible Articles
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Read authority content written by layout artists, covers experts, and keyword strategists.
                </p>
              </div>

              {/* Categorization controls */}
              <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-mono font-bold">
                {(['All', 'Formatting', 'Design', 'Marketing'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`py-1 px-3 rounded-md transition-colors ${activeCategory === cat ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Static Card Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {filteredPosts.map(post => (
                <div 
                  key={post.slug}
                  onClick={() => setSelectedPost(post)}
                  className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md hover:border-indigo-500/40 transition-all cursor-pointer group active:scale-[0.99]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-xs bg-indigo-50 border border-indigo-100/50 text-indigo-700 font-black px-2 py-0.5 rounded-full uppercase">
                        {post.category}
                      </span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> {post.readingTime}
                      </span>
                    </div>

                    <h4 className="text-xl font-serif font-bold text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                      {post.title}
                    </h4>

                    <p className="text-xs text-slate-500 leading-relaxed max-w-full">
                      {post.summary}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-mono font-bold text-indigo-600">
                    <span>Read Article</span>
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DUAL WORKSPACE SECTION: SEO Rich Interactive Simulator + Article Optimizer */}
          <div className="grid md:grid-cols-2 gap-8 items-start pt-10 border-t border-slate-200">
            
            {/* PANEL 1: Google SERP & Meta Tag Realtime Simulator */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-2">
                <div className="bg-blue-50 text-blue-600 p-2 rounded-lg border border-blue-100">
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">Real-Time Search Simulator</span>
                  <h4 className="font-serif font-bold text-lg text-slate-900 leading-tight">Google SERP &amp; Social Meta Studio</h4>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-normal">
                Optimize and prototype how your book page, promotional blog, or web article will render in search engines and social feeds. Perfect headings drive maximum buyer clicks!
              </p>

              {/* Form entries */}
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold">SEO META TITLE TAG (Recommended: 40-60 chars)</label>
                  <input
                    type="text"
                    value={simTitle}
                    onChange={(e) => setSimTitle(e.target.value)}
                    placeholder="Enter Meta Title..."
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                    <span>{simTitle.length} characters</span>
                    <span className={simTitle.length >= 40 && simTitle.length <= 60 ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                      {simTitle.length >= 40 && simTitle.length <= 60 ? 'Optimal length' : 'Too short or too long'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold">SEO META DESCRIPTION TAG (Recommended: 120-160 chars)</label>
                  <textarea
                    value={simDesc}
                    onChange={(e) => setSimDesc(e.target.value)}
                    rows={2}
                    placeholder="Enter Meta Description..."
                    className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 focus:outline-none focus:border-indigo-500"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                    <span>{simDesc.length} characters</span>
                    <span className={simDesc.length >= 110 && simDesc.length <= 160 ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                      {simDesc.length >= 110 && simDesc.length <= 160 ? 'Optimal snippet length' : 'Recommendation: 120-160 chars'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-bold">URL SLUG (PERMALINK)</label>
                  <div className="flex items-center bg-slate-100 rounded border border-slate-200 px-2.5">
                    <span className="text-slate-400 text-[10.5px]">forge.com/blog/</span>
                    <input
                      type="text"
                      value={simSlug}
                      onChange={(e) => setSimSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      className="bg-transparent border-none p-1.5 pl-0.5 focus:outline-none text-slate-700 w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Live Visual PREVIEW tabs */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <span className="text-[10px] font-mono text-slate-400 block uppercase font-bold tracking-wider">
                  Live Simulated Feed Renderers
                </span>

                {/* 1. Google Render Mockup */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-3xs text-xs font-sans">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-mono mb-1">
                    <Globe className="w-3 h-3" />
                    <span>publishingforge.com &rsaquo; blog &rsaquo; {simSlug || 'post'}</span>
                  </div>
                  <h5 className="text-base text-blue-800 font-medium hover:underline cursor-pointer leading-tight mb-1">
                    {simTitle || 'Draft SEO Title'}
                  </h5>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    <span className="text-slate-400 font-mono text-[10px] mr-1 font-bold">May 28, 2026 —</span>
                    {simDesc || 'Draft search snippet description to show in Google indexing systems...'}
                  </p>
                </div>

                {/* 2. Simplified Mobile Cards/Social Tweet block */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 shadow-3xs text-xs font-sans flex items-start gap-3">
                  <div className="bg-indigo-600 text-white p-2 rounded-md font-serif text-sm font-black shrink-0">
                    PF
                  </div>
                  <div className="space-y-1 flex-1 overflow-hidden">
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="font-bold text-slate-800">PublishingForge</span>
                      <span className="text-slate-400">@publishingforge · Just now</span>
                    </div>
                    <p className="text-slate-700 text-xs leading-normal">
                      📢 New expert publishing guidelines are live! Design print-perfect paperbacks. {`/blog/${simSlug}`}
                    </p>
                    
                    {/* Social Expandable Card Box */}
                    <div className="rounded-lg border border-slate-200 overflow-hidden bg-white mt-2">
                      <div className="p-3">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block font-bold">PUBLISHINGFORGE.COM</span>
                        <h6 className="font-bold text-xs text-slate-800 truncate mt-0.5">{simTitle}</h6>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{simDesc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL 2: Blog & Book Description SEO Title/Body Optimizer */}
            <div className="bg-slate-900 text-slate-100 rounded-xl border border-slate-800 p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-950 text-indigo-400 p-2 rounded-lg border border-indigo-800/40">
                    <BarChart2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 block uppercase">Interactive Assessment Studio</span>
                    <h4 className="font-serif font-bold text-lg text-white leading-tight">Article SEO &amp; Readability Sandbox</h4>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-400 text-[10px] font-mono">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>Interactive Rules</span>
                </div>
              </div>

              {/* Fast presets buttons wrapper */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 flex flex-col gap-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase font-black block tracking-wider">Fast Populate Draft Templates</span>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono font-bold">
                  <button
                    onClick={() => loadOptimizerPreset('formatting')}
                    className="p-2 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 rounded text-slate-300 text-left transition-colors"
                  >
                    📝 Layout Trim Draft
                  </button>
                  <button
                    onClick={() => loadOptimizerPreset('marketing')}
                    className="p-2 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900 rounded text-slate-300 text-left transition-colors"
                  >
                    📈 Search Keywords Draft
                  </button>
                </div>
              </div>

              {/* Input spaces */}
              <div className="space-y-4 font-sans text-xs">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">DRAFT ARTICLE TITLE</label>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="e.g. Master KDP Gutter Margins in 5 Easy Steps"
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">DRAFT ARTICLE OR DESCRIPTION CONTENT</label>
                  <textarea
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    rows={5}
                    placeholder="Paste or write your publishing article, blog segment, or Amazon blurb here to study word densities and search ready indicators..."
                    className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
                  />
                </div>

                {/* Submits and controls */}
                <div className="flex gap-2">
                  <button
                    onClick={handleAnalyzeSEO}
                    className="w-1/2 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] transition-all p-2 rounded text-slate-100 font-mono font-bold flex items-center justify-center gap-1.5 text-[11px] border border-slate-750"
                  >
                    <BarChart2 className="w-4 h-4" /> Analyse Writing
                  </button>
                  
                  <button
                    onClick={handleAIBlogImprove}
                    disabled={aiLoading}
                    className="w-1/2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 active:scale-[0.98] transition-all p-2 rounded text-white font-mono font-bold flex items-center justify-center gap-1.5 text-[11px]"
                  >
                    {aiLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Upgrading...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> AI Rewrite (Gemini)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* AI helper feedback */}
              {aiFeedback && (
                <div className="p-3 bg-slate-950 rounded-lg border border-indigo-950/50 text-[11px] text-slate-300 leading-relaxed font-sans">
                  {aiFeedback}
                </div>
              )}

              {/* Dynamic Analysis metric display results */}
              {seoResult && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between border-b border-slate-850 pb-2">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Live Performance Scorecard</span>
                    
                    {/* Visual Badge */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold text-slate-400">SEO Integrity:</span>
                      <span className={`text-sm font-mono font-black px-2 py-0.5 rounded ${
                        seoResult.seoScore >= 80 ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40' :
                        seoResult.seoScore >= 50 ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40' :
                        'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                      }`}>
                        {seoResult.seoScore}/100
                      </span>
                    </div>
                  </div>

                  {/* Word metrics list */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono py-1">
                    <div className="bg-slate-900/60 p-2 rounded">
                      <span className="text-[9px] text-slate-500 uppercase block leading-none">Words</span>
                      <span className="text-sm font-bold text-slate-200 block mt-1">{seoResult.wordCount}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded">
                      <span className="text-[9px] text-slate-500 uppercase block leading-none">Paragraphs</span>
                      <span className="text-sm font-bold text-slate-200 block mt-1">{seoResult.paragraphs}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded">
                      <span className="text-[9px] text-slate-500 uppercase block leading-none">Readability</span>
                      <span className="text-[10px] font-bold text-indigo-400 block mt-1 truncate" title={seoResult.readabilityGrade}>
                        {seoResult.readabilityGrade.split(' ')[0]}
                      </span>
                    </div>
                  </div>

                  {/* Density list */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Self-Publishing Keyword Densities</span>
                    <div className="grid grid-cols-4 gap-1.5 font-mono text-[10px] text-center">
                      {seoResult.keywordDensity.slice(0, 4).map(k => (
                        <div key={k.word} className="bg-slate-900 p-1 rounded border border-slate-850">
                          <span className="text-slate-400 font-bold block truncate">{k.word}</span>
                          <span className="text-slate-500 block text-[9px] mt-0.5">{k.count} times</span>
                          <span className={`block font-bold text-[9px] ${k.score === 'Good' ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {k.rawPercent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Checklist visualizer */}
                  <div className="space-y-2 Pt-2 border-t border-slate-850">
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Optimization To-Do Checklist</span>
                    <div className="space-y-1.5 text-xs">
                      {seoResult.checklist.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-start bg-slate-900/50 p-2 rounded">
                          {item.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className={`font-mono text-[11px] font-bold ${item.passed ? 'text-slate-200Line-through' : 'text-slate-300'}`}>
                              {item.label} {item.passed && '✓'}
                            </p>
                            {!item.passed && (
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{item.tip}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
