/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';

export type CopilotActionType =
  // 1. Campaigns
  | 'create_campaign'
  | 'update_campaign'
  // 2. AI ChatBots
  | 'create_ai_chatbot'
  | 'update_ai_chatbot'
  // 3. Automation Flows
  | 'create_flow'
  | 'update_flow'
  | 'extend_flow'
  // 4. Social Posts
  | 'create_social_post'
  | 'update_social_post'
  // 5. Ad Campaigns
  | 'create_meta_campaign'
  | 'update_meta_campaign'
  | 'publish_meta_campaign'
  // 6. Quick Replies
  | 'create_quick_reply'
  | 'update_quick_reply'
  // 7. Message Templates
  | 'create_message_template'
  | 'update_message_template'
  // 8. WhatsApp Flows
  | 'create_whatsapp_flow'
  | 'update_whatsapp_flow';

export interface CopilotActionData {
  type: CopilotActionType;
  title?: string;
  data: any;
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number';
  placeholder?: string;
  defaultValue?: string | number;
  options?: string[];
  required?: boolean;
}

export interface CopilotFormData {
  module?: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export interface AttachedFile {
  name: string;
  size: string;
  type: string;
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
  action?: CopilotActionData | null;
  form?: CopilotFormData | null;
  formSubmitted?: boolean;
  executed?: boolean;
  executedMessage?: string;
  executedRedirectUrl?: string;
  attachedFiles?: AttachedFile[];
}

export interface FlowPromptTemplate {
  id: string;
  label: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
  description: string;
}

export interface CopilotCapability {
  id: string;
  moduleKey: string;
  categoryName: string;
  title: string;
  prompt: string;
  icon: any;
  colorScheme: {
    iconColor: string;
    bgColor: string;
    borderColor: string;
    tagBg: string;
    tagText: string;
  };
}
