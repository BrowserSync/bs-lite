export function template(string, obj) {
    return string.replace(/\{\{(.+?)\}\}/g, function () {
        return obj[arguments[1]] || '';
    });
}