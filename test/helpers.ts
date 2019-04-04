export function stringArraysEqual(strings: string[], strings2: string[]) {
    if (strings.length !== strings2.length) throw new Error("Different length");

    strings.forEach((value, index) => {
        if (value !== strings2[index]) throw new Error(`Not equals: ${value} !== ${strings2[index]}`);
    })
}

export function stringsEqual(str: string, str2: string) {
    if (str !== str2) throw new Error(`${str} not equal ${str2}`);
}

export function stringsNotEqual(str: string, str2: string) {
    if (str === str2) throw new Error(`${str} equal ${str2}`);
}
