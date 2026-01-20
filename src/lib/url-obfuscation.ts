/**
 * URL Obfuscation Library
 * 
 * Provides utility functions to hide destination URLs (OnlyFans/Fansly) 
 * from social media crawlers using Base64 encoding with a custom prefix.
 */

/**
 * Prefix marker used to identify obfuscated destination strings.
 */
const OBFUSCATION_PREFIX = 'TH_';

/**
 * Represents an obfuscated link state.
 * Used for communicating with Server Components.
 */
export interface ObfuscatedLink {
    /** The Base64 encoded URL with prefix */
    encoded: string;
    /** Whether the current request is identified as a crawler */
    isCrawler: boolean;
}

/**
 * Encodes a destination URL into a Base64 string with a custom prefix.
 * 
 * @IMPORTANT This function uses Buffer and should only be called on the Server/Edge.
 * 
 * @param url - The raw destination URL to encode
 * @returns The obfuscated URL string or an empty string if input is invalid
 */
export function encodeDestination(url: string | null | undefined): string {
    if (!url) return '';

    try {
        const encoded = Buffer.from(url).toString('base64');
        return `${OBFUSCATION_PREFIX}${encoded}`;
    } catch (error) {
        console.error('Error encoding destination:', error);
        return '';
    }
}

/**
 * Decodes an obfuscated destination string back to its raw URL.
 * 
 * @SAFE This function is safe for Client-side execution as it uses standard browser APIs.
 * 
 * @param encoded - The obfuscated URL string (must start with TH_)
 * @returns The raw destination URL or an empty string if decoding fails
 */
export function decodeDestination(encoded: string | null | undefined): string {
    if (!encoded || !isEncodedDestination(encoded)) return '';

    try {
        // Strip prefix
        const base64 = encoded.slice(OBFUSCATION_PREFIX.length);
        // Use browser-safe atob
        return atob(base64);
    } catch (error) {
        console.error('Error decoding destination:', error);
        return '';
    }
}

/**
 * Validation function to check if a string is a TransHere obfuscated destination.
 * 
 * @param value - The string to check
 * @returns True if the string starts with the TH_ prefix
 */
export function isEncodedDestination(value: string | null | undefined): boolean {
    if (typeof value !== 'string') return false;
    return value.startsWith(OBFUSCATION_PREFIX);
}
