/**
 * A stricter URI encode adhering to RFC [3986](http://tools.ietf.org/html/rfc3986)
 */
export default function (str: string): string {
    return encodeURIComponent(str)
        .replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);
}
