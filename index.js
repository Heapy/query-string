"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var decodeComponent = _decodeURIComponent.decodeComponent;
function encoderForArrayFormat(options) {
    switch (options.arrayFormat) {
        case "index":
            return function (key) { return function (result, value) {
                var index = result.length;
                if (value === undefined) {
                    return result;
                }
                if (value === null) {
                    return result.concat([[encode(key, options), '[', index, ']'].join('')]);
                }
                return result.concat([
                    [encode(key, options), '[', encode(String(index), options), ']=', encode(value, options)].join('')
                ]);
            }; };
        case "bracket":
            return function (key) { return function (result, value) {
                if (value === undefined) {
                    return result;
                }
                if (value === null) {
                    return result.concat([[encode(key, options), '[]'].join('')]);
                }
                return result.concat([[encode(key, options), '[]=', encode(value, options)].join('')]);
            }; };
        case "comma":
            return function (key) { return function (result, value, index) {
                if (!value) {
                    return result;
                }
                if (index === 0) {
                    return [[encode(key, options), '=', encode(value, options)].join('')];
                }
                return [[result, encode(value, options)].join(',')];
            }; };
        default:
            return function (key) { return function (result, value) {
                if (value === undefined) {
                    return result;
                }
                if (value === null) {
                    return result.concat([encode(key, options)]);
                }
                return result.concat([[encode(key, options), '=', encode(value, options)].join('')]);
            }; };
    }
}
function parserForArrayFormat(options) {
    var result;
    switch (options.arrayFormat) {
        case 'index':
            return function (key, value, accumulator) {
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
            return function (key, value, accumulator) {
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
            return function (key, value, accumulator) {
                var isArray = typeof value === 'string' && value.split('').indexOf(',') > -1;
                var newValue = isArray ? value.split(',') : value;
                accumulator[key] = newValue;
            };
        default:
            return function (key, value, accumulator) {
                if (accumulator[key] === undefined) {
                    accumulator[key] = value;
                    return;
                }
                accumulator[key] = [].concat(accumulator[key], value);
            };
    }
}
function encode(value, options) {
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
            .sort(function (a, b) { return Number(a) - Number(b); })
            .map(function (key) { return input[key]; });
    }
    return input;
}
/**
 * Extract a query string from a URL that can be passed into `.parse()`.
 */
function extract(input) {
    var queryStart = input.indexOf('?');
    if (queryStart === -1) {
        return "";
    }
    return input.slice(queryStart + 1);
}
exports.extract = extract;
/**
 * Parse a query string into an object. Leading `?` or `#` are ignored, so you can pass `location.search` or `location.hash` directly.
 *
 * The returned object is created with [`Object.create(null)`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create) and thus does not have a `prototype`.
 *
 */
function parse(input, options) {
    options = __assign({
        decode: true,
        arrayFormat: "none"
    }, options);
    var formatter = parserForArrayFormat(options);
    // Create an object with no prototype
    var ret = Object.create(null);
    input = input.trim().replace(/^[?#&]/, '');
    if (!input) {
        return ret;
    }
    for (var _i = 0, _a = input.split('&'); _i < _a.length; _i++) {
        var param = _a[_i];
        var _b = splitOnFirst(param.replace(/\+/g, ' '), '='), key = _b[0], value = _b[1];
        // Missing `=` should be `null`:
        // http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
        value = value === undefined ? null : decode(value, options);
        formatter(decode(key, options), value, ret);
    }
    return Object.keys(ret).sort().reduce(function (result, key) {
        var value = ret[key];
        if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
            // Sort object keys, not values
            result[key] = keysSorter(value);
        }
        else {
            result[key] = value;
        }
        return result;
    }, Object.create(null));
}
exports.parse = parse;
/**
 * Stringify an object into a query string and sorting the keys.
 */
function stringify(object, options) {
    if (!object) {
        return '';
    }
    options = __assign({
        encode: true,
        strict: true,
        arrayFormat: "none"
    }, options);
    var formatter = encoderForArrayFormat(options);
    var keys = Object.keys(object);
    if (options.sort !== false) {
        keys.sort(options.sort);
    }
    return keys.map(function (key) {
        var value = object[key];
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
    }).filter(function (x) { return x.length > 0; }).join("&");
}
exports.stringify = stringify;
/**
 * Extract the URL and the query string as an object.
 */
function parseUrl(url, options) {
    var hashStart = url.indexOf('#');
    if (hashStart !== -1) {
        url = url.slice(0, hashStart);
    }
    return {
        url: url.split('?')[0] || '',
        query: parse(extract(url), options)
    };
}
exports.parseUrl = parseUrl;
/**
 * A stricter URI encode adhering to RFC [3986](http://tools.ietf.org/html/rfc3986)
 */
function strictUriEncode(str) {
    return encodeURIComponent(str)
        .replace(/[!'()*]/g, function (x) { return "%" + x.charCodeAt(0).toString(16).toUpperCase(); });
}
exports.strictUriEncode = strictUriEncode;
/**
 * Split a string on the first occurrence of a given separator
 *
 * This is similar to [`String#split()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/split), but that one splits on all the occurrences, not just the first one.
 */
function splitOnFirst(string, separator) {
    if (separator === "") {
        return [string];
    }
    var separatorIndex = string.indexOf(separator);
    if (separatorIndex === -1) {
        return [string];
    }
    return [
        string.slice(0, separatorIndex),
        string.slice(separatorIndex + separator.length)
    ];
}
exports.splitOnFirst = splitOnFirst;
var _decodeURIComponent;
(function (_decodeURIComponent) {
    var token = '%[a-f0-9]{2}';
    var singleMatcher = new RegExp(token, "gi");
    var multiMatcher = new RegExp('(' + token + ')+', 'gi');
    function decodeComponents(components, split) {
        try {
            // Try to decode the entire string first
            return decodeURIComponent(components.join(''));
        }
        catch (err) {
            // Do nothing
        }
        if (components.length === 1) {
            return components;
        }
        split = split || 1;
        // Split the array in 2 parts
        var left = components.slice(0, split);
        var right = components.slice(split);
        return Array.prototype.concat.call([], decodeComponents(left, 1), decodeComponents(right, 1));
    }
    function decode(input) {
        try {
            return decodeURIComponent(input);
        }
        catch (err) {
            var tokens = input.match(singleMatcher);
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
    function customDecodeURIComponent(input) {
        // Keep track of all the replacements and prefill the map with the `BOM`
        var replaceMap = {
            "%FE%FF": "\uFFFD\uFFFD",
            "%FF%FE": "\uFFFD\uFFFD"
        };
        var match = multiMatcher.exec(input);
        while (match) {
            try {
                // Decode as big chunks as possible
                replaceMap[match[0]] = decodeURIComponent(match[0]);
            }
            catch (err) {
                var result = decode(match[0]);
                if (result !== match[0]) {
                    replaceMap[match[0]] = result;
                }
            }
            match = multiMatcher.exec(input);
        }
        // Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
        replaceMap["%C2"] = "\uFFFD";
        Object.keys(replaceMap).forEach(function (key) {
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
    function decodeComponent(encodedURI) {
        try {
            encodedURI = encodedURI.replace(/\+/g, " ");
            // Try the built in decoder first
            return decodeURIComponent(encodedURI);
        }
        catch (err) {
            // Fallback to a more advanced decoder
            return customDecodeURIComponent(encodedURI);
        }
    }
    _decodeURIComponent.decodeComponent = decodeComponent;
})(_decodeURIComponent = exports._decodeURIComponent || (exports._decodeURIComponent = {}));
