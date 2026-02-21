export const basePath = '/admin/ai-configs'
export const configUrl = `${basePath}`
export const addConfigUrl = `${basePath}`
export const providerConfigUrl = (providerName: string) => `${basePath}/${encodeURIComponent(providerName)}`