import React from 'react';

export interface AdAccount {
  id: number;
  meta_ad_account_id: string;
  account_name: string;
  account_status: string;
  currency: string;
  timezone_name: string;
  spend_cap?: number | null;
  amount_spent?: number;
  total_spend?: number;
  total_conversations?: number;
  campaigns_count?: number;
  is_default: boolean;
  metadata?: {
    business_name?: string;
    [key: string]: any;
  };
}

export interface Campaign {
  id: number;
  meta_campaign_id?: string;
  name: string;
  objective: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DELETED' | 'DRAFT';
  budget_mode: 'CBO' | 'ABO';
  daily_budget?: number;
  created_at: string;
  ad_sets_count?: number;
  total_ads_count?: number;
  metrics?: {
    spend: number;
    conversations: number;
    clicks: number;
    impressions: number;
    cpr: number;
  };
}

export interface AdSet {
  id: number;
  meta_ad_set_id?: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DRAFT';
  destination_type: string;
  whatsapp_phone_number?: string;
  optimization_goal?: string;
  daily_budget?: number;
  start_time?: string;
  end_time?: string;
  targeting_spec?: any;
  placements_spec?: any;
  ads_count?: number;
  campaign?: {
    id: number;
    name: string;
  };
  metrics?: {
    spend: number;
    conversations: number;
    clicks: number;
    cpr: number;
  };
}

export interface Ad {
  id: number;
  meta_ad_id?: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'DRAFT';
  primary_text: string;
  headline: string;
  description?: string;
  cta_type: string;
  media_urls?: string[];
  welcome_message?: string;
  linked_flow_id?: number;
  linked_flow?: {
    id: number;
    name: string;
  };
  ad_set?: {
    id: number;
    name: string;
    campaign?: {
      id: number;
      name: string;
    };
  };
  metrics?: {
    spend: number;
    conversations: number;
    clicks: number;
    impressions: number;
    cpr: number;
  };
}

export interface SummaryKPIs {
  total_spend: number;
  total_reach: number;
  total_impressions: number;
  total_clicks: number;
  total_conversations: number;
  total_leads: number;
  total_purchases: number;
  avg_ctr: number;
  avg_cpc: number;
  avg_cpm: number;
  avg_cpr: number;
  active_campaigns_count: number;
  total_campaigns_count: number;
}

export interface FlowOption {
  id: number;
  name: string;
  status: string;
}

export interface ChannelOption {
  id: number;
  name: string;
  phone_number?: string;
}

// Mini Bar Sparkline
export function MiniBarSparkline({ data, highlightIndex, color = '#0A0A0A' }: { data: number[]; highlightIndex?: number; color?: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2.5px] h-5 sm:h-5.5 shrink-0 py-0.5">
      {data.map((val, idx) => {
        const heightPct = Math.max(20, Math.round((val / max) * 100));
        const isHighlight = highlightIndex !== undefined ? idx === highlightIndex : idx === data.length - 1;
        return (
          <div
            key={idx}
            className="w-[2.5px] sm:w-[3px] rounded-t-[1px] transition-all duration-200"
            style={{
              height: `${heightPct}%`,
              backgroundColor: isHighlight ? color : '#E4E4E7',
            }}
            title={`${val}`}
          />
        );
      })}
    </div>
  );
}

// Mini Area Wave Sparkline
export function MiniAreaSparkline({ data, strokeColor = '#008069', fillColor = 'rgba(0, 128, 105, 0.12)' }: { data: number[]; strokeColor?: string; fillColor?: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 48;
  const height = 18;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1 || 1)) * width;
    const y = height - ((val - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M ${points[0]} L ${points.join(' L ')} L ${width},${height} L 0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible shrink-0">
      <path d={areaD} fill={fillColor} />
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Mini Gauge Arc Component
export function MiniGauge({ percentage }: { percentage: number }) {
  const clamped = Math.min(100, Math.max(0, percentage));
  const radius = 12;
  const strokeWidth = 2.5;
  const cx = 15;
  const cy = 14;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative w-8 h-4 flex items-end justify-center shrink-0">
      <svg width="30" height="16" viewBox="0 0 30 16" className="overflow-visible">
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#E8E8E6"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#008069"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
    </div>
  );
}
