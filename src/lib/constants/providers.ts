export const PROVIDERS = [
  'OpenAI', 'Anthropic', 'Google', 'xAI',
  'Alibaba', 'DeepSeek', 'Zhipu AI', 'Moonshot AI',
] as const

export const PROVIDER_IDS: Record<string, string> = {
  'OpenAI':      'OPENAI',
  'Anthropic':   'ANTHROPIC',
  'Google':      'GOOGLE',
  'xAI':         'XAI',
  'Alibaba':     'ALIBABA',
  'DeepSeek':    'DEEPSEEK',
  'Zhipu AI':    'ZHIPU',
  'Moonshot AI': 'MOONSHOT',
}

export const PROVIDER_META: Record<string, { readonly name: string; readonly colorCode: string }> = {
  OPENAI:    { name: 'OpenAI',      colorCode: '#10A37F' },
  ANTHROPIC: { name: 'Anthropic',   colorCode: '#D4A574' },
  GOOGLE:    { name: 'Google',      colorCode: '#4285F4' },
  XAI:       { name: 'xAI',         colorCode: '#1DA1F2' },
  ALIBABA:   { name: 'Alibaba',     colorCode: '#FF6A00' },
  DEEPSEEK:  { name: 'DeepSeek',    colorCode: '#4D6BFE' },
  ZHIPU:     { name: 'Zhipu AI',    colorCode: '#4A90D9' },
  MOONSHOT:  { name: 'Moonshot AI', colorCode: '#6C5CE7' },
}
