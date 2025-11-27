export interface TemplateConfig {
  name: string;
  languageCode: string;
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: TemplateParameter[];
  sub_type?: string;
  index?: string;
}

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'video' | 'document';
  text?: string;
  currency?: { fallback_value: string; code: string; amount_1000: number };
  date_time?: { fallback_value: string };
  image?: { link: string };
  video?: { link: string };
  document?: { link: string; filename: string };
}

function getWhatsAppCredentials(): { token: string; phoneNumberId: string } | null {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;
  
  if (!token || !phoneNumberId) {
    return null;
  }
  
  return { token, phoneNumberId };
}

export async function sendTemplateMessage(
  to: string,
  template: TemplateConfig
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const credentials = getWhatsAppCredentials();
  
  if (!credentials) {
    console.error('[TemplateMessage] WhatsApp credentials not configured');
    return { success: false, error: 'WhatsApp credentials not configured' };
  }

  const messagePayload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: to,
    type: 'template',
    template: {
      name: template.name,
      language: {
        code: template.languageCode
      }
    }
  };

  if (template.components && template.components.length > 0) {
    (messagePayload.template as Record<string, unknown>).components = template.components;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${credentials.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const data = await response.json();
    
    if (response.ok && data.messages?.[0]?.id) {
      console.log(`[TemplateMessage] Successfully sent template "${template.name}" to ${to}`);
      return { success: true, messageId: data.messages[0].id };
    } else {
      const errorMsg = data.error?.message || 'Failed to send template message';
      console.error(`[TemplateMessage] Failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  } catch (error) {
    console.error('[TemplateMessage] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function sendHelloWorldTemplate(to: string): Promise<{ success: boolean; error?: string; messageId?: string }> {
  return sendTemplateMessage(to, {
    name: 'hello_world',
    languageCode: 'en_US'
  });
}

export async function getAvailableTemplates(): Promise<{ templates: unknown[]; error?: string }> {
  const credentials = getWhatsAppCredentials();
  
  if (!credentials) {
    return { templates: [], error: 'WhatsApp credentials not configured' };
  }

  try {
    const phoneInfoResponse = await fetch(
      `https://graph.facebook.com/v18.0/${credentials.phoneNumberId}?fields=account_mode`,
      {
        headers: {
          'Authorization': `Bearer ${credentials.token}`,
        },
      }
    );
    
    const phoneInfo = await phoneInfoResponse.json();
    console.log('[TemplateMessage] Phone info:', phoneInfo);

    return { templates: [], error: 'Template listing requires WABA ID' };
  } catch (error) {
    return { templates: [], error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
