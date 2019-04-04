import {_decodeURIComponent, extract, splitOnFirst, strictUriEncode} from "../index";
import {stringArraysEqual, stringsEqual, stringsNotEqual} from "./helpers";
import decodeComponent = _decodeURIComponent.decodeComponent;

const decodeComponentTests: {[key: string]: string} = {
    "test": "test",
    "a+b": "a b",
    "a+b+c+d": "a b c d",
    "=a": "=a",
    "%": "%",
    "%25": "%",
    "%%25%%": "%%%%",
    "st%C3%A5le": "ståle",
    "st%C3%A5le%": "ståle%",
    "%st%C3%A5le%": "%ståle%",
    "%%7Bst%C3%A5le%7D%": "%{ståle}%",
    "%ab%C3%A5le%": "%abåle%",
    "%C3%A5%able%": "å%able%",
    "%7B%ab%7C%de%7D": "{%ab|%de}",
    "%7B%ab%%7C%de%%7D": "{%ab%|%de%}",
    "%7 B%ab%%7C%de%%7 D": "%7 B%ab%|%de%%7 D",
    "%ab": "%ab",
    "%ab%ab%ab": "%ab%ab%ab",
    "%61+%4d%4D": "a MM",
    "\uFEFFtest": "\uFEFFtest",
    "\uFEFF": "\uFEFF",
    "%EF%BB%BFtest": "\uFEFFtest",
    "%EF%BB%BF": "\uFEFF",
    "%FE%FF": "\uFFFD\uFFFD",
    "%FF%FE": "\uFFFD\uFFFD",
    "†": "†",
    "%C2": "\uFFFD",
    "%C2x": "\uFFFDx",
    "%C2%B5": "µ",
    "%C2%B5%": "µ%",
    "%%C2%B5%": "%µ%"
};

Object.keys(decodeComponentTests).forEach(input => {
    stringsEqual(decodeComponent(input), decodeComponentTests[input])
});

stringArraysEqual(splitOnFirst("a-b-c", "-"), ["a", "b-c"]);
stringArraysEqual(splitOnFirst("key:value:value2", ":"), ["key", "value:value2"]);
stringArraysEqual(splitOnFirst("a---b---c", "---"), ["a", "b---c"]);
stringArraysEqual(splitOnFirst("a-b-c", "+"), ["a-b-c"]);
stringArraysEqual(splitOnFirst("abc", ""), ["abc"]);


stringsEqual(strictUriEncode('unicorn!foobar'), 'unicorn%21foobar');
stringsEqual(strictUriEncode('unicorn\'foobar'), 'unicorn%27foobar');
stringsEqual(strictUriEncode('unicorn*foobar'), 'unicorn%2Afoobar');
stringsNotEqual(strictUriEncode('unicorn*foobar'), encodeURIComponent('unicorn*foobar'));

stringsEqual(extract("https://foo.bar/?abc=def&hij=klm"), "abc=def&hij=klm");
stringsEqual(extract("https://foo.bar/?"), "");
stringsEqual(extract("https://foo.bar/?regex=ab?c"), "regex=ab?c");
stringsEqual(extract("https://foo.bar"), "");
stringsEqual(extract(""), "");
