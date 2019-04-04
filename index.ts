export namespace _decodeURIComponent {
    const token = '%[a-f0-9]{2}';
    const singleMatcher = new RegExp(token, "gi");
    const multiMatcher = new RegExp('(' + token + ')+', 'gi');

    function decodeComponents(components: string[], split: number): string | string[] {
        try {
            // Try to decode the entire string first
            return decodeURIComponent(components.join(''));
        } catch (err) {
            // Do nothing
        }

        if (components.length === 1) {
            return components;
        }

        split = split || 1;

        // Split the array in 2 parts
        const left = components.slice(0, split);
        const right = components.slice(split);

        return Array.prototype.concat.call([], decodeComponents(left, 1), decodeComponents(right, 1));
    }

    function decode(input: string): string {
        try {
            return decodeURIComponent(input);
        } catch (err) {
            let tokens = input.match(singleMatcher);

            // TODO
            // @ts-ignore
            for (var i = 1; i < tokens.length; i++) {
                // @ts-ignore
                input = decodeComponents(tokens, i).join('');

                tokens = input.match(singleMatcher);
            }

            return input;
        }
    }

    function customDecodeURIComponent(input: string): string {
        // Keep track of all the replacements and prefill the map with the `BOM`
        const replaceMap: { [key: string]: string } = {
            "%FE%FF": "\uFFFD\uFFFD",
            "%FF%FE": "\uFFFD\uFFFD"
        };

        let match = multiMatcher.exec(input);
        while (match) {
            try {
                // Decode as big chunks as possible
                replaceMap[match[0]] = decodeURIComponent(match[0]);
            } catch (err) {
                const result = decode(match[0]);

                if (result !== match[0]) {
                    replaceMap[match[0]] = result;
                }
            }

            match = multiMatcher.exec(input);
        }

        // Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
        replaceMap["%C2"] = "\uFFFD";

        Object.keys(replaceMap).forEach((key: string) => {
            // Replace all decoded components
            input = input.replace(new RegExp(key, "g"), replaceMap[key]);
        });

        return input;
    }

    /**
     * A better [decodeURIComponent](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/decodeURIComponent)
     *
     * ### Why?
     *
     * - Decodes `+` to a space.
     * - Converts the [BOM](https://en.wikipedia.org/wiki/Byte_order_mark) to a [replacement character](https://en.wikipedia.org/wiki/Specials_(Unicode_block)#Replacement_character) `�`.
     * - Does not throw with invalid encoded input.
     * - Decodes as much of the string as possible.
     */
    export function decodeComponent(encodedURI: string) {
        try {
            encodedURI = encodedURI.replace(/\+/g, " ");

            // Try the built in decoder first
            return decodeURIComponent(encodedURI);
        } catch (err) {
            // Fallback to a more advanced decoder
            return customDecodeURIComponent(encodedURI);
        }
    }
}

const decodeComponent = _decodeURIComponent.decodeComponent;

type ArrayEncoder = (key: string) => (result: [], value: string, index: number) => string[];

function encoderForArrayFormat(options: StringifyOptions): ArrayEncoder {
    switch (options.arrayFormat) {
        case "index":
            return (key: string) => (result: [], value: string): string[] => {
                const index = result.length;
                if (value === undefined) {
                    return result;
                }

                if (value === null) {
                    return [...result, [encode(key, options), '[', index, ']'].join('')];
                }

                return [
                    ...result,
                    [encode(key, options), '[', encode(String(index), options), ']=', encode(value, options)].join('')
                ];
            };

        case "bracket":
            return (key: string) => (result: [], value: string): string[] => {
                if (value === undefined) {
                    return result;
                }

                if (value === null) {
                    return [...result, [encode(key, options), '[]'].join('')];
                }

                return [...result, [encode(key, options), '[]=', encode(value, options)].join('')];
            };

        case "comma":
            return (key: string) => (result: [], value: string, index: number): string[] => {
                if (!value) {
                    return result;
                }

                if (index === 0) {
                    return [[encode(key, options), '=', encode(value, options)].join('')];
                }

                return [[result, encode(value, options)].join(',')];
            };

        default:
            return (key: string) => (result: [], value: string): string[] => {
                if (value === undefined) {
                    return result;
                }

                if (value === null) {
                    return [...result, encode(key, options)];
                }

                return [...result, [encode(key, options), '=', encode(value, options)].join('')];
            };
    }
}

function parserForArrayFormat(options: ParseOptions) {
    let result;

    switch (options.arrayFormat) {
        case 'index':
            return (key, value, accumulator) => {
                result = /\[(\d*)\]$/.exec(key);

                key = key.replace(/\[\d*\]$/, '');

                if (!result) {
                    accumulator[key] = value;
                    return;
                }

                if (accumulator[key] === undefined) {
                    accumulator[key] = {};
                }

                accumulator[key][result[1]] = value;
            };

        case 'bracket':
            return (key, value, accumulator) => {
                result = /(\[\])$/.exec(key);
                key = key.replace(/\[\]$/, '');

                if (!result) {
                    accumulator[key] = value;
                    return;
                }

                if (accumulator[key] === undefined) {
                    accumulator[key] = [value];
                    return;
                }

                accumulator[key] = [].concat(accumulator[key], value);
            };

        case 'comma':
            return (key, value, accumulator) => {
                const isArray = typeof value === 'string' && value.split('').indexOf(',') > -1;
                const newValue = isArray ? value.split(',') : value;
                accumulator[key] = newValue;
            };

        default:
            return (key, value, accumulator) => {
                if (accumulator[key] === undefined) {
                    accumulator[key] = value;
                    return;
                }

                accumulator[key] = [].concat(accumulator[key], value);
            };
    }
}

function encode(value: string, options: StringifyOptions) {
    if (options.encode) {
        return options.strict ? strictUriEncode(value) : encodeURIComponent(value);
    }

    return value;
}

function decode(value, options) {
    if (options.decode) {
        return decodeComponent(value);
    }

    return value;
}

function keysSorter(input) {
    if (Array.isArray(input)) {
        return input.sort();
    }

    if (typeof input === "object") {
        return keysSorter(Object.keys(input))
            .sort((a, b) => Number(a) - Number(b))
            .map(key => input[key]);
    }

    return input;
}

/**
 * Extract a query string from a URL that can be passed into `.parse()`.
 */
export function extract(input: string): string {
    const queryStart = input.indexOf('?');

    if (queryStart === -1) {
        return "";
    }

    return input.slice(queryStart + 1);
}

/**
 * Parse a query string into an object. Leading `?` or `#` are ignored, so you can pass `location.search` or `location.hash` directly.
 *
 * The returned object is created with [`Object.create(null)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create) and thus does not have a `prototype`.
 *
 */
export function parse(input: string, options?: ParseOptions): ParsedQuery {
    options = {...{
        decode: true,
        arrayFormat: "none"
    }, ...options};

    const formatter = parserForArrayFormat(options);

    // Create an object with no prototype
    const ret = Object.create(null);

    input = input.trim().replace(/^[?#&]/, '');

    if (!input) {
        return ret;
    }

    for (const param of input.split('&')) {
        let [key, value] = splitOnFirst(param.replace(/\+/g, ' '), '=');

        // Missing `=` should be `null`:
        // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
        value = value === undefined ? null : decode(value, options);

        formatter(decode(key, options), value, ret);
    }

    return Object.keys(ret).sort().reduce((result, key) => {
        const value = ret[key];
        if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
            // Sort object keys, not values
            result[key] = keysSorter(value);
        } else {
            result[key] = value;
        }

        return result;
    }, Object.create(null));
}

/**
 * Stringify an object into a query string and sorting the keys.
 */
export function stringify(
    object: { [key: string]: any },
    options?: StringifyOptions
): string {
    if (!object) {
        return '';
    }

    options = {...{
        encode: true,
        strict: true,
        arrayFormat: "none"
    }, ...options};

    const formatter = encoderForArrayFormat(options);
    const keys = Object.keys(object);

    if (options.sort !== false) {
        keys.sort(options.sort);
    }

    return keys.map(key => {
        const value = object[key];

        if (value === undefined) {
            return "";
        }

        if (value === null) {
            return encode(key, options);
        }

        if (Array.isArray(value)) {
            return value
                .reduce(formatter(key), [])
                .join("&");
        }

        return encode(key, options) + "=" + encode(value, options);
    }).filter(x => x.length > 0).join("&");
}

/**
 * Extract the URL and the query string as an object.
 */
export function parseUrl(url: string, options?: ParseOptions): ParsedUrl {
    const hashStart = url.indexOf('#');
    if (hashStart !== -1) {
        url = url.slice(0, hashStart);
    }

    return {
        url: url.split('?')[0] || '',
        query: parse(extract(url), options)
    };
}

/**
 * A stricter URI encode adhering to RFC [3986](http://tools.ietf.org/html/rfc3986)
 */
export function strictUriEncode(str: string): string {
    return encodeURIComponent(str)
        .replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * Split a string on the first occurrence of a given separator
 *
 * This is similar to [`String#split()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split), but that one splits on all the occurrences, not just the first one.
 */
export function splitOnFirst(string: string, separator: string): string[] {
    if (separator === "") {
        return [string];
    }

    const separatorIndex = string.indexOf(separator);

    if (separatorIndex === -1) {
        return [string];
    }

    return [
        string.slice(0, separatorIndex),
        string.slice(separatorIndex + separator.length)
    ];
}

export interface ParseOptions {
    /**
     * Decode the keys and values. URI components are decoded with [`decode-uri-component`](https://github.com/SamVerschueren/decode-uri-component).
     *
     * @default true
     */
    readonly decode?: boolean;

    /**
     * @default 'none'
     *
     * - `bracket`: Parse arrays with bracket representation:
     *
     *
     *    queryString.parse('foo[]=1&foo[]=2&foo[]=3', {arrayFormat: 'bracket'});
     *    //=> foo: [1, 2, 3]
     *
     * - `index`: Parse arrays with index representation:
     *
     *
     *    queryString.parse('foo[0]=1&foo[1]=2&foo[3]=3', {arrayFormat: 'index'});
     *    //=> foo: [1, 2, 3]
     *
     * - `comma`: Parse arrays with elements separated by comma:
     *
     *
     *    queryString.parse('foo=1,2,3', {arrayFormat: 'comma'});
     *    //=> foo: [1, 2, 3]
     *
     * - `none`: Parse arrays with elements using duplicate keys:
     *
     *
     *    queryString.parse('foo=1&foo=2&foo=3');
     *    //=> foo: [1, 2, 3]
     */
    readonly arrayFormat?: 'bracket' | 'index' | 'comma' | 'none';
}

export interface ParsedQuery {
    readonly [key: string]: string | string[] | null | undefined;
}

export interface ParsedUrl {
    readonly url: string;
    readonly query: ParsedQuery;
}

export interface StringifyOptions {
    /**
     * Strictly encode URI components with [`strict-uri-encode`](https://github.com/kevva/strict-uri-encode). It uses [`encodeURIComponent`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) if set to `false`. You probably [don't care](https://github.com/sindresorhus/query-string/issues/42) about this option.
     *
     * @default true
     */
    readonly strict?: boolean;

    /**
     * [URL encode](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent) the keys and values.
     *
     * @default true
     */
    readonly encode?: boolean;

    /**
     * @default 'none'
     *
     * - `bracket`: Serialize arrays using bracket representation:
     *
     *
     *    queryString.stringify({foo: [1, 2, 3]}, {arrayFormat: 'bracket'});
     *    //=> 'foo[]=1&foo[]=2&foo[]=3'
     *
     * - `index`: Serialize arrays using index representation:
     *
     *
     *    queryString.stringify({foo: [1, 2, 3]}, {arrayFormat: 'index'});
     *    //=> 'foo[0]=1&foo[1]=2&foo[3]=3'
     *
     * - `comma`: Serialize arrays by separating elements with comma:
     *
     *
     *    queryString.stringify({foo: [1, 2, 3]}, {arrayFormat: 'comma'});
     *    //=> 'foo=1,2,3'
     *
     * - `none`: Serialize arrays by using duplicate keys:
     *
     *
     *    queryString.stringify({foo: [1, 2, 3]});
     *    //=> 'foo=1&foo=2&foo=3'
     */
    readonly arrayFormat?: 'bracket' | 'index' | 'comma' | 'none';

    /**
     * Supports both `Function` as a custom sorting function or `false` to disable sorting.
     *
     * If omitted, keys are sorted using `Array#sort`, which means, converting them to strings and comparing strings in Unicode code point order.
     *
     * @example
     *
     * const order = ['c', 'a', 'b'];
     * queryString.stringify({a: 1, b: 2, c: 3}, {
     * 	sort: (itemLeft, itemRight) => order.indexOf(itemLeft) - order.indexOf(itemRight)
     * });
     * // => 'c=3&a=1&b=2'
     *
     * queryString.stringify({b: 1, c: 2, a: 3}, {sort: false});
     * // => 'b=1&c=2&a=3'
     */
    readonly sort?: ((itemLeft: string, itemRight: string) => number) | false;
}



