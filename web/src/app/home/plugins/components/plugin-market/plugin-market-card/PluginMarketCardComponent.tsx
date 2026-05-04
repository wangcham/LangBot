import { PluginMarketCardVO } from './PluginMarketCardVO';
import { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PluginComponentList from '../PluginComponentList';
import { Badge } from '@/components/ui/badge';
import { Info, Package } from 'lucide-react';
import {
Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function PluginMarketCardComponent({
  cardVO,
  onInstall,
  tagNames = {},
}: {
  cardVO: PluginMarketCardVO;
  onInstall?: (author: string, pluginName: string) => void;
  tagNames?: Record<string, string>;
}) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [visibleTags, setVisibleTags] = useState(2);
  const [iconFailed, setIconFailed] = useState(!cardVO.iconURL);

  const pluginDetailUrl = `https://space.langbot.app/market/${cardVO.author}/${cardVO.pluginName}`;

  const isDeprecated = (() => {
    if (!cardVO.components) return false;
    const keys = Object.keys(cardVO.components);
    return keys.length > 0 && keys.every((k) => k === 'KnowledgeRetriever');
  })();

  const showTypeBadge = cardVO.type;

  useEffect(() => {
    setIconFailed(!cardVO.iconURL);
  }, [cardVO.iconURL]);

  useEffect(() => {
    const tags = cardVO.tags;
    if (!bottomRef.current || !tags || tags.length === 0) return;

    const measure = () => {
      const container = bottomRef.current;
      if (!container) return;
      const width = container.offsetWidth;
      const availableForTags = width - 140 - 80;
      if (availableForTags <= 0) {
        setVisibleTags(0);
        return;
      }
      const tagWidth = 80;
      const plusBadgeWidth = 40;
      const maxTags = Math.max(0, Math.floor((availableForTags - plusBadgeWidth) / tagWidth));
      if (maxTags >= tags.length) {
        setVisibleTags(tags.length);
      } else {
        setVisibleTags(Math.max(1, maxTags));
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [cardVO.tags]);

  const remainingTags = cardVO.tags ? cardVO.tags.length - visibleTags : 0;

  return (
    <a
      href={pluginDetailUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="w-[100%] h-[10rem] bg-white rounded-[10px] shadow-[0px_0px_4px_0_rgba(0,0,0,0.2)] p-3 sm:p-[1rem] cursor-pointer hover:shadow-[0px_2px_8px_0_rgba(0,0,0,0.15)] transition-shadow duration-200 dark:bg-[#1f1f22] dark:shadow-[0px_0px_4px_0_rgba(255,255,255,0.1)] dark:hover:shadow-[0px_2px_8px_0_rgba(255,255,255,0.15)] block"
    >
      <div className="w-full h-full flex flex-col justify-between">
        <div className="flex flex-row items-start justify-start gap-2 sm:gap-[1.2rem] min-h-0 flex-1 overflow-hidden">
          {iconFailed ? (
            <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-[8%] border bg-muted text-muted-foreground flex items-center justify-center">
              <Package className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
          ) : (
            <img
              src={cardVO.iconURL}
              alt="plugin icon"
              className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 rounded-[8%] object-cover"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              onError={() => setIconFailed(true)}
            />
          )}

          <div className="flex-1 flex flex-col items-start justify-start gap-[0.4rem] sm:gap-[0.6rem] min-w-0 overflow-hidden">
            <div className="flex flex-col items-start justify-start w-full min-w-0">
              <div className="text-[0.65rem] sm:text-[0.7rem] text-[#666] dark:text-[#999] truncate w-full">{cardVO.pluginId}</div>
              <div className="flex items-center gap-1.5 w-full min-w-0">
                <div className="text-base sm:text-[1.2rem] text-black dark:text-[#f0f0f0] truncate">{cardVO.label}</div>
                {isDeprecated && (
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild onClick={(e) => e.preventDefault()}>
                        <Badge
                          variant="outline"
                          className="text-[0.6rem] px-1.5 py-0 h-4 flex-shrink-0 border-red-400 text-red-500 dark:border-red-500 dark:text-red-400 gap-0.5 cursor-help"
                        >
                          {t('market.deprecated')}
                          <Info className="w-2.5 h-2.5" />
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] text-xs">
                        {t('market.deprecatedTooltip')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {showTypeBadge && (
                  <Badge
                    variant="outline"
                    className={`text-[0.6rem] px-1.5 py-0 h-4 flex-shrink-0 gap-0.5 ${
                      cardVO.type === 'mcp'
                        ? 'border-sky-500 text-sky-600 dark:border-sky-400 dark:text-sky-300'
                        : cardVO.type === 'skill'
                        ? 'border-emerald-500 text-emerald-600 dark:border-emerald-400 dark:text-emerald-300'
                        : 'border-violet-500 text-violet-600 dark:border-violet-400 dark:text-violet-300'
                    }`}
                  >
                    {cardVO.type === 'mcp'
                      ? 'MCP'
                      : cardVO.type === 'skill'
                      ? t('common.skill')
                      : t('market.typePlugin')}
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-[0.7rem] sm:text-[0.8rem] text-[#666] dark:text-[#999] line-clamp-2 overflow-hidden">
              {cardVO.description}
            </div>
          </div>

          <div className="flex flex-row items-start justify-center gap-[0.4rem] flex-shrink-0">
            {cardVO.githubURL && (
<svg
                className="w-5 h-5 sm:w-[1.4rem] sm:h-[1.4rem] text-black cursor-pointer hover:text-gray-600 dark:text-[#f0f0f0] dark:hover:text-[#c0c0c0] flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(cardVO.githubURL, '_blank');
                }}
              />
            )}
          </div>
        </div>

        <div ref={bottomRef} className="w-full flex flex-row items-center justify-between gap-2 px-0 sm:px-[0.4rem] flex-shrink-0 overflow-hidden">
          <div className="flex flex-row items-center justify-start gap-2 min-w-0 overflow-hidden">
            <div className="flex flex-row items-center gap-[0.3rem] sm:gap-[0.4rem] flex-shrink-0">
              <Download className="w-4 h-4 sm:w-[1.2rem] sm:h-[1.2rem] text-[#2563eb] dark:text-[#5b8def] flex-shrink-0" />
              <div className="text-xs sm:text-sm text-[#2563eb] dark:text-[#5b8def] font-medium whitespace-nowrap">
                {cardVO.installCount?.toLocaleString() ?? '0'}
              </div>
            </div>

            {cardVO.tags && cardVO.tags.length > 0 && visibleTags > 0 && (
              <div className="flex flex-row items-center gap-1.5 overflow-hidden flex-shrink min-w-0">
                {cardVO.tags.slice(0, visibleTags).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[0.65rem] sm:text-[0.7rem] px-2 py-0.5 h-5 flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
                  >
<svg
                      className="w-2.5 h-2.5 flex-shrink-0"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                    <span className="truncate max-w-[5rem]">{tagNames[tag] || tag}</span>
                  </Badge>
                ))}
                {remainingTags > 0 && (
                  <Badge
                    variant="outline"
                    className="text-[0.65rem] sm:text-[0.7rem] px-1.5 py-0.5 h-5 flex items-center flex-shrink-0 whitespace-nowrap"
                  >
                    +{remainingTags}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {cardVO.components && Object.keys(cardVO.components).length > 0 && (
            <div className="flex flex-row items-center gap-1 flex-shrink-0">
              <PluginComponentList
                components={cardVO.components}
                showComponentName={false}
                showTitle={false}
                useBadge={true}
                t={t}
                responsive={false}
              />
            </div>
          )}
        </div>
      </div>
    </a>
  );
}