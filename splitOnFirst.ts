export default function (string: string, separator: string): string[] {
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
};
