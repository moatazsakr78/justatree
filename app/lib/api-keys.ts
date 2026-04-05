import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Get encryption key from environment variable
function getEncryptionKey(): Buffer {
  const key = process.env.API_ENCRYPTION_KEY;
  if (key) {
    return Buffer.from(key.padEnd(32, '0').slice(0, 32));
  }
  // Default key (should be set in production!)
  return Buffer.from('justatree-api-encryption-key'.slice(0, 32));
}

// Decrypt a value using AES-256-GCM
function decrypt(encrypted: string, ivHex: string, authTagHex: string): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Get decrypted API key from database
export async function getApiKey(keyName: string): Promise<string | null> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .schema('justatree')
      .from('api_settings')
      .select('encrypted_value, iv, auth_tag, is_configured')
      .eq('setting_key', keyName)
      .single();

    if (error || !data || !data.is_configured) {
      return null;
    }

    // Decrypt and return the value
    return decrypt(data.encrypted_value, data.iv, data.auth_tag);
  } catch (error) {
    console.error(`Failed to get API key '${keyName}':`, error);
    return null;
  }
}

// Check if API key is configured (without decrypting)
export async function isApiKeyConfigured(keyName: string): Promise<boolean> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .schema('justatree')
      .from('api_settings')
      .select('is_configured')
      .eq('setting_key', keyName)
      .single();

    return !error && data?.is_configured === true;
  } catch {
    return false;
  }
}
